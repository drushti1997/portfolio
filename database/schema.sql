CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  slug        VARCHAR(255)  UNIQUE NOT NULL,
  tagline     VARCHAR(500),
  description TEXT,
  icon_emoji  VARCHAR(10)   DEFAULT '🤖',
  tags        TEXT[]        DEFAULT '{}',
  status      VARCHAR(50)   DEFAULT 'coming_soon',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, slug, tagline, description, icon_emoji, tags) VALUES
  (
    'AI Lead Generator',
    'lead-generator',
    'Identify and qualify high-intent leads automatically',
    'Uses AI to analyze signals across multiple channels and surface the leads most likely to convert — so your sales team focuses effort where it counts most.',
    '🎯',
    ARRAY['Lead Gen', 'Sales AI', 'Prospecting']
  ),
  (
    'Sales Email Copilot',
    'sales-email-copilot',
    'AI-drafted outreach emails that actually get replies',
    'Generates personalized cold emails tailored to each prospect''s role, industry, and pain points. Drafts in seconds, edits in one click, sends with confidence.',
    '✉️',
    ARRAY['Email', 'Outreach', 'Copywriting AI']
  ),
  (
    'Pipeline Intelligence',
    'pipeline-intelligence',
    'Know which deals will close before your CRM does',
    'Analyzes deal activity, engagement patterns, and historical win/loss data to forecast pipeline health and flag at-risk opportunities before it''s too late.',
    '📊',
    ARRAY['Pipeline', 'Forecasting', 'CRM AI']
  )
ON CONFLICT (slug) DO NOTHING;

UPDATE products SET status = 'live' WHERE slug = 'lead-generator';

-- ─── Lead Scoring Tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  company         VARCHAR(255)  NOT NULL,
  role            VARCHAR(255),
  email           VARCHAR(255),
  status          VARCHAR(50)   DEFAULT 'new',
  score           INTEGER,
  score_breakdown JSONB,
  next_steps      TEXT,
  scored_at       TIMESTAMP,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id          SERIAL PRIMARY KEY,
  lead_id     INTEGER      REFERENCES leads(id) ON DELETE CASCADE,
  type        VARCHAR(50)  NOT NULL,
  notes       TEXT,
  occurred_at TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─── Seed Leads ──────────────────────────────────────────────────────────────

INSERT INTO leads (name, company, role, email, status) VALUES
  ('Sarah Chen',    'TechScale Inc',       'VP of Sales',                 'sarah.chen@techscale.io',      'warm'),
  ('Marcus Johnson','Growth Dynamics',     'Sales Director',              'm.johnson@growthdynamics.com', 'hot'),
  ('Priya Patel',   'Finvault',            'Head of Business Development','priya@finvault.co',            'cold'),
  ('David Okonkwo', 'MegaCorp Enterprises','Enterprise Account Executive','d.okonkwo@megacorp.com',       'new'),
  ('Lisa Nakamura', 'RocketFuel',          'Chief Revenue Officer',       'lisa.n@rocketfuel.io',         'warm')
ON CONFLICT DO NOTHING;

-- ─── Seed Lead Activities ────────────────────────────────────────────────────

