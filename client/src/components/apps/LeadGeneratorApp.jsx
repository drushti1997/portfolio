import { useState, useEffect, useRef } from 'react';

const STATUS_STYLES = {
  hot:       'bg-red-500/10 text-red-400 border-red-500/20',
  warm:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cold:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  new:       'bg-gray-700/50 text-gray-400 border-gray-700',
  converted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const ACTIVITY_ICONS = {
  email_sent:       { icon: '📤', label: 'Email Sent',     color: 'text-blue-400' },
  email_reply:      { icon: '📩', label: 'Email Reply',    color: 'text-emerald-400' },
  call:             { icon: '📞', label: 'Call',           color: 'text-purple-400' },
  follow_up:        { icon: '🔄', label: 'Follow-up',      color: 'text-amber-400' },
  demo:             { icon: '🖥️', label: 'Demo',           color: 'text-indigo-400' },
  no_show:          { icon: '🚫', label: 'No-show',        color: 'text-red-400' },
  linkedin_message: { icon: '💼', label: 'LinkedIn',       color: 'text-sky-400' },
  meeting:          { icon: '🤝', label: 'Meeting',        color: 'text-teal-400' },
  site_visit:       { icon: '🏗️', label: 'Site Visit',     color: 'text-orange-400' },
  sample_request:   { icon: '📦', label: 'Sample Request', color: 'text-cyan-400' },
  quote_sent:       { icon: '📋', label: 'Quote Sent',     color: 'text-violet-400' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-white">{value || '—'}</p>
    </div>
  );
}

function ScoreRing({ score }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? '#f87171' : score >= 60 ? '#fbbf24' : score >= 40 ? '#60a5fa' : '#6b7280';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
          transform="rotate(-90 48 48)" />
        <text x="48" y="53" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-xs text-gray-500">AI Score</span>
    </div>
  );
}

