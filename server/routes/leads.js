const express = require('express');
const router = express.Router();
const db = require('../db');
const OpenAI = require('openai');

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, company, role, email, phone, source, status, score, scored_at, created_at FROM leads ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [leadResult, activitiesResult] = await Promise.all([
      db.query('SELECT * FROM leads WHERE id = $1', [id]),
      db.query(
        'SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY occurred_at ASC',
        [id]
      ),
    ]);
    if (!leadResult.rows.length) return res.status(404).json({ error: 'Lead not found' });
    res.json({ ...leadResult.rows[0], activities: activitiesResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    const [leadResult, activitiesResult] = await Promise.all([
      db.query('SELECT * FROM leads WHERE id = $1', [id]),
      db.query(
        'SELECT type, notes, occurred_at FROM lead_activities WHERE lead_id = $1 ORDER BY occurred_at ASC',
        [id]
      ),
    ]);
    if (!leadResult.rows.length) return res.status(404).json({ error: 'Lead not found' });

    const lead = leadResult.rows[0];
    const activities = activitiesResult.rows;

    const activityList = activities
      .map((a) => {
        const date = new Date(a.occurred_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        return `- [${date}] ${a.type.replace(/_/g, ' ').toUpperCase()}: ${a.notes}`;
      })
      .join('\n');

    const prompt = `You are an expert construction industry sales coach analyzing lead quality for a roofing materials manufacturer. Our customers are general contractors, commercial builders, and construction companies purchasing TPO, EPDM, metal roofing, and modified bitumen systems. Score this lead and recommend next steps.

LEAD PROFILE
Name: ${lead.name}
Company: ${lead.company}
Role: ${lead.role}
Email: ${lead.email}
Current Status: ${lead.status}

INTERACTION HISTORY (chronological)
${activityList}

Analyze this lead's history and return a JSON object with EXACTLY this structure (no markdown, no explanation — raw JSON only):
{
  "score": <integer 0-100>,
  "factors": {
    "engagement": { "score": <0-100>, "reason": "<one sentence>" },
    "recency": { "score": <0-100>, "reason": "<one sentence>" },
    "intent": { "score": <0-100>, "reason": "<one sentence>" },
    "deal_potential": { "score": <0-100>, "reason": "<one sentence>" },
    "momentum": { "score": <0-100>, "reason": "<one sentence>" }
  },
  "next_steps": ["<action 1>", "<action 2>", "<action 3>"],
  "summary": "<2-3 sentence assessment of this lead>"
}

Score definitions:
- 80-100: Hot — ready to order, prioritize immediately
- 60-79: Warm — strong signals, active follow-up required
- 40-59: Lukewarm — some interest but obstacles present
- 20-39: Cold — minimal engagement, low conversion probability
- 0-19: Dead — re-engage only if pipeline is empty

Return ONLY the JSON object.`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error('No text response from OpenAI');

    let scoring;
    try {
      const raw = text.trim();
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      scoring = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch {
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    await db.query(
      `UPDATE leads
       SET score = $1, score_breakdown = $2, next_steps = $3, scored_at = NOW()
       WHERE id = $4`,
      [scoring.score, JSON.stringify(scoring), scoring.next_steps.join('\n'), id]
    );

    const [updated, updatedActivities] = await Promise.all([
      db.query('SELECT * FROM leads WHERE id = $1', [id]),
      db.query(
        'SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY occurred_at ASC',
        [id]
      ),
    ]);

    res.json({ ...updated.rows[0], activities: updatedActivities.rows, scoring });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Scoring failed' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const [leadsResult, activitiesResult] = await Promise.all([
      db.query('SELECT * FROM leads ORDER BY created_at ASC'),
      db.query('SELECT * FROM lead_activities ORDER BY lead_id, occurred_at ASC'),
    ]);

    const activitiesByLead = {};
    for (const act of activitiesResult.rows) {
      if (!activitiesByLead[act.lead_id]) activitiesByLead[act.lead_id] = [];
      activitiesByLead[act.lead_id].push(act);
    }

    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const buildLeadBlock = (lead) => {
      const leadActs = (activitiesByLead[lead.id] || []).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
      const latest = leadActs[0];
      const latestText = latest
        ? `[${formatDate(latest.occurred_at)}] ${latest.type.replace(/_/g, ' ')}: ${latest.notes}`
        : 'No activities recorded';
      const historyLines = leadActs
        .map(a => `- [${formatDate(a.occurred_at)}] ${a.type.replace(/_/g, ' ').toUpperCase()}: ${a.notes}`)
        .join('\n');
      const scoreSection = lead.score != null
        ? `Score: ${lead.score}/100\nSummary: ${lead.score_breakdown?.summary || 'N/A'}`
        : 'Score: Not yet scored';
      const nextSteps = lead.score_breakdown?.next_steps?.join('\n')
        || (lead.next_steps ? lead.next_steps.split('\n').filter(Boolean).join('\n') : 'Score this lead to get next steps');
      return `Name: ${lead.name} | Company: ${lead.company} | Role: ${lead.role}
Email: ${lead.email} | Phone: ${lead.phone || 'N/A'} | Status: ${lead.status}
${scoreSection}
Next Steps: ${nextSteps}
Latest Activity: ${latestText}
Full History:
${historyLines}`;
    };

    // Case-insensitive lead matching done in code, not by the AI.
    // Check the latest user message first; fall back to full conversation history.
    const latestUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content?.toLowerCase() || '';
    const fullHistory = messages.map(m => m.content).join(' ').toLowerCase();

    const findMatch = (text) => leadsResult.rows.find(lead => {
      const name = lead.name.toLowerCase();
      const email = (lead.email || '').toLowerCase();
      return text.includes(name) || (email && text.includes(email));
    });

    const serverMatchedLead = findMatch(latestUserMsg) || findMatch(fullHistory) || null;

    const identifiedSection = serverMatchedLead
      ? `IDENTIFIED LEAD — the system has already matched this lead from the conversation. Use this data to respond immediately. Do NOT ask for the name again.
---
${buildLeadBlock(serverMatchedLead)}
---
`
      : '';

    const leadsBlock = leadsResult.rows.map(lead => `---\n${buildLeadBlock(lead)}`).join('\n\n');

    const system = `You are a Sales AI Assistant for a roofing materials manufacturer.

${identifiedSection}YOUR DUTIES — you may ONLY help with:
1. Sharing lead details: company name, job role, and contact info
2. Summarizing the lead's most recent activity
3. Recommending next actions to improve lead conversion

CONVERSATION FLOW:
- If an IDENTIFIED LEAD section appears above, respond immediately with that lead's details using the response format below. Do NOT ask for the name.
- If no IDENTIFIED LEAD is present, ask the user for the lead's full name (first + last) or email address.
- If the user gives only a single word with no email, ask once for the full name or email.
- If the user asks about a different lead, the system will identify them in the next turn.

RESPONSE FORMAT — always use bold (**) for labels:

**Name:** [Full Name]
**Company:** [Company Name]
**Role:** [Job Role]
**Email:** [Email Address]
**Status:** [Lead Status]
**AI Score:** [score]/100 — or "Not yet scored" if no score exists

**Latest Activity:**
[Date] — [Activity Type]: [Notes]

**Recommended Next Steps:**
1. [Step one]
2. [Step two]
3. [Step three]

If the AI score is "Not yet scored", add this note at the very end:
💡 This lead hasn't been scored yet. Click **Calculate AI Score** below to run the analysis.

If asked about anything outside these duties, respond: "I'm here to help with lead details, recent activities, and next steps. Could you provide a lead's full name or email to get started?"

ALL LEADS (for reference):
${leadsBlock}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [{ role: 'system', content: system }, ...messages],
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) throw new Error('No response from AI');

    res.json({
      reply,
      activeLead: serverMatchedLead
        ? { id: serverMatchedLead.id, name: serverMatchedLead.name, isScored: serverMatchedLead.score != null }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const [leadResult, activitiesResult] = await Promise.all([
      db.query('SELECT * FROM leads WHERE id = $1', [id]),
      db.query('SELECT type, notes, occurred_at FROM lead_activities WHERE lead_id = $1 ORDER BY occurred_at ASC', [id]),
    ]);
    if (!leadResult.rows.length) return res.status(404).json({ error: 'Lead not found' });

    const lead = leadResult.rows[0];
    const activities = activitiesResult.rows;

    const activityList = activities.map((a) => {
      const date = new Date(a.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `- [${date}] ${a.type.replace(/_/g, ' ').toUpperCase()}: ${a.notes}`;
    }).join('\n');

    const latest = activities[activities.length - 1];
    const latestText = latest
      ? `[${new Date(latest.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}] ${latest.type.replace(/_/g, ' ')}: ${latest.notes}`
      : 'No activities recorded yet';

    const scoreSection = lead.score != null
      ? `Score: ${lead.score}/100\nSummary: ${lead.score_breakdown?.summary || 'N/A'}`
      : 'Not yet scored — use "Score with AI" to generate a score';

    const nextSteps = lead.score_breakdown?.next_steps?.join('\n')
      || (lead.next_steps ? lead.next_steps.split('\n').filter(Boolean).join('\n') : 'Score this lead to get recommended next steps');

    const system = `You are an AI sales assistant for a roofing materials manufacturer. You have full context on the lead below. Answer questions concisely about their latest activity, score, or recommended next actions.

LEAD
Name: ${lead.name} | Company: ${lead.company} | Role: ${lead.role}
Email: ${lead.email} | Phone: ${lead.phone || 'N/A'} | Source: ${lead.source || 'N/A'} | Status: ${lead.status}

${scoreSection}

NEXT STEPS
${nextSteps}

LATEST ACTIVITY
${latestText}

FULL HISTORY
${activityList}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) throw new Error('No response from AI');
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

module.exports = router;