-- Sarah Chen (lead 1) — warm, demo attended, proposal sent
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',  'Initial outreach: introduced our AI lead-scoring platform, highlighted ROI stats.',          NOW() - INTERVAL '14 days'),
  ('email_reply', 'Sarah replied — interested, asked for product overview deck and pricing ballpark.',          NOW() - INTERVAL '12 days'),
  ('follow_up',   'Sent product deck + case study (MidWest Insurance, 3× pipeline efficiency).',               NOW() - INTERVAL '10 days'),
  ('email_reply', 'Loved the case study. Wants to schedule a live demo with her ops manager.',                 NOW() - INTERVAL '8 days'),
  ('call',        '15-min discovery call. Pain points: manual lead qualification eating 40% of rep time. 3 attendees confirmed for demo.', NOW() - INTERVAL '6 days'),
  ('demo',        'Full 45-min product demo. CMO joined unexpectedly — very positive reaction. Lots of questions about CRM integrations.', NOW() - INTERVAL '4 days'),
  ('follow_up',   'Sent proposal with enterprise tier pricing and integration roadmap. Requested feedback within a week.',               NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'Sarah Chen';

-- Marcus Johnson (lead 2) — hot, proposal stage, budget confirmed
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',  'Cold outreach referencing a LinkedIn post Marcus made about sales efficiency.',              NOW() - INTERVAL '21 days'),
  ('call',        '20-min intro call. Marcus runs a 15-person SDR team. Frustrated with their current lead-scoring spreadsheet.', NOW() - INTERVAL '18 days'),
  ('demo',        'Product demo — Marcus was highly engaged, asked about bulk import and API access. Team of 4 on the call.', NOW() - INTERVAL '14 days'),
  ('email_reply', 'Detailed follow-up questions about Salesforce integration depth and data residency.',        NOW() - INTERVAL '12 days'),
  ('follow_up',   'Sent technical integration docs and SOC 2 Type II report.',                                 NOW() - INTERVAL '10 days'),
  ('email_reply', 'Integration docs look good. His CTO signed off. Wants to see pricing for 20 seats.',       NOW() - INTERVAL '7 days'),
  ('call',        '30-min pricing call. Budget approved at $2.4k/mo. Negotiating on onboarding support scope.',NOW() - INTERVAL '5 days'),
  ('follow_up',   'Sent final proposal with two onboarding options. Marcus said he expects to sign by end of week.', NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'Marcus Johnson';

-- Priya Patel (lead 3) — cold, no-show, gone quiet
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',  'Initial outreach targeting fintech BDRs. Personalized to Finvault''s Series B announcement.',NOW() - INTERVAL '28 days'),
  ('email_reply', 'Short reply: "Looks interesting, might be relevant for Q3. Send more info."',               NOW() - INTERVAL '25 days'),
  ('follow_up',   'Sent detailed one-pager and offered a 20-min demo slot.',                                   NOW() - INTERVAL '21 days'),
  ('no_show',     'Demo scheduled for 2pm — Priya did not join. No message sent.',                             NOW() - INTERVAL '14 days'),
  ('follow_up',   'Sent reschedule email: "No worries, happy to find a better time."',                         NOW() - INTERVAL '10 days'),
  ('follow_up',   'Second reschedule attempt. No response yet.',                                               NOW() - INTERVAL '5 days')
) AS a(type, notes, occurred_at) ON l.name = 'Priya Patel';

-- David Okonkwo (lead 4) — new, early stage
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',  'Initial cold email to enterprise segment. Highlighted our Fortune 500 customer logos.',     NOW() - INTERVAL '5 days'),
  ('email_reply', 'David replied: "We''ve been evaluating tools in this space. Can you share more on your enterprise tier?"', NOW() - INTERVAL '3 days'),
  ('follow_up',   'Sent enterprise overview deck and offered an intro call with our enterprise team.',         NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'David Okonkwo';

-- Lisa Nakamura (lead 5) — warm, in budget approval, high intent
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',  'Outreach via mutual LinkedIn connection (Jake from TechCrunch). Warm intro angle.',         NOW() - INTERVAL '22 days'),
  ('email_reply', 'Lisa replied within 2 hours — "Jake speaks highly of you. Let''s talk."',                  NOW() - INTERVAL '20 days'),
  ('call',        '30-min exploratory call. Lisa oversees 25 AEs. Key pain: reps chasing wrong leads, forecast accuracy at 60%.', NOW() - INTERVAL '16 days'),
  ('demo',        'Deep-dive demo — Lisa took notes throughout. Loved the AI reasoning transparency. Brought in Head of RevOps.', NOW() - INTERVAL '10 days'),
  ('email_reply', 'Internal alignment happening. Team loves it. Lisa asked for a security & compliance questionnaire.', NOW() - INTERVAL '8 days'),
  ('follow_up',   'Sent security questionnaire and asked if they need SSO support (we have it).',              NOW() - INTERVAL '5 days'),
  ('email_reply', 'Questionnaire filled out. Budget approval in progress — Lisa expects decision next week.',  NOW() - INTERVAL '3 days'),
  ('follow_up',   'Sent completed security docs. Offered to arrange a call with our CSM to discuss onboarding timeline.', NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Lisa Nakamura';
