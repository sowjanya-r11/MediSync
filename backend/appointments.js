const { generatePreVisitSummary, generatePostVisitSummary } = require('./llm');
const express = require('express');
const { Pool } = require('pg');
const { verifyToken, requireRole } = require('./middleware');
require('dotenv').config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper: generate all possible slot times between start and end, given duration
function generateSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  let [h, m] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  while (h < endH || (h === endH && m < endM)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += durationMinutes;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
  }
  return slots;
}

// GET available slots for a doctor on a specific date
router.get('/available-slots', async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    if (!doctor_id || !date) {
      return res.status(400).json({ error: 'doctor_id and date are required' });
    }

    const doctorResult = await pool.query('SELECT * FROM doctor_profiles WHERE id = $1', [doctor_id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    const doctor = doctorResult.rows[0];

    // check if doctor is on leave this date
    const leaveCheck = await pool.query(
      'SELECT * FROM doctor_leaves WHERE doctor_id = $1 AND leave_date = $2',
      [doctor_id, date]
    );
    if (leaveCheck.rows.length > 0) {
      return res.json({ available: false, reason: 'Doctor is on leave this date', slots: [] });
    }

    const allSlots = generateSlots(doctor.working_hours_start, doctor.working_hours_end, doctor.slot_duration_minutes);

    // remove already booked slots
    const bookedResult = await pool.query(
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND status = 'confirmed'`,
      [doctor_id, date]
    );
    const bookedTimes = bookedResult.rows.map(r => r.appointment_time.slice(0, 5));

    // remove currently held slots (not expired yet)
    const heldResult = await pool.query(
      `SELECT appointment_time FROM slot_holds
       WHERE doctor_id = $1 AND appointment_date = $2 AND expires_at > NOW()`,
      [doctor_id, date]
    );
    const heldTimes = heldResult.rows.map(r => r.appointment_time.slice(0, 5));

    const availableSlots = allSlots.filter(s => !bookedTimes.includes(s) && !heldTimes.includes(s));

    res.json({ available: true, slots: availableSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATIENT: hold a slot for 5 minutes while filling the symptom form
router.post('/hold-slot', verifyToken, requireRole('patient'), async (req, res) => {
  try {
    const { doctor_id, appointment_date, appointment_time } = req.body;

    // clean up expired holds first (simple approach for now)
    await pool.query('DELETE FROM slot_holds WHERE expires_at < NOW()');

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    const result = await pool.query(
      `INSERT INTO slot_holds (doctor_id, appointment_date, appointment_time, held_by, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [doctor_id, appointment_date, appointment_time, req.user.id, expiresAt]
    );

    res.status(201).json({ message: 'Slot held for 5 minutes', hold: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique constraint violation
      return res.status(409).json({ error: 'This slot is already held or booked' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATIENT: confirm booking (after symptom form is filled) — turns the hold into a real appointment
router.post('/book', verifyToken, requireRole('patient'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { doctor_id, appointment_date, appointment_time, symptoms } = req.body;

    await client.query('BEGIN');

    // confirm the hold belongs to this patient and hasn't expired
    const holdCheck = await client.query(
      `SELECT * FROM slot_holds WHERE doctor_id = $1 AND appointment_date = $2
       AND appointment_time = $3 AND held_by = $4 AND expires_at > NOW()`,
      [doctor_id, appointment_date, appointment_time, req.user.id]
    );
    if (holdCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Your hold on this slot expired. Please pick a slot again.' });
    }

    const symptomSummary = await generatePreVisitSummary(symptoms);

    const result = await client.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, symptom_summary)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, doctor_id, appointment_date, appointment_time, JSON.stringify(symptomSummary)]
    );

    // release the hold since it's now a real booking
    await client.query(
      'DELETE FROM slot_holds WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3',
      [doctor_id, appointment_date, appointment_time]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Appointment booked', appointment: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This slot was just booked by someone else' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});


// DOCTOR: submit post-visit notes + prescription, get AI patient-friendly summary
router.post('/:id/complete', verifyToken, requireRole('doctor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { clinical_notes, prescription } = req.body;
    // prescription example: [{ "medicine": "Paracetamol", "dosage": "500mg", "frequency": "twice daily", "duration_days": 5 }]

    const postVisitSummary = await generatePostVisitSummary(clinical_notes, prescription);

    const result = await pool.query(
      `UPDATE appointments SET status = 'completed', post_visit_summary = $1
       WHERE id = $2 RETURNING *`,
      [JSON.stringify({ clinical_notes, prescription, ai_summary: postVisitSummary }), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Visit completed', appointment: result.rows[0] });
    // NOTE: medication reminder scheduling gets added in Phase 5
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;