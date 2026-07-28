import { useState, useEffect, useCallback } from 'react';

const STATUS_STYLES = {
  hot:       'bg-red-500/10 text-red-400 border-red-500/20',
  warm:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cold:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  new:       'bg-gray-700/50 text-gray-400 border-gray-700',
  converted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const ACTIVITY_ICONS = {
  email_sent:       { icon: '📤', label: 'Email Sent',       color: 'text-blue-400' },
  email_reply:      { icon: '📩', label: 'Email Reply',      color: 'text-emerald-400' },
  call:             { icon: '📞', label: 'Call',             color: 'text-purple-400' },
  follow_up:        { icon: '🔄', label: 'Follow-up',        color: 'text-amber-400' },
  demo:             { icon: '🖥️', label: 'Demo',             color: 'text-indigo-400' },
  no_show:          { icon: '🚫', label: 'No-show',          color: 'text-red-400' },
  linkedin_message: { icon: '💼', label: 'LinkedIn',         color: 'text-sky-400' },
  meeting:          { icon: '🤝', label: 'Meeting',          color: 'text-teal-400' },
};

function ScoreRing({ score }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? '#f87171' : score >= 60 ? '#fbbf24' : score >= 40 ? '#60a5fa' : '#6b7280';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="53" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>
          {score}
        </text>
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
        <span className="text-gray-400 capitalize">{label.replace('_', ' ')}</span>
        <span className="text-gray-300">{score}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function LeadCard({ lead, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
        selected
          ? 'border-indigo-500/50 bg-indigo-500/5'
          : 'border-gray-800 hover:border-gray-700 bg-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{lead.name}</p>
          <p className="text-xs text-gray-500 truncate">{lead.role} · {lead.company}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[lead.status] || STATUS_STYLES.new}`}>
            {lead.status}
          </span>
          {lead.score != null && (
            <span className={`text-xs font-bold ${
              lead.score >= 80 ? 'text-red-400' : lead.score >= 60 ? 'text-amber-400' : 'text-blue-400'
            }`}>
              {lead.score}/100
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function LeadGeneratorApp() {
  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState(null);

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => { setLeads(data); setLoadingList(false); })
      .catch(() => setLoadingList(false));
  }, []);

  const selectLead = useCallback((id) => {
    setSelectedId(id);
    setDetail(null);
    setScoreError(null);
    setLoadingDetail(true);
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoadingDetail(false); })
      .catch(() => setLoadingDetail(false));
  }, []);

  const handleScore = async () => {
    if (!selectedId || scoring) return;
    setScoring(true);
    setScoreError(null);
    try {
      const r = await fetch(`/api/leads/${selectedId}/score`, { method: 'POST' });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || 'Scoring failed');
      }
      const data = await r.json();
      setDetail(data);
      setLeads((prev) => prev.map((l) => l.id === selectedId ? { ...l, score: data.score } : l));
    } catch (e) {
      setScoreError(e.message);
    } finally {
      setScoring(false);
    }
  };

  const breakdown = detail?.score_breakdown;
  const factors = breakdown?.factors || null;
  const nextStepsList = breakdown?.next_steps || (detail?.next_steps ? detail.next_steps.split('\n').filter(Boolean) : []);

  return (
    <div className="flex gap-0 h-full min-h-[600px] -m-8 overflow-hidden rounded-xl">
      {/* Left: Lead list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Leads</h2>
          {!loadingList && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{leads.length}</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingList ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-800/50 rounded-lg animate-pulse" />
            ))
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                selected={lead.id === selectedId}
                onClick={() => selectLead(lead.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Detail panel */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-gray-400 text-sm">Select a lead to view their interaction history and AI score</p>
          </div>
        ) : loadingDetail ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-800 rounded w-1/3" />
            <div className="h-4 bg-gray-800 rounded w-1/2" />
            <div className="h-24 bg-gray-800 rounded" />
          </div>
        ) : detail ? (
          <>
            {/* Lead header */}
            <div className="px-6 py-5 border-b border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{detail.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[detail.status] || STATUS_STYLES.new}`}>
                      {detail.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{detail.role} · {detail.company}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{detail.email}</p>
                </div>

                <button
                  onClick={handleScore}
                  disabled={scoring}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {scoring ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                      Analyzing…
                    </span>
                  ) : detail.score != null ? 'Re-score with AI' : 'Score with AI'}
                </button>
              </div>
              {scoreError && (
                <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5">{scoreError}</p>
              )}
            </div>

            {/* Score + breakdown */}
            {detail.score != null && breakdown && (
              <div className="px-6 py-5 border-b border-gray-800">
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
              <div className="px-6 py-5 border-b border-gray-800">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Next Steps</h4>
                <ol className="space-y-2">
                  {nextStepsList.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-medium mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Activity timeline */}
            <div className="px-6 py-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Interaction History</h4>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />
                <div className="space-y-5">
                  {detail.activities.map((a) => {
                    const meta = ACTIVITY_ICONS[a.type] || { icon: '•', label: a.type, color: 'text-gray-400' };
                    const date = new Date(a.occurred_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    });
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
        ) : null}
      </div>
    </div>
  );
}
