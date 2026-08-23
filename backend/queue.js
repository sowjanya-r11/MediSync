const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendEmail } = require('./email');
require('dotenv').config();

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const notificationQueue = new Queue('notifications', { connection });

// The worker processes jobs added to the queue, with automatic retries
const worker = new Worker('notifications', async (job) => {
  const { to, subject, text } = job.data;
  await sendEmail(to, subject, text);
}, {
  connection,
  attempts: 3, // this line is actually set per-job below, kept here as a fallback
});

worker.on('failed', (job, err) => {
  console.error(`Notification job ${job.id} failed after retries:`, err.message);
});

worker.on('completed', (job) => {
  console.log(`Notification job ${job.id} sent successfully`);
});

// Helper: add an email job to the queue with retry settings
async function queueEmail(to, subject, text) {
  await notificationQueue.add('send-email', { to, subject, text }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 } // 5s, then 10s, then 20s between retries
  });
}

// Schedules a reminder email to fire at a future time (delay in milliseconds)
async function scheduleMedicationReminder(to, patientName, medicine, delayMs) {
  await notificationQueue.add('send-email', {
    to,
    subject: 'Medication Reminder - MediSync',
    text: `Hi ${patientName}, this is a reminder to take your medicine: ${medicine}.`
  }, {
    delay: delayMs,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  });
}

module.exports = { queueEmail, scheduleMedicationReminder };

module.exports = { queueEmail };