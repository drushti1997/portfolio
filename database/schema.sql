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
    'AI Project Lead Finder',
    'lead-generator',
    'Surface active roofing projects before your competitors do',
    'Scans permit filings, construction starts, and project databases to identify commercial and industrial roofing opportunities — so your reps reach the right contractor before the bid closes.',
    '🎯',
    ARRAY['Lead Gen', 'Construction AI', 'Prospecting']
  ),
  (
    'Material Quote Copilot',
    'quote-copilot',
    'Spec-matched roofing material quotes generated in seconds',
    'Generates accurate, code-compliant quotes for TPO, EPDM, metal roofing, and modified bitumen systems based on project size, building type, and local requirements. Drafts in seconds, ready to send in one click.',
    '📋',
    ARRAY['Quoting', 'Estimating', 'Sales AI']
  ),
  (
    'Project Pipeline Intelligence',
    'project-intelligence',
    'Know which roofing contracts will close before your CRM does',
    'Analyzes bid activity, contractor engagement, and permit timelines to forecast which projects are most likely to close — and flags at-risk deals before deadlines pass.',
    '📊',
    ARRAY['Pipeline', 'Forecasting', 'Project AI']
  )
ON CONFLICT (slug) DO NOTHING;

UPDATE products SET status = 'live' WHERE slug = 'lead-generator';

GRANT CONNECT ON DATABASE portfolio TO portfolio_user;
GRANT USAGE ON SCHEMA public TO portfolio_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO portfolio_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO portfolio_user;

-- ─── Lead Scoring Tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  company         VARCHAR(255)  NOT NULL,
  role            VARCHAR(255),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  source          VARCHAR(100),
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

INSERT INTO leads (name, company, role, email, phone, source, status) VALUES
  ('James Holloway',  'Summit Commercial Builders',  'VP of Procurement',          'j.holloway@summitcommercial.com',  '(602) 555-0183', 'Cold Email',                  'warm'),
  ('Rachel Torres',   'Meridian Construction Group', 'Director of Procurement',    'r.torres@meridiancg.com',          '(213) 555-0247', 'Permit Filing (AI Detected)', 'hot'),
  ('Daniel Park',     'Pacific Coast Development',   'Materials Sourcing Manager', 'daniel.park@paccoastdev.com',      '(619) 555-0391', 'Cold Email',                  'cold'),
  ('Amanda Solis',    'Apex Building Corp',          'Chief Procurement Officer',  'a.solis@apexbuildingcorp.com',     '(312) 555-0562', 'LinkedIn Outreach',           'new'),
  ('Kevin Walsh',     'Crestline Contractors Inc',   'Senior Estimator',           'k.walsh@crestlinecontractors.com', '(720) 555-0814', 'Referral (Turner Roofing)',   'warm')
ON CONFLICT DO NOTHING;

-- ─── Seed Lead Activities ────────────────────────────────────────────────────

