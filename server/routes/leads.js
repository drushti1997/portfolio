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
