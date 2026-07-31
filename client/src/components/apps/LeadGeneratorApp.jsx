import { useState, useEffect, useRef } from 'react';

const STATUS_STYLES = {
  hot:       'bg-red-50 text-red-600 border-red-200',
  warm:      'bg-amber-50 text-amber-600 border-amber-200',
  cold:      'bg-blue-50 text-blue-600 border-blue-200',
  new:       'bg-fog text-ash border-wire',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const ACTIVITY_ICONS = {
  email_sent:       { icon: '📤', label: 'Email Sent',     color: 'text-blue-600' },
  email_reply:      { icon: '📩', label: 'Email Reply',    color: 'text-emerald-600' },
  call:             { icon: '📞', label: 'Call',           color: 'text-purple-600' },
  follow_up:        { icon: '🔄', label: 'Follow-up',      color: 'text-amber-600' },
  demo:             { icon: '🖥️', label: 'Demo',           color: 'text-brand' },
  no_show:          { icon: '🚫', label: 'No-show',        color: 'text-red-600' },
  linkedin_message: { icon: '💼', label: 'LinkedIn',       color: 'text-sky-600' },
  meeting:          { icon: '🤝', label: 'Meeting',        color: 'text-teal-600' },
  site_visit:       { icon: '🏗️', label: 'Site Visit',     color: 'text-orange-600' },
  sample_request:   { icon: '📦', label: 'Sample Request', color: 'text-cyan-700' },
  quote_sent:       { icon: '📋', label: 'Quote Sent',     color: 'text-violet-600' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ash uppercase tracking-wide mb-0.5 font-medium">{label}</p>
      <p className="text-sm text-ink font-medium">{value || '—'}</p>
    </div>
  );
}

function ContactField({ label, value, href }) {
  return (
    <div>
      <p className="text-xs text-ash uppercase tracking-wide mb-0.5 font-medium">{label}</p>
      <a href={href} className="text-sm text-brand hover:text-brand-hover underline underline-offset-2 transition-colors font-medium">
        {value}
      </a>
    </div>
  );
}

function PipelineStrip({ status }) {
  const stages = ['New', 'Not Contacted', 'Contacted', 'Converted'];
  const statusIndex = { new: 0, cold: 1, hot: 2, warm: 2, converted: 3 };
  const active = statusIndex[status] ?? 0;
  return (
    <div className="flex items-center gap-0">
      {stages.map((label, i) => {
        const isPast   = i < active;
        const isActive = i === active;
        const isFuture = i > active;
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                isActive ? 'border-brand' :
                isPast   ? 'border-brand/40' :
                           'bg-transparent border-wire'
              }`} style={isActive ? { background: '#FF4800' } : isPast ? { background: '#FF480066' } : {}} />
              <span className={`text-[10px] whitespace-nowrap font-semibold ${
                isActive ? 'text-brand' : isPast ? 'text-brand/60' : 'text-ash/60'
              }`}>{label}</span>
            </div>
            {i < stages.length - 1 && (
              <div className={`h-px flex-1 mx-1 mb-3.5 ${isPast || isActive ? 'bg-brand/20' : 'bg-wire'}`} />
            )}
          </div>
        );
      })}
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
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#E0D9CE" strokeWidth="8" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round"
          transform="rotate(-90 48 48)" />
        <text x="48" y="53" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-xs text-ash font-semibold uppercase tracking-wide">AI Score</span>
    </div>
  );
}

function FactorBar({ label, score, reason }) {
  const color = score >= 80 ? 'bg-red-400' : score >= 60 ? 'bg-amber-400' : score >= 40 ? 'bg-blue-400' : 'bg-dust/40';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-ink font-semibold capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="text-ink font-bold">{score}</span>
      </div>
      <div className="h-1.5 bg-wire rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      {reason && (
        <p className="text-xs text-ash italic mt-1 leading-relaxed">{reason}</p>
      )}
    </div>
  );
}

// ── Chatbot ───────────────────────────────────────────────────────────────────

function renderMarkdown(text) {
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
  return { __html: html };
}

function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hi! I'm your Sales AI Assistant. Which lead would you like information on? You can provide their full name or email address.",
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [scoring, setScoring] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('/api/leads/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
      if (data.activeLead) setActiveLead(data.activeLead);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to reach the AI assistant.' }]);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async () => {
    if (!activeLead || scoring) return;
    setScoring(true);
    try {
      const r = await fetch(`/api/leads/${activeLead.id}/score`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Scoring failed');
      const score = data.score;
      const summary = data.score_breakdown?.summary || '';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **AI Score calculated!**\n\n**${activeLead.name}** scored **${score}/100**.\n\n${summary}\n\nThe full score breakdown and next steps are now visible on their lead profile.`,
      }]);
      setActiveLead(prev => ({ ...prev, isScored: true }));
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Failed to calculate score: ${e.message}` }]);
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {open && (
        <div className="w-96 rounded-2xl border border-wire bg-white shadow-2xl flex flex-col overflow-hidden" style={{ height: 500 }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ background: '#FF4800' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-bold text-white">Sales AI Assistant</p>
                <p className="text-xs text-white/70">Lead Information</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-2xl leading-none font-light">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#F8F5EE' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <span className="text-base mr-2 flex-shrink-0 mt-1">🤖</span>
                )}
                {m.role === 'user' ? (
                  <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed text-white font-medium rounded-br-sm" style={{ background: '#FF4800' }}>
                    {m.content}
                  </div>
                ) : (
                  <div
                    className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed bg-white text-ink border border-wire rounded-bl-sm shadow-sm"
                    dangerouslySetInnerHTML={renderMarkdown(m.content)}
                  />
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start items-end gap-2">
                <span className="text-base">🤖</span>
                <div className="bg-white border border-wire rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <span className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-ash/50 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Score CTA */}
          {activeLead && !activeLead.isScored && !loading && (
            <div className="px-3 pt-2 pb-1 flex-shrink-0" style={{ background: '#F8F5EE' }}>
              <button
                onClick={calculateScore}
                disabled={scoring}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                style={{ background: '#FF4800' }}
              >
                {scoring ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                    </svg>
                    Calculating…
                  </>
                ) : (
                  <>🧮 Calculate AI Score for {activeLead.name.split(' ')[0]}</>
                )}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-wire bg-white flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Type a message…"
                disabled={loading}
                className="flex-1 bg-fog border border-wire rounded-xl px-3 py-2 text-sm text-ink placeholder-ash/60 focus:outline-none disabled:opacity-40 transition-colors"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ background: '#FF4800' }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-4 border-white"
        style={{ background: '#FF4800' }}
        title="Sales AI Assistant"
      >
        {open
          ? <span className="text-white text-2xl font-light leading-none">×</span>
          : <span className="text-3xl">🤖</span>
        }
      </button>
    </div>
  );
}

// ── Lead List View (Salesforce Lightning style) ───────────────────────────────

const SF_NAVY  = '#1A1A1A';
const SF_BLUE  = '#FF4800';
const SF_BORDER = '#E0D9CE';
const SF_TEXT  = '#1A1A1A';
const SF_MUTED = '#5A5A5A';

const STATUS_LABEL = {
  hot:       'Working – Contacted',
  warm:      'Working – Contacted',
  cold:      'Open – Not Contacted',
  new:       'New',
  converted: 'Converted',
};

function sourceLabel(src) {
  if (!src) return '—';
  return src.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function SortChevron({ active, dir }) {
  if (!active) {
    return (
      <svg className="inline-block w-3 h-3 ml-0.5 opacity-30" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 8l5-5 5 5H5zm0 4l5 5 5-5H5z" />
      </svg>
    );
  }
  return dir === 'asc' ? (
    <svg className="inline-block w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 12l5-5 5 5H5z" />
    </svg>
  ) : (
    <svg className="inline-block w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M15 8l-5 5-5-5h10z" />
    </svg>
  );
}

function fakeEmail(lead) {
  const parts = lead.name.trim().split(' ');
  const first = parts[0].toLowerCase();
  const last  = (parts[parts.length - 1] || first).toLowerCase();
  const domain = lead.company.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 14) || 'company';
  return `${first}.${last}@${domain}.com`;
}

function fakePhone(lead) {
  const seed = lead.id || 1;
  const area  = 200 + (seed * 73)  % 800;
  const mid   = 100 + (seed * 137) % 900;
  const last4 = 1000 + (seed * 9871) % 9000;
  return `(${area}) ${mid}-${last4}`;
}

function LeadList({ leads, loading, onSelect }) {
  const [activeStat, setActiveStat] = useState('Total Leads');
  const [sortCol,    setSortCol]    = useState(null);
  const [sortDir,    setSortDir]    = useState('asc');
  const [toast,      setToast]      = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const totalLeads = leads.length;
  const noActivity = leads.filter(l => l.score == null).length;

  const STATS = [
    { label: 'Total Leads', value: totalLeads, filter: ()  => true            },
    { label: 'No Activity', value: noActivity, filter: l   => l.score == null, info: true },
    { label: 'Idle',        value: 0,          filter: ()  => false,           info: true },
    { label: 'No Upcoming', value: 0,          filter: ()  => false,           info: true },
    { label: 'Overdue',     value: 0,          filter: ()  => false            },
    { label: 'Due Today',   value: 0,          filter: ()  => false            },
    { label: 'Upcoming',    value: 0,          filter: ()  => false,           info: true },
  ];

  const activeDef = STATS.find(s => s.label === activeStat);
  let visibleLeads = activeDef ? leads.filter(activeDef.filter) : leads;

  function getSortValue(lead, col) {
    switch (col) {
      case 'name':    return lead.name?.toLowerCase()                           || '';
      case 'title':   return lead.role?.toLowerCase()                           || '';
      case 'company': return lead.company?.toLowerCase()                        || '';
      case 'status':  return (STATUS_LABEL[lead.status] || lead.status || '').toLowerCase();
      case 'source':  return sourceLabel(lead.source).toLowerCase();
      case 'score':   return lead.score ?? -1;
      default:        return '';
    }
  }

  if (sortCol) {
    visibleLeads = [...visibleLeads].sort((a, b) => {
      const va = getSortValue(a, sortCol);
      const vb = getSortValue(b, sortCol);
      const cmp = typeof va === 'number' ? va - vb : va.localeCompare(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function ColHeader({ col, children }) {
    const active = sortCol === col;
    return (
      <th
        className="px-3 py-2.5 text-left text-xs font-semibold cursor-pointer hover:bg-gray-200 transition-colors select-none"
        style={{ color: active ? SF_BLUE : SF_MUTED }}
        onClick={() => handleSort(col)}
      >
        {children} <SortChevron active={active} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 600 }}>

      {/* ── Header bar ───────────────────────────────────────────── */}
      <div className="flex items-center px-4 py-2.5 flex-shrink-0" style={{ background: SF_NAVY }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#FF4800' }}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs leading-none" style={{ color: 'rgba(255,255,255,0.6)' }}>Leads</p>
            <div className="flex items-center mt-0.5">
              <span className="text-sm font-semibold text-white">My Leads</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-3" style={{ background: SF_BLUE }}>
        {/* Filter row */}
        <div className="flex items-center justify-end gap-2 py-2 mb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Created</span>
          <span className="text-xs text-white px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>Last Month</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Owner</span>
          <span className="text-xs text-white px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>Me</span>
        </div>
        {/* Stat tiles — clickable toggles */}
        <div className="flex gap-1">
          {STATS.map(({ label, value, info }) => {
            const isActive = activeStat === label;
            return (
              <button
                key={label}
                onClick={() => setActiveStat(label)}
                className="flex-1 rounded px-2 py-1.5 text-center transition-colors"
                style={{ background: isActive ? '#E03E00' : 'rgba(255,255,255,0.15)' }}
              >
                <p className="text-white leading-none mb-1" style={{ fontSize: 10, opacity: isActive ? 1 : 0.75 }}>
                  {label}
                </p>
                <p className="text-base font-bold text-white leading-none">{value}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 bg-white p-6 space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 rounded animate-pulse" style={{ background: '#F3F3F3' }} />)}
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#F8F5EE', borderBottom: `2px solid ${SF_BORDER}` }}>
                <th className="w-8 px-3 py-2.5" />
                <ColHeader col="name">Name</ColHeader>
                <ColHeader col="title">Title</ColHeader>
                <ColHeader col="company">Company</ColHeader>
                <ColHeader col="status">Lead Status</ColHeader>
                <ColHeader col="source">Lead Source</ColHeader>
                <ColHeader col="score">AI Score</ColHeader>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: SF_MUTED }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm" style={{ color: SF_MUTED }}>
                    No leads match this filter.
                  </td>
                </tr>
              ) : visibleLeads.map((lead, i) => (
                <tr
                  key={lead.id}
                  style={{ borderBottom: `1px solid ${SF_BORDER}`, background: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF3EE'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <td className="px-3 py-2.5 text-xs text-center tabular-nums" style={{ color: SF_MUTED }}>{i + 1}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <button onClick={() => onSelect(lead)} className="font-medium hover:underline text-left" style={{ color: SF_BLUE }}>
                      {lead.name}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: SF_TEXT }}>{lead.role || '—'}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: SF_TEXT }}>{lead.company}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: SF_TEXT }}>{STATUS_LABEL[lead.status] || lead.status}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: SF_TEXT }}>{sourceLabel(lead.source)}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {lead.score != null
                      ? <span className="font-bold" style={{ color: lead.score >= 80 ? '#C23934' : lead.score >= 60 ? '#E07B39' : '#FF4800' }}>{lead.score}</span>
                      : <span style={{ color: SF_MUTED }}>—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 rounded hover:bg-orange-50 transition-colors"
                        title={`Email ${fakeEmail(lead)}`}
                        onClick={() => {
                          window.location.href = `mailto:${fakeEmail(lead)}`;
                          showToast(`✉ ${fakeEmail(lead)}`);
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: SF_MUTED }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded hover:bg-orange-50 transition-colors"
                        title={`Call ${fakePhone(lead)}`}
                        onClick={() => {
                          window.location.href = `tel:${fakePhone(lead).replace(/\D/g, '')}`;
                          showToast(`📞 ${fakePhone(lead)}`);
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: SF_MUTED }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: '#1A1A1A',
            color: '#F8F5EE',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            borderLeft: '3px solid #FF4800',
            maxWidth: '320px',
          }}
        >
          {toast}
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
        className="flex items-center gap-1.5 text-ash hover:text-ink text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
        </svg>
        Leads
      </button>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-wire rounded w-1/3" />
          <div className="h-32 bg-wire rounded" />
          <div className="h-48 bg-wire rounded" />
        </div>
      ) : detail ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="font-bold text-ink text-2xl">{detail.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[detail.status] || STATUS_STYLES.new}`}>
                  {detail.status}
                </span>
              </div>
              <p className="text-ash text-sm font-medium">{detail.role} · {detail.company}</p>
            </div>
            <button
              onClick={handleScore}
              disabled={scoring}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: '#FF4800' }}
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
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{scoreError}</p>
          )}

          {/* Pipeline strip */}
          <div className="px-5 py-4 rounded-xl border border-wire bg-white">
            <PipelineStrip status={detail.status} />
          </div>

          {/* Info fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 p-5 rounded-xl border border-wire bg-white">
            <Field label="Company" value={detail.company} />
            <ContactField label="Email" value={fakeEmail(detail)} href={`mailto:${fakeEmail(detail)}`} />
            <ContactField label="Phone" value={fakePhone(detail)} href={`tel:${fakePhone(detail).replace(/\D/g, '')}`} />
            <Field label="Role" value={detail.role} />
            <Field label="Source" value={sourceLabel(detail.source)} />
            <Field label="Added" value={new Date(detail.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
          </div>

          {/* Score breakdown */}
          {detail.score != null && breakdown && (
            <div className="p-5 rounded-xl border border-wire bg-white">
              <h3 className="text-xs font-bold text-ash uppercase tracking-wider mb-4">AI Score</h3>
              <div className="flex gap-6 items-start">
                <ScoreRing score={detail.score} />
                <div className="flex-1 space-y-4">
                  {factors && Object.entries(factors).map(([key, val]) => (
                    <FactorBar key={key} label={key} score={val.score} reason={val.reason} />
                  ))}
                </div>
              </div>
              {breakdown.summary && (
                <p className="mt-4 text-sm text-ash leading-relaxed border-t border-wire pt-4">{breakdown.summary}</p>
              )}
            </div>
          )}

          {/* Next steps */}
          {nextStepsList.length > 0 && (
            <div className="p-5 rounded-xl border border-wire bg-white">
              <h3 className="text-xs font-bold text-ash uppercase tracking-wider mb-3">Recommended Next Steps</h3>
              <ol className="space-y-2">
                {nextStepsList.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold mt-0.5" style={{ background: '#FF4800' }}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Activity timeline */}
          <div className="p-5 rounded-xl border border-wire bg-white">
            <h3 className="text-xs font-bold text-ash uppercase tracking-wider mb-4">Interaction History</h3>
            {detail.activities.length === 0 ? (
              <p className="text-sm text-ash pl-1">No recorded interactions yet.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-wire" />
                <div className="space-y-5">
                  {detail.activities.map((a) => {
                    const meta = ACTIVITY_ICONS[a.type] || { icon: '•', label: a.type, color: 'text-ash' };
                    return (
                      <div key={a.id} className="flex gap-4 pl-1">
                        <div className="relative z-10 w-6 h-6 flex-shrink-0 flex items-center justify-center bg-fog text-base rounded-full">
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                            <span className="text-xs text-ash font-medium">{relativeTime(a.occurred_at)}</span>
                          </div>
                          <p className="text-sm text-ink leading-relaxed">{a.notes}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-ash text-sm">Failed to load lead details.</p>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LeadGeneratorApp() {
  const [leads, setLeads] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => { setLeads(data); setLoadingList(false); })
      .catch(() => setLoadingList(false));
  }, []);

  return (
    <>
      {selectedLead ? (
        <div className="p-8 min-h-[500px] bg-fog">
          <LeadDetail
            leadSummary={selectedLead}
            onBack={() => setSelectedLead(null)}
          />
        </div>
      ) : (
        <LeadList
          leads={leads}
          loading={loadingList}
          onSelect={setSelectedLead}
        />
      )}
      <Chatbot />
    </>
  );
}