-- James Holloway (lead 1) — warm, received samples, reviewing proposal
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',     'Cold outreach introducing our commercial roofing product line — highlighted our TPO and EPDM systems for flat commercial roofs.',                                          NOW() - INTERVAL '18 days'),
  ('email_reply',    'James replied within a day — they have a 40,000 sq ft warehouse re-roof coming up in Q3 and are evaluating material suppliers.',                                         NOW() - INTERVAL '16 days'),
  ('call',           '20-min discovery call. Project is a distribution center in Phoenix. Specs require Class A fire rating and 20-year warranty. Budget approved.',                          NOW() - INTERVAL '13 days'),
  ('sample_request', 'James requested physical samples of our 60-mil TPO membrane and cover board insulation. Shipped via FedEx overnight.',                                                   NOW() - INTERVAL '11 days'),
  ('email_reply',    'Samples received. James said the TPO quality looks strong. Wants formal quote with per-square pricing, delivery lead times, and warranty terms.',                        NOW() - INTERVAL '8 days'),
  ('quote_sent',     'Sent full material quote: 40,000 sq ft TPO system at $4.20/sq ft installed materials, 4-week lead time, 20-year manufacturer warranty included.',                       NOW() - INTERVAL '5 days'),
  ('follow_up',      'Check-in on the quote. James said it''s under internal review with their project manager. Decision expected by end of the month.',                                       NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'James Holloway';

-- Rachel Torres (lead 2) — hot, verbal commitment, finalizing PO
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',     'Outreach targeting Meridian''s new industrial park project spotted in local permit filings — 6 buildings, estimated 120,000 sq ft of flat roofing.',                    NOW() - INTERVAL '25 days'),
  ('email_reply',    'Rachel replied same day. They''re in early procurement for the industrial park. She''s evaluating 3 suppliers. Asked for product specs and references.',                 NOW() - INTERVAL '23 days'),
  ('call',           '30-min intro call. Project spans 6 warehouse buildings in two phases. Phase 1 is 3 buildings (approx 60,000 sq ft) starting in 8 weeks.',                              NOW() - INTERVAL '20 days'),
  ('sample_request', 'Sent full sample kit: TPO, EPDM, and two-ply modified bitumen. Also included case study from a similar industrial park project in Dallas.',                             NOW() - INTERVAL '17 days'),
  ('meeting',        'In-person meeting at Meridian HQ. Rachel''s team tested the samples in their materials lab. Metal roofing eliminated early due to cost. TPO vs EPDM shortlisted.',     NOW() - INTERVAL '13 days'),
  ('quote_sent',     'Submitted competitive quote for Phase 1: 60,000 sq ft EPDM system at $3.85/sq ft materials. Included volume pricing schedule for Phase 2.',                            NOW() - INTERVAL '9 days'),
  ('email_reply',    'Rachel confirmed our quote is the strongest on price and warranty. Their PM prefers EPDM for the climate. She''s recommending us internally.',                          NOW() - INTERVAL '6 days'),
  ('call',           'Brief call — legal is reviewing the supply agreement. Rachel expects PO issued within the week. Asked about rush delivery options for Phase 1 start date.',             NOW() - INTERVAL '3 days'),
  ('follow_up',      'Sent revised delivery schedule confirming we can hit Phase 1 start. Rachel said the contract is with her CPO for signature.',                                           NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Rachel Torres';

-- Daniel Park (lead 3) — cold, no-show, gone quiet
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',     'Cold outreach to Pacific Coast Development. Targeted their upcoming mixed-use commercial project announced in the local business journal.',                              NOW() - INTERVAL '30 days'),
  ('email_reply',    'Short reply from Daniel: "We''re in early stages, will keep you in mind for Q4 procurement." No commitment.',                                                           NOW() - INTERVAL '27 days'),
  ('follow_up',      'Sent a one-page overview of our commercial roofing systems and offered a 15-minute product call.',                                                                      NOW() - INTERVAL '21 days'),
  ('no_show',        'Call scheduled for 2pm — Daniel did not join. No message or reschedule request.',                                                                                      NOW() - INTERVAL '14 days'),
  ('follow_up',      'Reschedule email: "No worries, happy to find a better time. We also have a new energy-efficient TPO line that may align with your sustainability goals."',             NOW() - INTERVAL '10 days'),
  ('follow_up',      'Second follow-up with a brief roofing cost calculator. No response yet.',                                                                                              NOW() - INTERVAL '4 days')
) AS a(type, notes, occurred_at) ON l.name = 'Daniel Park';

-- Amanda Solis (lead 4) — new, very early stage
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',     'Cold outreach to Apex Building Corp after seeing their Series B funding announcement. Positioned our enterprise-tier roofing supply program for high-volume builders.',NOW() - INTERVAL '5 days'),
  ('email_reply',    'Amanda replied: "We manage procurement for 12 active commercial sites. Can you share your product catalog and bulk pricing tiers?"',                                    NOW() - INTERVAL '3 days'),
  ('follow_up',      'Sent full product catalog, bulk pricing tiers, and an intro to our dedicated account manager program for high-volume clients. Offered a discovery call.',              NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Amanda Solis';

-- Kevin Walsh (lead 5) — warm, referral, sample stage
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',     'Warm outreach via referral from Marcus at Turner Roofing who has been a client for 2 years. Kevin runs estimating for Crestline''s commercial division.',              NOW() - INTERVAL '22 days'),
  ('email_reply',    'Kevin replied quickly — "Marcus speaks highly of your lead times and warranty support. We''re pricing a 25,000 sq ft modified bitumen re-roof for a strip mall."',   NOW() - INTERVAL '20 days'),
  ('call',           '25-min discovery call. Project is a 1970s strip mall with aging BUR system. Kevin wants to switch to modified bitumen. Timeline: material delivery needed in 6 weeks.',NOW() - INTERVAL '16 days'),
  ('sample_request', 'Kevin requested samples of our SBS modified bitumen cap sheet and base sheet. Also asked for our installation guide for his crew.',                                    NOW() - INTERVAL '13 days'),
  ('email_reply',    'Samples looked good. Kevin confirmed the cap sheet granule texture matches what the building owner specified. Requested a formal quote.',                              NOW() - INTERVAL '9 days'),
  ('quote_sent',     'Sent quote for 25,000 sq ft SBS modified bitumen system: $3.10/sq ft materials, 3-week lead time, including fasteners and primer.',                                   NOW() - INTERVAL '6 days'),
  ('site_visit',     'Kevin invited us to walk the strip mall roof with the building owner. Confirmed scope. Owner asked about cool-roof coating options on top of the mod-bit system.',    NOW() - INTERVAL '3 days'),
  ('follow_up',      'Sent updated quote including optional cool-roof coating add-on (+$0.45/sq ft). Kevin said he''s presenting both options to the owner this week.',                     NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Kevin Walsh';
