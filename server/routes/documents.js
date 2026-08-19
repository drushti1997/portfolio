const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { OpenAI } = require('openai');
const db = require('../db');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ALLOWED = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]);
    cb(null, ALLOWED.has(file.mimetype) || /\.(pdf|docx|txt)$/i.test(file.originalname));
  },
});

// ── Sentence-aware chunking ───────────────────────────────────────────────────

function splitSentences(text) {
  // Protect common abbreviations so they don't trigger false splits
  const protected_ = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|approx|dept|est|max|min|No|St|Ave|Blvd|Inc|LLC|U\.S|U\.K|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./g,
      (m) => m.replace('.', '\x02'))
    .replace(/\b([A-Z])\./g, '$1\x02'); // single-letter abbreviations like "A." or "B."

  const parts = protected_
    .replace(/([.!?])\s+(?=[A-Z"'(\d])/g, '$1\x00')
    .split('\x00');

  return parts
    .map(s => s.replace(/\x02/g, '.').trim())
    .filter(s => s.length > 0);
}

function chunkBySentences(text, maxChars = 800, overlapSentences = 2) {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const sentences = splitSentences(normalized);

  if (sentences.length === 0) return normalized ? [normalized] : [];

  const chunks = [];
  let i = 0;

  while (i < sentences.length) {
    let buffer = '';
    let j = i;

    while (j < sentences.length) {
      const candidate = buffer ? buffer + ' ' + sentences[j] : sentences[j];
      if (candidate.length > maxChars && buffer.length > 0) break;
      buffer = candidate;
      j++;
    }

    // Single sentence exceeds maxChars — force include and move on
    if (j === i) {
      buffer = sentences[i];
      j = i + 1;
    }

    chunks.push(buffer.trim());
    // Overlap: go back overlapSentences before j to carry context forward
    i = Math.max(i + 1, j - overlapSentences);
  }

  return chunks.filter(c => c.length > 0);
}

// ── File parsing with page awareness ─────────────────────────────────────────

// Lazily loaded so the heavy ESM import only happens on first PDF upload
let _pdfjs = null;
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Point to the bundled worker file — resolved relative to this file so
    // the path is correct in both local dev and the Docker container.
    _pdfjs.GlobalWorkerOptions.workerSrc = path.join(
      __dirname,
      '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
    );
  }
  return _pdfjs;
}

async function parsePDFWithPages(buffer) {
  const pdfjs = await getPdfjs();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') {
      throw new Error('PDF is password-protected — please upload an unprotected version');
    }
    if (err?.name === 'InvalidPDFException') {
      throw new Error('PDF appears to be corrupted or in an unsupported format');
    }
    // Re-throw with a message if original has none
    throw new Error(err?.message || `PDF parsing failed (${err?.name || 'unknown error'})`);
  }

  const result = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map(item => item.str + (item.hasEOL ? '\n' : ' '))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;
    const chunks = chunkBySentences(text);
    for (const content of chunks) {
      if (content.trim()) result.push({ content, page: pageNum });
    }
  }
  return result;
}

async function parseFile(file) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();

  if (file.mimetype === 'application/pdf' || ext === 'pdf') {
    const chunksWithPages = await parsePDFWithPages(file.buffer);
    const fullText = chunksWithPages.map(c => c.content).join(' ');
    return { fileType: 'pdf', chunksWithPages, charCount: fullText.length };
  }

  let text;
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    text = result.value;
  } else {
    text = file.buffer.toString('utf8');
  }

  const chunks = chunkBySentences(text);
  const chunksWithPages = chunks.map(content => ({ content, page: 1 }));
  return { fileType: ext === 'docx' ? 'docx' : 'txt', chunksWithPages, charCount: text.length };
}

// ── Embedding ─────────────────────────────────────────────────────────────────

async function embedBatch(texts) {
  const openai = getOpenAIClient();
  const BATCH_SIZE = 512; // well under OpenAI's 2048 limit; each batch ~1 API call
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map(t => t.slice(0, 32000));
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });
    // API returns results in index order but sort to be safe
    const sorted = [...response.data].sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map(d => d.embedding));
  }

  return allEmbeddings;
}

async function embedText(text) {
  const [embedding] = await embedBatch([text]);
  return embedding;
}

