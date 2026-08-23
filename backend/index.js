const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./auth');
const doctorRoutes = require('./doctors');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);

app.get('/', (req, res) => {
  res.send('MediSync backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));