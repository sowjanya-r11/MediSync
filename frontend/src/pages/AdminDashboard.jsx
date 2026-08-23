import { useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function AdminDashboard() {
  const { auth, logout } = useAuth();
  const [userId, setUserId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState('');

  async function createDoctor() {
    try {
      const res = await api.post('/doctors', {
        user_id: Number(userId),
        specialization,
        working_hours_start: start,
        working_hours_end: end,
        slot_duration_minutes: Number(duration)
      });
      setMessage('Doctor profile created successfully!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create doctor profile');
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin — {auth.user.name}</h1>
        <button onClick={logout} className="text-red-600">Log out</button>
      </div>

      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">Create Doctor Profile</h2>
        <p className="text-sm text-gray-500 mb-2">User must already be registered with role "doctor" — check their ID in Supabase Table Editor.</p>
        <input placeholder="User ID" className="border p-2 rounded w-full mb-2" value={userId}
          onChange={(e) => setUserId(e.target.value)} />
        <input placeholder="Specialization" className="border p-2 rounded w-full mb-2" value={specialization}
          onChange={(e) => setSpecialization(e.target.value)} />
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input type="time" className="border p-2 rounded" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="time" className="border p-2 rounded" value={end} onChange={(e) => setEnd(e.target.value)} />
          <input type="number" className="border p-2 rounded" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <button onClick={createDoctor} className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
      </div>

      {message && <p className="mt-4 text-blue-700">{message}</p>}
    </div>
  );
}