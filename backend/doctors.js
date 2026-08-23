const express = require('express');
const { Pool } = require('pg');
const { verifyToken, requireRole } = require('./middleware');
require('dotenv').config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ADMIN: create a doctor profile for an existing user with role 'doctor'
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { user_id, specialization, working_hours_start, working_hours_end, slot_duration_minutes } = req.body;

    // confirm the user exists and has role 'doctor'
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (userCheck.rows[0].role !== 'doctor') {
      return res.status(400).json({ error: 'This user is not registered with role doctor' });
    }

    const result = await pool.query(
      `INSERT INTO doctor_profiles (user_id, specialization, working_hours_start, working_hours_end, slot_duration_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, specialization, working_hours_start, working_hours_end, slot_duration_minutes || 30]
    );

    res.status(201).json({ message: 'Doctor profile created', doctor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUBLIC: search doctors by specialization (patients need this)
router.get('/', async (req, res) => {
  try {
    const { specialization } = req.query;
    let query = `SELECT dp.id, dp.specialization, dp.working_hours_start, dp.working_hours_end,
                        dp.slot_duration_minutes, u.name
                 FROM doctor_profiles dp JOIN users u ON dp.user_id = u.id`;
    let params = [];

    if (specialization) {
      query += ' WHERE dp.specialization ILIKE $1';
      params.push(`%${specialization}%`);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DOCTOR: mark a leave day
router.post('/leave', verifyToken, requireRole('doctor'), async (req, res) => {
  try {
    const { leave_date, reason } = req.body;

    const doctorProfile = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
    if (doctorProfile.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found for this user' });
    }
    const doctorId = doctorProfile.rows[0].id;

    const result = await pool.query(
      'INSERT INTO doctor_leaves (doctor_id, leave_date, reason) VALUES ($1, $2, $3) RETURNING *',
      [doctorId, leave_date, reason]
    );

    res.status(201).json({ message: 'Leave day marked', leave: result.rows[0] });
    // NOTE: in Phase 3, we'll add the logic here to check existing bookings on this date
    // and notify affected patients — skipping that for now since bookings don't exist yet
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;