function FactorBar({ label, score }) {
  const color = score >= 80 ? 'bg-red-400' : score >= 60 ? 'bg-amber-400' : score >= 40 ? 'bg-blue-400' : 'bg-gray-600';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="text-gray-300">{score}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── Chatbot ───────────────────────────────────────────────────────────────────

function Chatbot({ lead }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: lead
        ? `Hi! Ask me about ${lead.name}'s latest activity, their AI score, or what to do next.`
        : 'Hi! Open a lead to start asking questions about them.',
    }]);
    setInput('');
  }, [lead?.id]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading || !lead) return;
    const text = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch(`/api/leads/${lead.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to reach the AI assistant.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {open && (
        <div className="w-80 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl flex flex-col" style={{ height: 420 }}>
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-sm font-semibold text-white">AI Lead Assistant</p>
              {lead
                ? <p className="text-xs text-gray-500">{lead.name} · {lead.company}</p>
                : <p className="text-xs text-gray-600">No lead selected</p>
              }
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400 text-xl leading-none">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-4 py-3">
                  <span className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-gray-800 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={lead ? 'Ask about this lead…' : 'Select a lead first'}
                disabled={!lead || loading}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 transition-colors"
              />
              <button
                onClick={send}
                disabled={!lead || !input.trim() || loading}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-xl flex items-center justify-center text-white transition-colors"
        title="AI Lead Assistant"
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}

// ── Lead List View ────────────────────────────────────────────────────────────

function LeadList({ leads, loading, onSelect, sortAlpha, onToggleSort }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Leads</h2>
          {!loading && (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{leads.length}</span>
          )}
        </div>
        <button
          onClick={onToggleSort}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            sortAlpha
              ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
              : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          A–Z
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          <div className="grid px-4 py-2 text-xs text-gray-600 font-medium uppercase tracking-wider"
            style={{ gridTemplateColumns: '2fr 2fr 2fr 1fr 60px' }}>
            <span>Name</span>
            <span>Company</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-right">Score</span>
          </div>
          <div className="space-y-1.5">
            {leads.map(lead => (
              <button
                key={lead.id}
                onClick={() => onSelect(lead)}
                className="w-full grid items-center px-4 py-3.5 rounded-xl border border-gray-800 hover:border-gray-600 bg-gray-900/30 hover:bg-gray-800/40 text-left transition-all"
                style={{ gridTemplateColumns: '2fr 2fr 2fr 1fr 60px' }}
              >
                <span className="text-sm font-medium text-white">{lead.name}</span>
                <span className="text-sm text-gray-400 truncate pr-4">{lead.company}</span>
                <span className="text-sm text-gray-500 truncate pr-4">{lead.role}</span>
                <span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[lead.status] || STATUS_STYLES.new}`}>
                    {lead.status}
                  </span>
                </span>
                <span className={`text-right text-xs font-bold ${
                  lead.score != null
                    ? lead.score >= 80 ? 'text-red-400' : lead.score >= 60 ? 'text-amber-400' : 'text-blue-400'
                    : 'text-gray-700'
                }`}>
                  {lead.score != null ? lead.score : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lead Detail View ──────────────────────────────────────────────────────────

function LeadDetail({ leadSummary, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leads/${leadSummary.id}`)
      .then(r => r.json())
      .then(data => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leadSummary.id]);

  const handleScore = async () => {
    if (scoring) return;
    setScoring(true);
    setScoreError(null);
    try {
      const r = await fetch(`/api/leads/${leadSummary.id}/score`, { method: 'POST' });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Scoring failed'); }
      setDetail(await r.json());
    } catch (e) {
      setScoreError(e.message);
    } finally {
      setScoring(false);
    }
  };

  const breakdown = detail?.score_breakdown;
  const factors = breakdown?.factors || null;
  const nextStepsList = breakdown?.next_steps
    || (detail?.next_steps ? detail.next_steps.split('\n').filter(Boolean) : []);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
        </svg>
        Leads
      </button>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-32 bg-gray-800 rounded" />
          <div className="h-48 bg-gray-800 rounded" />
        </div>
      ) : detail ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-2xl font-bold text-white">{detail.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[detail.status] || STATUS_STYLES.new}`}>
                  {detail.status}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{detail.role} · {detail.company}</p>
            </div>
            <button
              onClick={handleScore}
              disabled={scoring}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            >
              {scoring ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Analyzing…
                </>
              ) : detail.score != null ? 'Re-score with AI' : 'Score with AI'}
            </button>
          </div>

          {scoreError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{scoreError}</p>
          )}

          {/* Info fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 p-5 rounded-xl border border-gray-800 bg-gray-900/30">
            <Field label="Company" value={detail.company} />
            <Field label="Email" value={detail.email} />
            <Field label="Phone" value={detail.phone} />
            <Field label="Role" value={detail.role} />
            <Field label="Source" value={detail.source} />
            <Field label="Added" value={new Date(detail.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
          </div>

          {/* Score breakdown */}
          {detail.score != null && breakdown && (
            <div className="p-5 rounded-xl border border-gray-800 bg-gray-900/30">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">AI Score</h3>
              <div className="flex gap-6 items-start">
                <ScoreRing score={detail.score} />
                <div className="flex-1 space-y-3">
                  {factors && Object.entries(factors).map(([key, val]) => (
                    <FactorBar key={key} label={key} score={val.score} />
                  ))}
                </div>
              </div>
              {breakdown.summary && (
                <p className="mt-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-4">{breakdown.summary}</p>
              )}
            </div>
          )}

          {/* Next steps */}
          {nextStepsList.length > 0 && (
            <div className="p-5 rounded-xl border border-gray-800 bg-gray-900/30">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Next Steps</h3>
              <ol className="space-y-2">
                {nextStepsList.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-medium mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Activity timeline */}
          <div className="p-5 rounded-xl border border-gray-800 bg-gray-900/30">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Interaction History</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />
              <div className="space-y-5">
                {detail.activities.map((a) => {
                  const meta = ACTIVITY_ICONS[a.type] || { icon: '•', label: a.type, color: 'text-gray-400' };
                  const date = new Date(a.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div key={a.id} className="flex gap-4 pl-1">
                      <div className="relative z-10 w-6 h-6 flex-shrink-0 flex items-center justify-center bg-gray-900 text-base">
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs text-gray-600">{date}</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{a.notes}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-sm">Failed to load lead details.</p>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LeadGeneratorApp() {
  const [leads, setLeads] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sortAlpha, setSortAlpha] = useState(false);

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => { setLeads(data); setLoadingList(false); })
      .catch(() => setLoadingList(false));
  }, []);

  const displayLeads = sortAlpha
    ? [...leads].sort((a, b) => a.name.localeCompare(b.name))
    : leads;

  return (
    <>
      <div className="min-h-[500px]">
        {selectedLead ? (
          <LeadDetail
            leadSummary={selectedLead}
            onBack={() => setSelectedLead(null)}
          />
        ) : (
          <LeadList
            leads={displayLeads}
            loading={loadingList}
            onSelect={setSelectedLead}
            sortAlpha={sortAlpha}
            onToggleSort={() => setSortAlpha(s => !s)}
          />
        )}
      </div>
      <Chatbot lead={selectedLead} />
    </>
  );
}
