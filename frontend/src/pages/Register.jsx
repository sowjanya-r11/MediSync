import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Create an Account</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" name="name" placeholder="Full Name"
          value={form.name} onChange={handleChange} required />
        <input className="w-full border p-2 rounded" name="email" type="email" placeholder="Email"
          value={form.email} onChange={handleChange} required />
        <input className="w-full border p-2 rounded" name="password" type="password" placeholder="Password"
          value={form.password} onChange={handleChange} required />
        <select className="w-full border p-2 rounded" name="role" value={form.role} onChange={handleChange}>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>
        <button className="w-full bg-blue-600 text-white p-2 rounded" type="submit">Register</button>
      </form>
      <p className="mt-3 text-sm">Already have an account? <Link to="/login" className="text-blue-600">Log in</Link></p>
    </div>
  );
}