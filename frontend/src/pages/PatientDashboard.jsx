import { useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function PatientDashboard() {
  const { auth, logout } = useAuth();
  const [specialization, setSpecialization] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [message, setMessage] = useState('');

  async function searchDoctors() {
    const res = await api.get('/doctors', { params: { specialization } });
    setDoctors(res.data);
  }

  async function loadSlots(doctorId, chosenDate) {
    setSelectedDoctor(doctorId);
    setDate(chosenDate);
    if (!chosenDate) return;
    const res = await api.get('/appointments/available-slots', { params: { doctor_id: doctorId, date: chosenDate } });
    setSlots(res.data.available ? res.data.slots : []);
    if (!res.data.available) setMessage(res.data.reason);
    else setMessage('');
  }

  async function holdAndBook(time) {
    setSelectedSlot(time);
    try {
      await api.post('/appointments/hold-slot', {
        doctor_id: selectedDoctor, appointment_date: date, appointment_time: time
      });
      setMessage('Slot held for 5 minutes — fill your symptoms and confirm below.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not hold slot');
    }
  }

  async function confirmBooking() {
    try {
      const res = await api.post('/appointments/book', {
        doctor_id: selectedDoctor, appointment_date: date, appointment_time: selectedSlot, symptoms
      });
      setMessage('Appointment booked successfully!');
      setSlots(slots.filter(s => s !== selectedSlot));
      setSelectedSlot('');
      setSymptoms('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Booking failed');
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {auth.user.name}</h1>
        <button onClick={logout} className="text-red-600">Log out</button>
      </div>

      <h2 className="font-semibold mb-2">Search Doctors</h2>
      <div className="flex gap-2 mb-4">
        <input className="border p-2 rounded flex-1" placeholder="Specialization (e.g. cardiology)"
          value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
        <button onClick={searchDoctors} className="bg-blue-600 text-white px-4 rounded">Search</button>
      </div>

      {doctors.map((doc) => (
        <div key={doc.id} className="border p-3 rounded mb-2">
          <p className="font-medium">Dr. {doc.name} — {doc.specialization}</p>
          <input type="date" className="border p-1 rounded mt-1"
            onChange={(e) => loadSlots(doc.id, e.target.value)} />
          {selectedDoctor === doc.id && (
            <div className="flex flex-wrap gap-2 mt-2">
              {slots.map((s) => (
                <button key={s} onClick={() => holdAndBook(s)}
                  className={`border px-2 py-1 rounded ${selectedSlot === s ? 'bg-blue-600 text-white' : ''}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {selectedSlot && (
        <div className="border p-3 rounded mt-4">
          <h3 className="font-semibold mb-2">Describe your symptoms</h3>
          <textarea className="w-full border p-2 rounded" rows={3}
            value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          <button onClick={confirmBooking} className="bg-green-600 text-white px-4 py-2 rounded mt-2">
            Confirm Booking
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-blue-700">{message}</p>}
    </div>
  );
}