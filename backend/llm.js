const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Calls the LLM and always returns usable JSON, even if the AI call fails.
async function callLLM(prompt, fallbackValue) {
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // pull out just the { ... } part, ignoring any extra text before/after
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in LLM response: ' + text);
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('LLM call failed:', err.message);
    return fallbackValue; // never throw — always return something usable
  }
}

async function generatePreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return ONLY a JSON object with this exact shape,
no other text: {"urgency": "Low" or "Medium" or "High", "chief_complaint": "short phrase",
"suggested_questions": ["question 1", "question 2", "question 3"]}.
Symptoms: ${symptoms}`;

  const fallback = {
    urgency: 'Unknown',
    chief_complaint: 'AI summary unavailable — please review symptoms manually below',
    suggested_questions: [],
    raw_symptoms: symptoms
  };

  return callLLM(prompt, fallback);
}

async function generatePostVisitSummary(clinicalNotes, prescription) {
  const prompt = `Convert these clinical notes into a patient-friendly JSON object with this exact
shape, no other text: {"summary": "plain-language explanation of the visit", "medication_schedule":
"plain-language medication instructions", "follow_up_steps": ["step 1", "step 2"]}.
Clinical notes: ${clinicalNotes}. Prescription: ${JSON.stringify(prescription)}`;

  const fallback = {
    summary: 'AI summary unavailable — please see the doctor\'s notes below',
    medication_schedule: JSON.stringify(prescription),
    follow_up_steps: [],
    raw_notes: clinicalNotes
  };

  return callLLM(prompt, fallback);
}

module.exports = { generatePreVisitSummary, generatePostVisitSummary };