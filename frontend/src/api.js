import axios from 'axios';

const api = axios.create({
  baseURL: 'https://medisync-tnk0.onrender.com/api'
});

// automatically attach the token to every request, if logged in
api.interceptors.request.use((config) => {
  const saved = localStorage.getItem('medisync_auth');
  if (saved) {
    const { token } = JSON.parse(saved);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;