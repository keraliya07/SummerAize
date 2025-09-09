const dotenv = require('dotenv');
dotenv.config();
const Groq = require('groq-sdk');

function createGroqClient() {
  const raw = process.env.GROQ_API_KEY;
  const apiKey = typeof raw === 'string' ? raw.trim() : '';
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing. Set it in your environment before summarization.');
  }
  return new Groq({ apiKey });
}

async function summarizeTextWithGroq(params = { text: '', model: 'llama-3.3-70b-versatile' }) {
  const { text, model } = params;
  const groq = createGroqClient();
  
  const prompt = `Summarize the content of the document in a way that retains all important concepts, formulas, and methods. Make it concise but accurate:\n\nDocument:\n${text}`;
  
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: model || 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 2048
    });
    
    const summaryText = response.choices[0]?.message?.content || '';
    return { summaryText, modelName: model || 'llama-3.3-70b-versatile' };
  } catch (error) {
    throw new Error(`Groq API error: ${error.message}`);
  }
}

module.exports = { summarizeTextWithGroq };