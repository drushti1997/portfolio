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

    const leadsBlock = leadsResult.rows.map(lead => {
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

      return `---
Name: ${lead.name} | Company: ${lead.company} | Role: ${lead.role}
Email: ${lead.email} | Phone: ${lead.phone || 'N/A'} | Status: ${lead.status}
${scoreSection}
Next Steps: ${nextSteps}
Latest Activity: ${latestText}
Full History:
${historyLines}`;
    }).join('\n\n');

    const system = `You are a Sales AI Assistant for a roofing materials manufacturer.

YOUR DUTIES — you may ONLY help with:
1. Identifying a lead by their full name
2. Sharing lead details: company name, job role, and contact info
3. Summarizing the lead's most recent activity
4. Recommending next actions to improve lead conversion

HOW TO IDENTIFY A LEAD:
The user can identify a lead in one of two ways — either is sufficient on its own, never require both:
1. FULL NAME — must contain at least two words (first + last). "John Smith" is valid. "John" alone or "Smith" alone is NOT sufficient.
2. EMAIL ADDRESS — any valid email (e.g. john@company.com) is sufficient on its own.

CONVERSATION FLOW:
- Step 1: Ask the user for the lead's full name OR email address.
- Step 2: If the user gives only a single word (no email), ask once: "Could you please provide the lead's full name (first and last name) or their email address?"
- Step 3: Once you receive a valid full name (two+ words) OR a valid email, immediately look up the lead and respond. Do NOT ask for confirmation or additional details.
- Step 4: If no matching lead is found, say so clearly and ask them to double-check.
- The user may ask about a different lead at any point — follow the same flow for the new identifier.

RESPONSE FORMAT — when a lead is found, always reply in this exact format using bold (**) for labels:

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

If the AI score is "Not yet scored", add this note on a new line at the very end:
💡 This lead hasn't been scored yet. Click **Calculate AI Score** below to run the analysis.

If the user asks about anything outside these duties, respond with: "I'm here to help with lead details, recent activities, and next steps for specific leads. Could you provide a lead's full name or email to get started?"

Do not offer general sales advice, industry information, or engage with topics unrelated to the leads below.

AVAILABLE LEADS:
${leadsBlock}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [{ role: 'system', content: system }, ...messages],
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) throw new Error('No response from AI');

    // Detect which lead the conversation is about so the frontend can offer scoring
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    const detectedLead = leadsResult.rows.find(lead => {
      const name = lead.name.toLowerCase();
      const email = (lead.email || '').toLowerCase();
      return allText.includes(name) || (email && allText.includes(email));
    });

    res.json({
      reply,
      activeLead: detectedLead
        ? { id: detectedLead.id, name: detectedLead.name, isScored: detectedLead.score != null }
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
