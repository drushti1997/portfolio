import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Normalize text for fuzzy matching: lowercase, collapse whitespace, strip punctuation
function normText(str) {
  return str
    .replace(/­/g, '')           // soft hyphens
    .replace(/[ \s]+/g, ' ')     // non-breaking + regular whitespace
    .replace(/[""''`]/g, '"')         // smart quotes
    .replace(/[^\w\s]/g, ' ')         // punctuation → space
    .toLowerCase()
    .trim();
}

const UPLOAD_STEPS = [
  { key: 'parsing',   label: '📄 Parse',  desc: 'Extracting text' },
  { key: 'chunking',  label: '✂️ Chunk',  desc: 'Splitting into segments' },
  { key: 'embedding', label: '🔢 Embed',  desc: 'Creating vectors' },
  { key: 'storing',   label: '💾 Store',  desc: 'Saving to pgvector' },
  { key: 'done',      label: '✅ Done',   desc: 'Ready to search' },
];

const SEARCH_STEPS = [
  { key: 'embedding',  label: '🔢 Embed',    desc: 'Vectorizing query' },
  { key: 'searching',  label: '🔍 Search',   desc: 'Scanning vectors' },
  { key: 'ranking',    label: '⚡ Rank',     desc: 'Scoring relevance' },
  { key: 'generating', label: '🤖 Generate', desc: 'GPT-4o answering' },
  { key: 'done',       label: '✅ Done',     desc: 'Answer ready' },
];

function PipelineSteps({ steps, activeStep }) {
  if (!activeStep) return null;
  const activeIdx = steps.findIndex(s => s.key === activeStep);

  return (
    <div className="rounded-xl border border-wire bg-fog px-4 py-3">
      <p className="text-[10px] font-semibold text-ash uppercase tracking-widest mb-3">Pipeline</p>
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const status = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
          return (
            <div key={step.key} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-full px-1.5 py-1 rounded-md text-center text-[10px] font-semibold transition-all duration-300 ${
                    status === 'active'
                      ? 'bg-brand text-white animate-pulse shadow-sm shadow-brand/30'
                      : status === 'done'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-white text-ash/50 border border-wire'
                  }`}
                >
                  <span className="truncate block">{step.label}</span>
                </div>
                {status === 'active' && (
                  <p className="text-[9px] text-brand mt-0.5 truncate w-full text-center">{step.desc}</p>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-3 flex-shrink-0 h-px ${i < activeIdx ? 'bg-emerald-300' : 'bg-wire'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FileTypeIcon({ fileType }) {
  if (fileType === 'pdf') return <span title="PDF">📕</span>;
  if (fileType === 'docx') return <span title="Word document">📘</span>;
  return <span title="Text file">📄</span>;
}

// ── Upload Progress Modal ─────────────────────────────────────────────────────

const UPLOAD_PIPELINE = [
  {
    key: 'parsing',
    icon: '📄',
    label: 'Parse',
    activeDesc: 'Reading document bytes and extracting raw text…',
    doneDesc: (file) => `${(file?.size / 1024).toFixed(0)} KB extracted`,
  },
  {
    key: 'chunking',
    icon: '✂️',
    label: 'Chunk',
    activeDesc: 'Splitting text at sentence boundaries…',
    doneDesc: () => 'Sentence-level segments ready',
  },
  {
    key: 'embedding',
    icon: '🔢',
    label: 'Embed',
    activeDesc: 'Vectorizing chunks · text-embedding-3-small · 1536 dims',
    doneDesc: (_, doc) => doc ? `${doc.chunk_count} chunks → 1536-dim vectors` : 'Generating vectors…',
  },
  {
    key: 'storing',
    icon: '💾',
    label: 'Store',
    activeDesc: 'Persisting to pgvector with IVFFlat index…',
    doneDesc: () => 'Indexed for cosine similarity search',
  },
  {
    key: 'done',
    icon: '✅',
    label: 'Complete',
    activeDesc: null,
    doneDesc: (_, doc) => doc ? `${doc.chunk_count} chunks ready to search` : 'Done',
  },
];

const STEP_ORDER = UPLOAD_PIPELINE.map(s => s.key);

function UploadModal({ file, step, uploadedDoc, error, onClose }) {
  const activeIdx = STEP_ORDER.indexOf(step ?? '');
  const progress = step === 'done' ? 100
    : activeIdx >= 0 ? Math.round((activeIdx / (STEP_ORDER.length - 1)) * 88)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <style>{`
        @keyframes slideUp   { from { opacity:0; transform:translateY(18px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes popIn     { 0%  { transform:scale(0.4); opacity:0 } 70% { transform:scale(1.15) } 100% { transform:scale(1); opacity:1 } }
        @keyframes fadeSlide { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fillBar   { from { width:0% } }
        .upload-modal  { animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2) both }
        .step-popin    { animation: popIn 0.35s cubic-bezier(.22,.68,0,1.2) both }
        .step-fadeslide{ animation: fadeSlide 0.2s ease-out both }
      `}</style>

      <div
        className="upload-modal bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 'min(92vw, 500px)', maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div
          className="px-6 pt-6 pb-5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #FF4800 0%, #ff6535 100%)' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
              {step === 'done' ? '✅' : error ? '⚠️' : '⚙️'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-lg leading-tight">
                {step === 'done' ? 'Upload Complete' : error ? 'Upload Failed' : 'Processing Document'}
              </p>
              <p className="text-white/70 text-xs mt-0.5 truncate">{file?.name}</p>
              <p className="text-white/50 text-[10px]">
                {(file?.size / 1024).toFixed(0)} KB · {file?.type || 'document'}
              </p>
            </div>
            {(step === 'done' || error) && (
              <button
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition-colors"
              >×</button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-5 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/55 mt-1.5">
            <span className="font-medium">RAG Pipeline</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="px-5 py-4 space-y-0.5 flex-1 overflow-y-auto">
          {UPLOAD_PIPELINE.map((s, i) => {
            // When the final 'done' step is reached, mark everything as done
            const status = (step === 'done' || i < activeIdx) ? 'done'
              : i === activeIdx ? 'active'
              : 'pending';
            const isLast = i === UPLOAD_PIPELINE.length - 1;
            const desc = status === 'active' ? s.activeDesc
              : status === 'done' ? s.doneDesc(file, uploadedDoc)
              : null;

            return (
              <div key={s.key}>
                <div
                  className={`flex items-start gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                    status === 'active'
                      ? 'bg-orange-50 border border-orange-100 shadow-sm'
                      : status === 'done'
                      ? 'bg-emerald-50/60'
                      : ''
                  }`}
                >
                  {/* Indicator */}
                  <div className="flex-shrink-0 w-9 h-9 relative">
                    {status === 'active' && (
                      <>
                        <div className="absolute inset-0 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                        <div className="absolute inset-[3px] rounded-full bg-orange-50 flex items-center justify-center text-base">
                          {s.icon}
                        </div>
                        {/* Outer pulse ring */}
                        <div className="absolute -inset-1 rounded-full border border-brand/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                      </>
                    )}
                    {status === 'done' && (
                      <div className="step-popin w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                        ✓
                      </div>
                    )}
                    {status === 'pending' && (
                      <div className="w-9 h-9 rounded-full border-2 border-wire/60 flex items-center justify-center text-base opacity-25">
                        {s.icon}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${
                        status === 'active' ? 'text-brand'
                        : status === 'done' ? 'text-emerald-700'
                        : 'text-ash/35'
                      }`}>
                        {s.label}
                      </span>
                      {status === 'active' && (
                        <span className="step-fadeslide text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-semibold">
                          Running
                        </span>
                      )}
                      {status === 'done' && (
                        <span className="step-fadeslide text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                          Done
                        </span>
                      )}
                    </div>
                    {desc && (
                      <p className={`text-xs mt-0.5 leading-snug ${
                        status === 'active' ? 'text-brand/65' : 'text-emerald-600/70'
                      }`}>
                        {desc}
                      </p>
                    )}
                    {status === 'pending' && (
                      <p className="text-xs text-ash/25 mt-0.5">Waiting…</p>
                    )}
                    {/* Embed step: show model badge */}
                    {s.key === 'embedding' && status === 'active' && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-mono font-semibold">
                          text-embedding-3-small
                        </span>
                        <span className="text-[9px] bg-wire text-ash px-1.5 py-0.5 rounded font-mono">
                          1536 dims
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                {!isLast && (
                  <div
                    className="ml-[35px] w-0.5 h-3 transition-colors duration-300"
                    style={{ background: i < activeIdx ? '#6ee7b7' : '#e5e7eb' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Error state ── */}
        {error && (
          <div className="mx-5 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex-shrink-0">
            <p className="text-xs font-semibold text-red-700">Upload failed</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Success state ── */}
        {step === 'done' && uploadedDoc && (
          <div className="px-5 pb-5 pt-2 flex-shrink-0">
            <div
              className="rounded-xl px-4 py-4 border border-emerald-200"
              style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600 text-lg">🎉</span>
                    <p className="text-sm font-bold text-emerald-800">Ready for RAG search</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg font-semibold shadow-sm">
                      {uploadedDoc.chunk_count} chunks
                    </span>
                    <span className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg font-semibold shadow-sm">
                      1536-dim embeddings
                    </span>
                    <span className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg font-semibold shadow-sm">
                      IVFFlat indexed
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-white text-sm font-bold shadow-sm transition-opacity hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: '#FF4800' }}
                >
                  Search →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PDF Viewer Modal ──────────────────────────────────────────────────────────

function PdfViewerModal({ source, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [currentPage, setCurrentPage] = useState(source.page_number || 1);
  // Set of item indices that should be highlighted on the current page
  const [highlightSet, setHighlightSet] = useState(new Set());
  const scrollRef = useRef(null);
  const fileUrl = `/api/documents/${source.document_id}/file`;

  // Normalised chunk — recompute only when source changes
  const normChunk = useMemo(() => normText(source.content), [source.content]);

  // Reset when source changes
  useEffect(() => {
    setCurrentPage(source.page_number || 1);
    setHighlightSet(new Set());
  }, [source.document_id, source.chunk_index]);

  // Reset highlights when page changes (different text items)
  useEffect(() => {
    setHighlightSet(new Set());
  }, [currentPage]);

  // Called by react-pdf when text content for the current page is ready.
  // Items arrive in the same order as customTextRenderer's itemIndex.
  const handleGetTextSuccess = useCallback(({ items }) => {
    const toHighlight = new Set();

    // Build the full page text so we can locate the chunk as a substring
    const normItems = items.map(item => normText(item.str));
    const pageText = normItems.join(' ');

    // Find approximate start position of chunk in page text
    // Try increasingly shorter prefixes to handle extraction differences
    let chunkStart = -1;
    let prefixLen = Math.min(60, normChunk.length);
    while (prefixLen >= 20 && chunkStart === -1) {
      chunkStart = pageText.indexOf(normChunk.slice(0, prefixLen));
      prefixLen -= 10;
    }

    if (chunkStart !== -1) {
      // Walk through items, tracking character positions, mark those in range
      let pos = 0;
      const chunkEnd = chunkStart + normChunk.length;
      items.forEach((item, idx) => {
        const len = normItems[idx].length;
        const itemStart = pos;
        const itemEnd = pos + len;
        // Item overlaps the chunk region
        if (itemEnd > chunkStart && itemStart < chunkEnd && len >= 2) {
          toHighlight.add(idx);
        }
        pos = itemEnd + 1; // +1 for the space we joined with
      });
    } else {
      // Fallback: highlight items whose text appears verbatim in the chunk
      items.forEach(({ str }, idx) => {
        const n = normText(str);
        if (n.length >= 5 && normChunk.includes(n)) {
          toHighlight.add(idx);
        }
      });
    }

    setHighlightSet(toHighlight);
  }, [normChunk]);

  // Auto-scroll to first highlighted mark after text layer renders
  useEffect(() => {
    if (highlightSet.size === 0) return;
    const timer = setTimeout(() => {
      const container = scrollRef.current;
      if (!container) return;
      const mark = container.querySelector('mark[data-hl]');
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [highlightSet]);

  const customTextRenderer = useCallback(({ str, itemIndex }) => {
    if (!highlightSet.has(itemIndex)) return str;
    // Escape HTML entities so the string is safe inside innerHTML
    const safe = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<mark data-hl="1" style="background:rgba(255,72,0,0.28);border-radius:2px;padding:0 1px;color:inherit;">${safe}</mark>`;
  }, [highlightSet]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 'min(92vw, 800px)', maxHeight: '92vh' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-wire flex-shrink-0"
          style={{ backgroundColor: '#FF4800' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-base">📕</span>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{source.document_name}</p>
              <p className="text-white/70 text-[10px]">
                Page {source.page_number} · chunk {source.chunk_index + 1}
                {highlightSet.size > 0 && ` · ${highlightSet.size} spans highlighted`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {numPages && numPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="w-7 h-7 rounded flex items-center justify-center text-white/80 hover:bg-white/20 disabled:opacity-30 text-sm transition-colors"
                >‹</button>
                <span className="text-white text-xs font-medium min-w-[60px] text-center">
                  {currentPage} / {numPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                  disabled={currentPage >= numPages}
                  className="w-7 h-7 rounded flex items-center justify-center text-white/80 hover:bg-white/20 disabled:opacity-30 text-sm transition-colors"
                >›</button>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/20 text-lg transition-colors"
            >×</button>
          </div>
        </div>

        {/* Chunk excerpt strip */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex-shrink-0">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-1">
            Retrieved chunk — highlighted in orange below
          </p>
          <p className="text-xs text-amber-900 italic leading-relaxed line-clamp-2">
            "{source.content.slice(0, 260)}{source.content.length > 260 ? '…' : ''}"
          </p>
        </div>

        {/* PDF viewer */}
        <div ref={scrollRef} className="overflow-auto flex-1 flex justify-center bg-gray-100 p-4">
          {pageError ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm text-ash">Could not load PDF.</p>
              <p className="text-xs text-ash/60">The file may not be stored on the server yet.<br />Try re-uploading the document.</p>
            </div>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={() => setPageError(true)}
              loading={
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-ash">Loading PDF…</p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={Math.min(720, window.innerWidth * 0.8)}
                onGetTextSuccess={handleGetTextSuccess}
                customTextRenderer={customTextRenderer}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              />
            </Document>
          )}
        </div>

        {/* Jump to source page footer */}
        {numPages && currentPage !== source.page_number && (
          <div className="px-5 py-2.5 border-t border-wire bg-fog flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-ash">Source chunk is on page {source.page_number}</span>
            <button
              onClick={() => setCurrentPage(source.page_number)}
              className="text-xs font-semibold px-3 py-1 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#FF4800' }}
            >
              Jump to page {source.page_number}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RagSearchApp() {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);   // File object for modal
  const [uploadStep, setUploadStep] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(null);
  const [result, setResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.25);
  const [algorithm, setAlgorithm] = useState('cosine');

  const [pdfViewerSource, setPdfViewerSource] = useState(null);

  const fileInputRef = useRef(null);
  const resultRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const r = await fetch('/api/documents');
      const data = await r.json();
      setDocuments(data.documents || []);
    } catch {
      // silent — empty state shown
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setUploadFile(file);
    setUploadError(null);
    setUploadedDoc(null);
    setShowUploadModal(true);

    setUploadStep('parsing');
    await new Promise(r => setTimeout(r, 500));
    setUploadStep('chunking');
    await new Promise(r => setTimeout(r, 450));
    setUploadStep('embedding');

    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/documents/upload', { method: 'POST', body: form });
      if (!r.ok) {
        const bodyText = await r.text().catch(() => '');
        let message = `Upload failed (HTTP ${r.status})`;
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed.error) message = parsed.error;
        } catch {}
        throw new Error(message);
      }
      const data = await r.json();
      setUploadStep('storing');
      await new Promise(r => setTimeout(r, 400));
      setUploadStep('done');
      setUploadedDoc(data.document);
      await fetchDocuments();
    } catch (err) {
      setUploadError(err.message);
      setUploadStep(null);
    } finally {
      setUploading(false);
    }
  }

  function closeUploadModal() {
    setShowUploadModal(false);
    setUploadStep(null);
    setUploadedDoc(null);
    setUploadError(null);
    setUploadFile(null);
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (result) setResult(null);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSearch() {
    if (!query.trim() || searching) return;

    setSearching(true);
    setResult(null);
    setSearchError(null);

    setSearchStep('embedding');
    await new Promise(r => setTimeout(r, 400));
    setSearchStep('searching');
    await new Promise(r => setTimeout(r, 300));
    setSearchStep('ranking');
    await new Promise(r => setTimeout(r, 250));
    setSearchStep('generating');

    try {
      const r = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK, threshold, algorithm }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Search failed');
      setSearchStep('done');
      setResult(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      setSearchError(err.message);
      setSearchStep(null);
    } finally {
      setSearching(false);
      setTimeout(() => setSearchStep(null), 2500);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSearch();
  }

  return (
    <>
      {showUploadModal && (
        <UploadModal
          file={uploadFile}
          step={uploadStep}
          uploadedDoc={uploadedDoc}
          error={uploadError}
          onClose={closeUploadModal}
        />
      )}
      {pdfViewerSource && (
        <PdfViewerModal
          source={pdfViewerSource}
          onClose={() => setPdfViewerSource(null)}
        />
      )}

      <div className="rounded-xl overflow-hidden border border-wire shadow-card bg-white">

        {/* Header */}
        <div style={{ backgroundColor: '#FF4800' }} className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl">
              🔍
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Document Search (RAG)</h2>
              <p className="text-white/70 text-xs">Upload · Chunk · Embed · Retrieve · Generate</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/80">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Engine</p>
              <p className="text-xs font-medium">pgvector + GPT-4o-mini</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Embeddings</p>
              <p className="text-xs font-medium">text-embedding-3-small</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[580px]">

          {/* ── Left: Documents ── */}
          <div className="border-b md:border-b-0 md:border-r border-wire p-4 flex flex-col gap-3 bg-fog/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink">Documents</p>
                <p className="text-[10px] text-ash">{documents.length} uploaded</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: uploading ? '#ccc' : '#FF4800' }}
              >
                {uploading ? 'Uploading…' : '+ Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            <p className="text-[10px] text-ash/60">Accepts PDF, DOCX, TXT — max 10 MB</p>

            {/* Document list */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[400px] md:max-h-none">
              {loadingDocs ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-wire/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8 min-h-[180px]">
                  <span className="text-3xl mb-2">📂</span>
                  <p className="text-xs text-ash leading-relaxed">
                    No documents yet.<br />
                    Upload a PDF, DOCX, or TXT<br />to get started.
                  </p>
                </div>
              ) : (
                documents.map(doc => (
                  <div
                    key={doc.id}
                    className="group relative bg-white rounded-lg p-3 border border-wire hover:border-brand/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">
                          <FileTypeIcon fileType={doc.file_type} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate" title={doc.name}>
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-ash">{doc.chunk_count} chunks</span>
                            <span className="text-ash/40">·</span>
                            <span className="text-[10px] text-ash">
                              {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-ash/30 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 text-sm"
                        title="Delete document"
                      >
                        {deletingId === doc.id ? '…' : '×'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Right: Search ── */}
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">

            {/* Query */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ash uppercase tracking-widest">Ask a question</label>
              <textarea
                rows={3}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. What are the main findings of this report?"
                disabled={searching}
                className="w-full rounded-lg border border-wire bg-fog px-4 py-3 text-sm text-ink placeholder:text-ash/40 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 resize-none disabled:opacity-60 transition-colors"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-ash/50">⌘ + Enter to search</p>
                <button
                  onClick={handleSearch}
                  disabled={searching || !query.trim() || documents.length === 0}
                  className="px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: '#FF4800' }}
                >
                  {searching ? 'Searching…' : 'Search →'}
                </button>
              </div>
              {documents.length === 0 && (
                <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                  Upload at least one document before searching.
                </p>
              )}
            </div>

            {/* Configuration */}
            <div className="rounded-xl border border-wire bg-fog p-4 space-y-4">
              <p className="text-xs font-semibold text-ash uppercase tracking-widest">Retrieval Configuration</p>

              {/* Top-K */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-ink font-medium">Top-K results</span>
                  <span className="font-bold" style={{ color: '#FF4800' }}>{topK}</span>
                </div>
                <input
                  type="range" min={1} max={10} step={1} value={topK}
                  onChange={e => setTopK(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand bg-wire"
                />
                <div className="flex justify-between text-[10px] text-ash/50 mt-1">
                  <span>1 (precise)</span><span>10 (broad)</span>
                </div>
              </div>

              {/* Similarity threshold */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-ink font-medium">Similarity threshold</span>
                  <span className="font-bold" style={{ color: '#FF4800' }}>{threshold.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05} value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand bg-wire"
                />
                <div className="flex justify-between text-[10px] text-ash/50 mt-1">
                  <span>0.00 (permissive)</span><span>1.00 (strict)</span>
                </div>
              </div>

              {/* Algorithm */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-ink">Algorithm</span>
                  <div className="flex rounded-lg border border-wire overflow-hidden">
                    {[
                      { key: 'cosine', label: 'Cosine' },
                      { key: 'mmr', label: 'MMR' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setAlgorithm(opt.key)}
                        className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                          algorithm === opt.key
                            ? 'text-white'
                            : 'bg-white text-ash hover:bg-fog'
                        }`}
                        style={algorithm === opt.key ? { backgroundColor: '#FF4800' } : {}}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-ash/60 leading-relaxed">
                  {algorithm === 'mmr'
                    ? 'MMR (Maximal Marginal Relevance) — selects relevant chunks while penalizing redundancy, ensuring diverse context coverage.'
                    : 'Cosine similarity — ranks chunks purely by vector proximity to the query. Fast and effective for focused questions.'}
                </p>
              </div>
            </div>

            {/* Search pipeline */}
            {searchStep && (
              <PipelineSteps steps={SEARCH_STEPS} activeStep={searchStep} />
            )}

            {/* Skeleton */}
            {searching && (
              <div className="space-y-2.5 animate-pulse pt-1">
                <div className="h-3 bg-wire/60 rounded w-3/4" />
                <div className="h-3 bg-wire/60 rounded w-full" />
                <div className="h-3 bg-wire/60 rounded w-5/6" />
                <div className="h-3 bg-wire/60 rounded w-2/3" />
              </div>
            )}

            {/* Error */}
            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                {searchError}
              </div>
            )}

            {/* Results */}
            {result && !searching && (
              <div className="space-y-4" ref={resultRef}>

                {/* Answer */}
                <div className="rounded-xl border border-wire bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🤖</span>
                    <p className="text-xs font-semibold text-ash uppercase tracking-widest">Answer</p>
                    {result.sources.length > 0 && (
                      <span className="ml-auto text-[10px] text-ash/60">
                        from {result.sources.length} source{result.sources.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                </div>

                {/* Sources */}
                {result.sources.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold text-ash uppercase tracking-widest">
                        Retrieved Chunks
                      </p>
                      <span className="text-[10px] text-ash/50">
                        · {algorithm === 'mmr' ? 'ranked by MMR' : 'ranked by cosine similarity'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {result.sources.map((src, i) => (
                        <div key={i} className="rounded-lg border border-wire bg-fog p-3 hover:border-brand/20 transition-colors">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-sm">
                              <FileTypeIcon fileType={src.file_type} />
                            </span>
                            <span className="text-xs font-semibold text-ink truncate max-w-[160px]" title={src.document_name}>
                              {src.document_name}
                            </span>
                            <span className="text-[10px] text-ash/60">· chunk {src.chunk_index + 1}</span>
                            {src.page_number && (
                              <span className="text-[10px] text-ash/60">· p.{src.page_number}</span>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                              <div
                                className="h-1.5 rounded-full bg-wire overflow-hidden w-14"
                                title={`${(src.similarity * 100).toFixed(1)}% similarity`}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${src.similarity * 100}%`,
                                    backgroundColor: src.similarity >= 0.8 ? '#10b981' : src.similarity >= 0.65 ? '#FF4800' : '#f59e0b',
                                  }}
                                />
                              </div>
                              <span
                                className="text-[10px] font-bold min-w-[34px] text-right"
                                style={{ color: src.similarity >= 0.8 ? '#10b981' : '#FF4800' }}
                              >
                                {(src.similarity * 100).toFixed(0)}%
                              </span>
                              {src.file_type === 'pdf' && (
                                <button
                                  onClick={() => setPdfViewerSource(src)}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors flex-shrink-0"
                                  style={{ color: '#FF4800', borderColor: '#FF480040' }}
                                  title={`Open PDF at page ${src.page_number}`}
                                >
                                  View 📄
                                </button>
                              )}
                            </div>
                          </div>
                          <blockquote
                            className="text-xs text-ash leading-relaxed border-l-2 pl-2.5 italic line-clamp-3"
                            style={{ borderColor: '#FF4800', opacity: 0.85 }}
                          >
                            "{src.content.slice(0, 300)}{src.content.length > 300 ? '…' : ''}"
                          </blockquote>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Welcome empty state */}
            {!result && !searching && !searchError && !searchStep && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 min-h-[180px]">
                <span className="text-4xl mb-3 opacity-40">🔍</span>
                <p className="text-sm text-ash/60 max-w-xs leading-relaxed">
                  Upload a document and ask a natural language question — the RAG pipeline will retrieve the most relevant chunks and generate a cited answer.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
