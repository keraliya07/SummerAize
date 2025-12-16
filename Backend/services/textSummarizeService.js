const dotenv = require('dotenv');
const Groq = require('groq-sdk');
dotenv.config();

function getGroqApiKey() {
  const raw = process.env.GROQ_API_KEY;
  const apiKey = typeof raw === 'string' ? raw.trim() : '';
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing. Set it in your environment before summarization.');
  }
  return apiKey;
}

function createGroqClient() {
  const apiKey = getGroqApiKey();
  return new Groq({ apiKey });
}

function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

function detectChapterBoundaries(text) {
  const chapterPatterns = [
    /^\s*(?:Chapter\s*[0-9IVX]+|CHAPTER\s*[0-9IVX]+|Ch\.\s*[0-9IVX]+)/i,
    /^\s*[0-9IVX]+\.\s+[A-Z][A-Za-z\s]{10,}/,
    /^\s*(?:Part\s*[0-9IVX]+|PART\s*[0-9IVX]+)/i,
    /^\s*Section\s*[0-9IVX]+/i,
    /^\s*[0-9]+\s*-\s*[A-Z][A-Za-z\s]{10,}/,
    /^\s*#{1,3}\s*(?:Chapter|Ch\.|Part|Section)\s*[0-9IVX]+/i
  ];
  
  const lines = text.split('\n');
  const boundaries = [0];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 5) continue;
    
    for (const pattern of chapterPatterns) {
      if (pattern.test(line)) {
        boundaries.push(i);
        console.log(`Chapter boundary detected at line ${i}: "${line.substring(0, 60)}..."`);
        break;
      }
    }
  }
  
  boundaries.push(lines.length);
  return boundaries;
}

function chunkTextIntelligently(text, maxChunkSize = 8000) {
  const chunks = [];
  
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chapterBoundaries = detectChapterBoundaries(text);
  const lines = text.split('\n');
  
  if (chapterBoundaries.length > 2) {
    console.log(`Detected ${chapterBoundaries.length - 1} chapters/sections in document`);
    
    for (let i = 0; i < chapterBoundaries.length - 1; i++) {
      const startLine = chapterBoundaries[i];
      const endLine = chapterBoundaries[i + 1];
      let chapterText = lines.slice(startLine, endLine).join('\n');
      
      if (chapterText.trim().length === 0) continue;
      
      if (chapterText.length <= maxChunkSize) {
        chunks.push(chapterText);
        console.log(`Chapter ${i + 1}: ${chapterText.length} chars (fits in one chunk)`);
      } else {
        console.log(`Chapter ${i + 1}: ${chapterText.length} chars (needs splitting)`);
        const chapterChunks = splitLargeChapter(chapterText, maxChunkSize);
        chunks.push(...chapterChunks);
        console.log(`Chapter ${i + 1} split into ${chapterChunks.length} sub-chunks`);
      }
    }
    
    if (chunks.length > 0) {
      console.log(`Document split into ${chunks.length} chunks based on chapter boundaries`);
      return chunks.filter(c => c.trim().length > 0);
    }
  }
  
  console.log('No chapter boundaries detected, using paragraph-based chunking');
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      if (para.length > maxChunkSize) {
        const paraChunks = splitLargeParagraph(para, maxChunkSize);
        chunks.push(...paraChunks.slice(0, -1));
        currentChunk = paraChunks[paraChunks.length - 1] || para.slice(0, maxChunkSize);
      } else {
        currentChunk = para;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  console.log(`Document split into ${chunks.length} chunks`);
  return chunks.filter(c => c.trim().length > 0);
}

function splitLargeChapter(chapterText, maxChunkSize) {
  const chunks = [];
  const paragraphs = chapterText.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = para.length > maxChunkSize ? para.slice(0, maxChunkSize) : para;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.filter(c => c.trim().length > 0);
}

function splitLargeParagraph(para, maxChunkSize) {
  const chunks = [];
  const sentences = para.split(/([.!?]+\s+)/);
  let currentChunk = '';
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.filter(c => c.trim().length > 0);
}

async function callGroqAPI(prompt, maxTokens = 2048, model = 'llama-3.3-70b-versatile') {
  try {
    const groq = createGroqClient();
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: model,
      temperature: 0.2,
      max_tokens: maxTokens,
      top_p: 1,
      stream: false
    });

    const summaryText = completion.choices[0]?.message?.content?.trim() || '';
    
    if (!summaryText) {
      throw new Error('Groq API returned empty response');
    }
    
    return summaryText;
  } catch (error) {
    console.error('Groq API error:', error.message);
    
    if (error.status === 429 || error.message.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    
    if (error.status === 401 || error.message.includes('authentication')) {
      throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY environment variable.');
    }
    
    if (error.status === 400 || error.message.includes('token')) {
      throw new Error('Request too large. Document exceeds token limits.');
    }
    
    throw new Error(`Groq API error: ${error.message}`);
  }
}