// ── Vector math ───────────────────────────────────────────────────────────────

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function mmrRerank(queryEmbedding, candidates, k, lambda = 0.5) {
  const selected = [];
  const remaining = [...candidates];

  while (selected.length < k && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = cosineSimilarity(queryEmbedding, remaining[i].embedding);
      let maxRedundancy = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(remaining[i].embedding, sel.embedding);
        if (sim > maxRedundancy) maxRedundancy = sim;
      }
      const score = lambda * relevance - (1 - lambda) * maxRedundancy;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET / — list all documents
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, file_type, chunk_count, char_count, created_at
       FROM rag_documents ORDER BY created_at DESC`
    );
    res.json({ documents: rows });
  } catch (err) {
    console.error('documents GET error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /:id/file — serve stored file
router.get('/:id/file', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT file_path, file_type, name FROM rag_documents WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const { file_path, file_type, name } = rows[0];
    if (!file_path) return res.status(404).json({ error: 'File not stored' });

    const fullPath = path.join(UPLOADS_DIR, file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File missing from disk' });

    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };

    res.setHeader('Content-Type', mimeTypes[file_type] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error('file serve error:', err);
    res.status(500).json({ error: 'Could not serve file' });
  }
});

// POST /upload — parse, chunk, embed, store
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { fileType, chunksWithPages, charCount } = await parseFile(req.file);

    if (!chunksWithPages.length) {
      return res.status(422).json({ error: 'Could not extract text from file' });
    }

    // Insert document row first to get the ID
    const { rows: [doc] } = await db.query(
      `INSERT INTO rag_documents (name, file_type, chunk_count, char_count)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.file.originalname, fileType, chunksWithPages.length, charCount]
    );

    // Save original file to disk (only for PDFs — needed for the viewer)
    const fileName = `${doc.id}.${fileType}`;
    await fsPromises.writeFile(path.join(UPLOADS_DIR, fileName), req.file.buffer);
    await db.query('UPDATE rag_documents SET file_path = $1 WHERE id = $2', [fileName, doc.id]);

    // Batch-embed all chunks in one API call (avoids Cloudflare's 100s timeout)
    const embeddings = await embedBatch(chunksWithPages.map(c => c.content));

    for (let i = 0; i < chunksWithPages.length; i++) {
      const { content, page } = chunksWithPages[i];
      await db.query(
        `INSERT INTO rag_chunks (document_id, chunk_index, content, token_count, page_number, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [doc.id, i, content, Math.ceil(content.length / 4), page, JSON.stringify(embeddings[i])]
      );
    }

    res.status(201).json({ document: { ...doc, file_path: fileName } });
  } catch (err) {
    // Stringify the full error so server logs show root cause
    const message = (err instanceof Error && err.message)
      ? err.message
      : (typeof err === 'string' ? err : null)
      || `${err?.name || 'Error'} (no message)`;
    console.error('documents POST /upload error:', { name: err?.name, message, code: err?.code, stack: err?.stack?.slice(0, 300) });
    res.status(500).json({ error: message });
  }
});

// DELETE /:id — remove document, chunks (CASCADE), and stored file
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM rag_documents WHERE id = $1 RETURNING file_path',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    // Clean up file on disk
    const { file_path } = rows[0];
    if (file_path) {
      const fullPath = path.join(UPLOADS_DIR, file_path);
      fsPromises.unlink(fullPath).catch(() => {}); // non-fatal
    }

    res.json({ success: true });
  } catch (err) {
    console.error('documents DELETE error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /search — embed query, vector search, rank, generate answer
router.post('/search', async (req, res) => {
  try {
    const {
      query,
      topK = 5,
      threshold = 0.25,
      algorithm = 'cosine',
    } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const queryEmbedding = await embedText(query);
    const embeddingStr = JSON.stringify(queryEmbedding);
    const fetchLimit = algorithm === 'mmr' ? Math.max(topK * 3, 20) : topK;

    // Dedicated pool client so SET ivfflat.probes persists for the query
    const client = await db.connect();
    let candidates;
    try {
      await client.query('SET ivfflat.probes = 10');
      const result = await client.query(
        `SELECT
            rc.id,
            rc.document_id,
            rc.chunk_index,
            rc.content,
            rc.page_number,
            rc.embedding::text AS embedding_raw,
            rd.name AS document_name,
            rd.file_type,
            1 - (rc.embedding <=> $1::vector) AS similarity
         FROM rag_chunks rc
         JOIN rag_documents rd ON rd.id = rc.document_id
         WHERE 1 - (rc.embedding <=> $1::vector) >= $2
         ORDER BY rc.embedding <=> $1::vector
         LIMIT $3`,
        [embeddingStr, threshold, fetchLimit]
      );
      candidates = result.rows;
    } finally {
      client.release();
    }

    if (candidates.length === 0) {
      return res.json({
        answer: 'No relevant content found above the similarity threshold. Try lowering the threshold or rephrasing your query.',
        sources: [],
      });
    }

    let selected;
    if (algorithm === 'mmr') {
      const withEmbeddings = candidates.map(row => ({
        ...row,
        embedding: JSON.parse(row.embedding_raw),
      }));
      selected = mmrRerank(queryEmbedding, withEmbeddings, topK);
    } else {
      selected = candidates.slice(0, topK);
    }

    const contextBlocks = selected.map((chunk, i) =>
      `[${i + 1}] ${chunk.document_name} (page ${chunk.page_number}):\n"${chunk.content.trim()}"`
    ).join('\n\n');

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a precise document assistant. Answer the user's question using ONLY the provided context chunks. Cite sources inline using their bracket numbers, e.g. [1] or [2]. If the answer is not present in the context, say: "The provided documents do not contain enough information to answer this question." Do not speculate.`,
        },
        {
          role: 'user',
          content: `Context:\n\n${contextBlocks}\n\nQuestion: ${query}`,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content || 'No answer generated.';

    const sources = selected.map(chunk => ({
      document_name: chunk.document_name,
      document_id: chunk.document_id,
      file_type: chunk.file_type,
      chunk_index: chunk.chunk_index,
      page_number: chunk.page_number || 1,
      content: chunk.content,
      similarity: Math.round(parseFloat(chunk.similarity) * 1000) / 1000,
    }));

    res.json({ answer, sources });
  } catch (err) {
    console.error('documents POST /search error:', err);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

module.exports = router;
