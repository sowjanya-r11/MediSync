import { useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function DoctorDashboard() {
  const { auth, logout } = useAuth();
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [apptId, setApptId] = useState('');
  const [notes, setNotes] = useState('');
  const [medicine, setMedicine] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('twice daily');
  const [durationDays, setDurationDays] = useState(3);

  async function markLeave() {
    try {
      const res = await api.post('/doctors/leave', { leave_date: leaveDate, reason });
      setMessage(res.data.note);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to mark leave');
    }
  }

  async function completeVisit() {
    try {
      const res = await api.post(`/appointments/${apptId}/complete`, {
        clinical_notes: notes,
        prescription: [{ medicine, dosage, frequency, duration_days: Number(durationDays) }]
      });
      setMessage('Visit completed. Patient summary generated.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to complete visit');
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dr. {auth.user.name}</h1>
        <button onClick={logout} className="text-red-600">Log out</button>
      </div>

      <div className="border p-4 rounded mb-6">
        <h2 className="font-semibold mb-2">Mark a Leave Day</h2>
        <input type="date" className="border p-2 rounded mr-2" value={leaveDate}
          onChange={(e) => setLeaveDate(e.target.value)} />
        <input placeholder="Reason" className="border p-2 rounded mr-2" value={reason}
          onChange={(e) => setReason(e.target.value)} />
        <button onClick={markLeave} className="bg-blue-600 text-white px-4 py-2 rounded">Mark Leave</button>
      </div>

      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">Complete a Visit</h2>
        <input placeholder="Appointment ID" className="border p-2 rounded w-full mb-2"
          value={apptId} onChange={(e) => setApptId(e.target.value)} />
        <textarea placeholder="Clinical notes" className="border p-2 rounded w-full mb-2" rows={3}
          value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input placeholder="Medicine" className="border p-2 rounded" value={medicine}
            onChange={(e) => setMedicine(e.target.value)} />
          <input placeholder="Dosage (e.g. 500mg)" className="border p-2 rounded" value={dosage}
            onChange={(e) => setDosage(e.target.value)} />
          <select className="border p-2 rounded" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option>twice daily</option>
            <option>once daily</option>
          </select>
          <input type="number" placeholder="Duration (days)" className="border p-2 rounded"
            value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
        </div>
        <button onClick={completeVisit} className="bg-green-600 text-white px-4 py-2 rounded">Complete Visit</button>
      </div>

      {message && <p className="mt-4 text-blue-700">{message}</p>}
    </div>
  );
}