async function generateOverview(text, model) {
  const previewLength = Math.min(5000, text.length);
  const previewText = text.slice(0, previewLength) + (text.length > previewLength ? '...' : '');
  
  const overviewPrompt = `Provide a brief overview (2-3 sentences) of this document. Focus on the main topic, purpose, and key themes.\n\nDocument preview:\n${previewText}`;
  
  return await callGroqAPI(overviewPrompt, 256, model);
}

async function summarizeChunk(chunk, chunkIndex, totalChunks, model) {
  const chunkPrompt = `Summarize section ${chunkIndex + 1} of ${totalChunks} from a larger document. 
Preserve all important concepts, formulas, methods, data points, and conclusions. 
Be concise but comprehensive. Use bullet points for key points.\n\nSection ${chunkIndex + 1}:\n${chunk}`;
  
  return await callGroqAPI(chunkPrompt, 1024, model);
}

async function combineSummaries(overview, sectionSummaries, model) {
  const sectionsText = sectionSummaries
    .map((sum, i) => `Section ${i + 1} Summary:\n${sum}`)
    .join('\n\n');
  
  const combinePrompt = `Combine this document overview and section summaries into a single, cohesive summary.
- Start with the overview
- Then provide detailed sections with all key information
- Avoid repetition
- Preserve all important details, formulas, and concepts
- Use clear structure with headings/bullets when appropriate
- Maximum 2000 words total

Overview:\n${overview}\n\nDetailed Section Summaries:\n${sectionsText}`;
  
  return await callGroqAPI(combinePrompt, 2048, model);
}

