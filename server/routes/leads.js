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
      'SELECT id, name, company, role, email, status, score, scored_at, created_at FROM leads ORDER BY created_at ASC'
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

module.exports = router;
