const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, text) {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  });
}

module.exports = { sendEmail };