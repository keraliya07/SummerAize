// const dotenv = require('dotenv');
// dotenv.config();
// const Groq = require('groq-sdk');

// function createGroqClient() {
//   const raw = process.env.GROQ_API_KEY;
//   const apiKey = typeof raw === 'string' ? raw.trim() : '';
//   if (!apiKey) {
//     throw new Error('GROQ_API_KEY is missing. Set it in your environment before summarization.');
//   }
//   return new Groq({ apiKey });
// }

// async function summarizeTextWithGroq(params = { text: '', model: 'llama-3.3-70b-versatile' }) {
//   const { text, model } = params;
  
//   if (!text || text.trim().length === 0) {
//     throw new Error('No text content provided for summarization');
//   }
  
//   if (text.length > 100000) {
//     console.warn(`Large text content detected: ${text.length} characters. Summarization may take longer.`);
//   }
  
//   const groq = createGroqClient();
  
//   const prompt = `Summarize the content of the document in a way that retains all important concepts, formulas, and methods. Make it concise but accurate:\n\nDocument:\n${text}`;
  
//   if (prompt.length > 200000) {
//     throw new Error('Document content is too large for processing. Please use a smaller document or contact support.');
//   }
  
//   try {
//     console.log(`Starting summarization with ${model || 'llama-3.3-70b-versatile'} for ${text.length} characters`);
    
//     const response = await groq.chat.completions.create({
//       messages: [
//         {
//           role: 'user',
//           content: prompt
//         }
//       ],
//       model: model || 'llama-3.3-70b-versatile',
//       temperature: 0.2,
//       max_tokens: 2048
//     });
    
//     const summaryText = response.choices[0]?.message?.content || '';
    
//     if (!summaryText || summaryText.trim().length === 0) {
//       throw new Error('Failed to generate summary. The AI service returned empty content.');
//     }
    
//     console.log(`Summarization completed. Summary length: ${summaryText.length} characters`);
    
//     return { summaryText, modelName: model || 'llama-3.3-70b-versatile' };
//   } catch (error) {
//     console.error('Groq API error:', error.message);
    
//     if (error.message.includes('rate limit')) {
//       throw new Error('AI service is currently busy. Please try again in a few moments.');
//     }
    
//     if (error.message.includes('quota')) {
//       throw new Error('AI service quota exceeded. Please try again later.');
//     }
    
//     if (error.message.includes('timeout')) {
//       throw new Error('AI service timeout. The document may be too complex. Please try with a simpler document.');
//     }
    
//     throw new Error(`Summarization failed: ${error.message}`);
//   }
// }

// module.exports = { summarizeTextWithGroq };


const dotenv = require('dotenv');
dotenv.config();

function getGeminiApiKey() {
  const raw = process.env.GEMINI_API_KEY;
  const apiKey = typeof raw === 'string' ? raw.trim() : '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Set it in your environment before summarization.');
  }
  return apiKey;
}

async function summarizeTextWithGroq(params = { text: '', model: 'gemini-2.5-flash-preview-05-20' }) {
  const { text, model } = params;
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text content provided for summarization');
  }
  
  if (text.length > 100000) {
    console.warn(`Large text content detected: ${text.length} characters. Summarization may take longer.`);
  }
  
  const apiKey = getGeminiApiKey();
  const prompt = `Summarize the content of the document in a way that retains all important concepts, formulas, and methods. Make it concise but accurate. Use bullet points when appropriate.\n\nDocument:\n${text}`;
  
  if (prompt.length > 200000) {
    throw new Error('Document content is too large for processing. Please use a smaller document or contact support.');
  }
  
  try {
    console.log(`Starting summarization with ${model || 'gemini-2.5-flash-preview-05-20'} for ${text.length} characters`);

    const endpointModel = model || 'gemini-2.5-flash-preview-05-20';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(endpointModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      })
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Gemini API HTTP ${res.status}: ${errorBody}`);
    }

    const data = await res.json();
    const firstCandidate = data && Array.isArray(data.candidates) ? data.candidates[0] : undefined;
    const partsArray = firstCandidate && firstCandidate.content && Array.isArray(firstCandidate.content.parts) ? firstCandidate.content.parts : [];
    let summaryText = partsArray.map(p => (p && typeof p.text === 'string') ? p.text : '').join('').trim();
    if ((!summaryText || summaryText.length === 0) && Array.isArray(data.candidates)) {
      for (const c of data.candidates) {
        const ps = c && c.content && Array.isArray(c.content.parts) ? c.content.parts : [];
        const txt = ps.map(p => (p && typeof p.text === 'string') ? p.text : '').join('').trim();
        if (txt) { summaryText = txt; break; }
      }
    }

    if (!summaryText || summaryText.trim().length === 0) {
      const chunkSize = 12000;
      if (text.length > chunkSize) {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));
        const partials = [];
        for (const chunk of chunks) {
          const chunkPrompt = `Summarize this part of a larger document. Preserve key points, formulas, and methods. Keep it concise.\n\nPart:\n${chunk}`;
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [ { role: 'user', parts: [{ text: chunkPrompt }] } ],
              generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
            })
          });
          if (!r.ok) {
            const eb = await r.text();
            throw new Error(`Gemini API HTTP ${r.status}: ${eb}`);
          }
          const jd = await r.json();
          const cand = jd && Array.isArray(jd.candidates) ? jd.candidates[0] : undefined;
          const pts = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
          const t = pts.map(p => (p && typeof p.text === 'string') ? p.text : '').join('').trim();
          if (t) partials.push(t);
        }
        const combinePrompt = `Combine these section summaries into a single, cohesive summary. Avoid repetition, preserve key details, and keep it under 500 words.\n\nSections:\n${partials.map((p, i) => `Section ${i+1}:\n${p}`).join('\n\n')}`;
        const r2 = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [ { role: 'user', parts: [{ text: combinePrompt }] } ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
          })
        });
        if (!r2.ok) {
          const eb2 = await r2.text();
          throw new Error(`Gemini API HTTP ${r2.status}: ${eb2}`);
        }
        const jd2 = await r2.json();
        const cand2 = jd2 && Array.isArray(jd2.candidates) ? jd2.candidates[0] : undefined;
        const pts2 = cand2 && cand2.content && Array.isArray(cand2.content.parts) ? cand2.content.parts : [];
        summaryText = pts2.map(p => (p && typeof p.text === 'string') ? p.text : '').join('').trim();
      }
    }
    
    if (!summaryText || summaryText.trim().length === 0) {
      throw new Error('Failed to generate summary. The AI service returned empty content.');
    }
    
    console.log(`Summarization completed. Summary length: ${summaryText.length} characters`);
    
    return { summaryText, modelName: endpointModel };
  } catch (error) {
    console.error('Gemini API error:', error.message);
    
    if (error.message.includes('rate limit')) {
      throw new Error('AI service is currently busy. Please try again in a few moments.');
    }
    
    if (error.message.includes('quota')) {
      throw new Error('AI service quota exceeded. Please try again later.');
    }
    
    if (error.message.includes('timeout')) {
      throw new Error('AI service timeout. The document may be too complex. Please try with a simpler document.');
    }
    
    throw new Error(`Summarization failed: ${error.message}`);
  }
}

module.exports = { summarizeTextWithGroq };