async function summarizeTextWithGroq(params = { text: '', model: 'llama-3.3-70b-versatile' }) {
  const { text, model } = params;
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text content provided for summarization');
  }
  
  const endpointModel = model || 'llama-3.3-70b-versatile';
  
  const MAX_INPUT_TOKENS = 128000;
  const ESTIMATED_TOKEN_COUNT = estimateTokenCount(text);
  const MAX_CHUNK_SIZE = 8000;
  
  console.log(`Processing document: ${text.length} characters (~${ESTIMATED_TOKEN_COUNT} tokens) using Groq model: ${endpointModel}`);
  
  try {
    if (ESTIMATED_TOKEN_COUNT <= MAX_INPUT_TOKENS) {
      console.log('Document fits in single request, attempting direct summarization...');
      
      try {
        const prompt = `Summarize this document comprehensively. Retain all important concepts, formulas, methods, data points, and conclusions. Use bullet points and clear structure.\n\nDocument:\n${text}`;
        const summaryText = await callGroqAPI(prompt, 4096, endpointModel);
        
        if (summaryText && summaryText.trim().length > 0) {
          console.log(`Direct summarization successful: ${summaryText.length} characters`);
          return { summaryText, modelName: endpointModel };
        }
      } catch (directError) {
        const errorMsg = directError.message || '';
        
        if (
          errorMsg.includes('token') ||
          errorMsg.includes('too large') ||
          errorMsg.includes('context length') ||
          errorMsg.includes('400') ||
          errorMsg.includes('413')
        ) {
          console.log('Direct summarization failed due to size, switching to chunking strategy...');
        } else {
          throw directError;
        }
      }
    }
    
    console.log('Using chunking strategy for large document...');
    
    const chunks = chunkTextIntelligently(text, MAX_CHUNK_SIZE);
    console.log(`Document split into ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      throw new Error('Failed to create document chunks');
    }
    
    for (let i = 0; i < Math.min(chunks.length, 10); i++) {
      const preview = chunks[i].substring(0, 120).replace(/\n/g, ' ').trim();
      console.log(`Chunk ${i + 1}/${chunks.length}: ${chunks[i].length} chars - Preview: "${preview}..."`);
    }
    if (chunks.length > 10) {
      console.log(`... and ${chunks.length - 10} more chunks`);
    }
    
    let overview;
    try {
      overview = await generateOverview(text, endpointModel);
      console.log(`Generated overview: ${overview.length} characters`);
    } catch (overviewError) {
      console.warn('Failed to generate overview, continuing with sections only:', overviewError.message);
      overview = 'Document overview unavailable.';
    }
    
    const MAX_CONCURRENT_REQUESTS = parseInt(process.env.MAX_CONCURRENT_SUMMARIES || '5', 10);
    
    async function processChunkWithIndex(chunk, index, retryCount = 0) {
      const MAX_RETRIES = 2;
      
      try {
        console.log(`Summarizing chunk ${index + 1}/${chunks.length}${retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}...`);
        const chunkSummary = await summarizeChunk(chunk, index, chunks.length, endpointModel);
        
        if (chunkSummary && chunkSummary.trim().length > 0) {
          console.log(`Chunk ${index + 1} summarized: ${chunkSummary.length} characters`);
          return { success: true, index, summary: chunkSummary, chunk };
        } else {
          console.warn(`Chunk ${index + 1} returned empty summary`);
          return { success: false, index, error: 'Empty summary', chunk };
        }
      } catch (chunkError) {
        console.error(`Failed to summarize chunk ${index + 1}:`, chunkError.message);
        
        if (
          chunkError.message.includes('quota') ||
          chunkError.message.includes('rate limit')
        ) {
          if (retryCount < MAX_RETRIES) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying chunk ${index + 1} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await processChunkWithIndex(chunk, index, retryCount + 1);
          }
          throw chunkError;
        }
        
        if (retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying chunk ${index + 1} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return await processChunkWithIndex(chunk, index, retryCount + 1);
        }
        
        return { success: false, index, error: chunkError.message, chunk };
      }
    }
    
    function createFallbackSummary(chunk, index) {
      const previewLength = Math.min(500, chunk.length);
      const preview = chunk.slice(0, previewLength).replace(/\s+/g, ' ').trim();
      return `[Section ${index + 1} - Summary unavailable due to processing limitations]\nKey content preview: ${preview}${chunk.length > previewLength ? '...' : ''}`;
    }
    
    async function processChunksInBatches(chunksArray) {
      const results = [];
      const failedChunksData = [];
      
      for (let i = 0; i < chunksArray.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = chunksArray.slice(i, i + MAX_CONCURRENT_REQUESTS);
        const batchPromises = batch.map((chunk, batchIndex) => {
          const globalIndex = i + batchIndex;
          return processChunkWithIndex(chunk, globalIndex);
        });
        
        console.log(`Processing batch ${Math.floor(i / MAX_CONCURRENT_REQUESTS) + 1} (${batch.length} chunks in parallel)...`);
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              results.push({ index: result.value.index, summary: result.value.summary });
            } else {
              failedChunksData.push({
                index: result.value.index,
                chunk: result.value.chunk,
                error: result.value.error
              });
            }
          } else {
            console.error('Chunk processing rejected:', result.reason);
            const failedIndex = batchResults.indexOf(result);
            const globalIndex = i + failedIndex;
            failedChunksData.push({
              index: globalIndex,
              chunk: chunksArray[globalIndex],
              error: result.reason?.message || 'Unknown error'
            });
          }
        }
        
        if (i + MAX_CONCURRENT_REQUESTS < chunksArray.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      results.sort((a, b) => a.index - b.index);
      failedChunksData.sort((a, b) => a.index - b.index);
      
      return {
        summaries: results,
        failedChunksData
      };
    }
    
    const { summaries: sectionSummaries, failedChunksData } = await processChunksInBatches(chunks);
    
    if (sectionSummaries.length === 0 && failedChunksData.length === chunks.length) {
      throw new Error('Failed to generate any section summaries. The document may be too complex or contain invalid content.');
    }
    
    if (failedChunksData.length > 0) {
      console.log(`Retrying ${failedChunksData.length} failed chunks sequentially with fallback...`);
      
      for (const failedData of failedChunksData) {
        try {
          console.log(`Retrying chunk ${failedData.index + 1} with smaller prompt...`);
          
          const smallerPrompt = failedData.chunk.length > 4000 
            ? failedData.chunk.slice(0, 4000) + '...'
            : failedData.chunk;
          
          const retrySummary = await summarizeChunk(smallerPrompt, failedData.index, chunks.length, endpointModel);
          
          if (retrySummary && retrySummary.trim().length > 0) {
            const existing = sectionSummaries.find(s => s.index === failedData.index);
            if (existing) {
              existing.summary = retrySummary;
            } else {
              sectionSummaries.push({ index: failedData.index, summary: retrySummary });
            }
            console.log(`Chunk ${failedData.index + 1} successfully summarized on retry`);
          } else {
            throw new Error('Retry returned empty summary');
          }
        } catch (retryError) {
          console.warn(`Chunk ${failedData.index + 1} failed even on retry, creating fallback summary`);
          const fallbackSummary = createFallbackSummary(failedData.chunk, failedData.index);
          const existing = sectionSummaries.find(s => s.index === failedData.index);
          if (existing) {
            existing.summary = fallbackSummary;
          } else {
            sectionSummaries.push({ index: failedData.index, summary: fallbackSummary });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    sectionSummaries.sort((a, b) => a.index - b.index);
    
    const allSummaries = Array(chunks.length).fill(null);
    sectionSummaries.forEach(item => {
      allSummaries[item.index] = item.summary;
    });
    
    for (let i = 0; i < allSummaries.length; i++) {
      if (!allSummaries[i]) {
        console.warn(`Chunk ${i + 1} missing, creating fallback summary`);
        allSummaries[i] = createFallbackSummary(chunks[i], i);
      }
    }
    
    const finalSectionSummaries = allSummaries.filter(s => s !== null);
    
    if (finalSectionSummaries.length !== chunks.length) {
      console.error(`Warning: Expected ${chunks.length} summaries but got ${finalSectionSummaries.length}`);
    }
    
    console.log(`Preparing final summary with ${finalSectionSummaries.length} sections (expected ${chunks.length} chunks)`);
    
    let finalSummary;
    
    if (finalSectionSummaries.length === 1) {
      finalSummary = `${overview}\n\n## Detailed Summary\n\n${finalSectionSummaries[0]}`;
    } else {
      try {
        console.log(`Combining ${finalSectionSummaries.length} section summaries into final summary...`);
        
        const enhancedCombinePrompt = `Create a comprehensive summary that includes ALL ${finalSectionSummaries.length} sections.
CRITICAL: Make sure ALL ${finalSectionSummaries.length} sections are included - do not merge or skip any.
Start with the overview, then provide a detailed section-by-section summary with clear headings.
Label each section clearly as "Section 1", "Section 2", etc., up to "Section ${finalSectionSummaries.length}".

Overview:\n${overview}\n\nSection Summaries:\n${finalSectionSummaries.map((sum, i) => `### Section ${i + 1} Summary:\n${sum}`).join('\n\n---\n\n')}`;
        
        finalSummary = await callGroqAPI(enhancedCombinePrompt, 4096, endpointModel);
        
        if (!finalSummary || finalSummary.trim().length === 0) {
          throw new Error('Combined summary is empty');
        }
        
        const sectionCountInFinal = (finalSummary.match(/Section\s+[0-9]+/gi) || []).length;
        console.log(`Final summary contains references to ${sectionCountInFinal} sections`);
        
        if (sectionCountInFinal < finalSectionSummaries.length * 0.7) {
          console.warn(`Warning: Final summary may be missing sections. Expected ${finalSectionSummaries.length}, found ${sectionCountInFinal}`);
          throw new Error('Combined summary missing sections - using concatenated version');
        }
      } catch (combineError) {
        console.warn('Failed to combine summaries properly, using concatenated version to ensure all sections included:', combineError.message);
        finalSummary = `${overview}\n\n## Detailed Summary - All ${finalSectionSummaries.length} Sections Included\n\n${finalSectionSummaries.map((sum, i) => `## Section ${i + 1}\n\n${sum}`).join('\n\n---\n\n')}`;
      }
    }
    
    const hasFallbackSummaries = finalSectionSummaries.some(s => s.includes('[Section') && s.includes('Summary unavailable'));
    if (hasFallbackSummaries) {
      finalSummary += `\n\n---\n\nNote: Some sections were processed with simplified summaries due to API limitations, but all sections are included.`;
    }
    
    console.log(`Summarization completed. Final summary: ${finalSummary.length} characters`);
    
    return { 
      summaryText: finalSummary, 
      modelName: endpointModel,
      chunksProcessed: finalSectionSummaries.length,
      totalChunks: chunks.length,
      allSectionsIncluded: finalSectionSummaries.length === chunks.length
    };
  } catch (error) {
    console.error('Summarization error:', error.message);
    
    const errorMsg = error.message || '';
    
    if (errorMsg.includes('rate limit') || errorMsg.includes('quota')) {
      throw new Error('AI service quota exceeded. Please try again in a few minutes.');
    }
    
    if (errorMsg.includes('token') || errorMsg.includes('too large') || errorMsg.includes('context length')) {
      throw new Error('Document is too large to process. Please try a smaller document or split it into sections.');
    }
    
    if (errorMsg.includes('timeout')) {
      throw new Error('Processing timeout. The document may be too complex. Please try again.');
    }
    
    throw new Error(`Summarization failed: ${errorMsg}`);
  }
}

module.exports = { summarizeTextWithGroq };
