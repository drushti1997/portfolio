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
    'AI Lead Scorer',
    'lead-generator',
    'Score your leads, know your next move, close faster',
    'Gives your sales team instant AI-powered intelligence on every lead — scoring engagement, intent, and deal potential, surfacing the latest activity, and recommending the next best action. Ask the AI assistant about any lead by name or email and get a full briefing in seconds.',
    '🎯',
    ARRAY['Sales AI', 'Lead Intelligence', 'CRM']
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

UPDATE products
SET
  name        = 'AI Lead Scorer',
  tagline     = 'Score your leads, know your next move, close faster',
  description = 'Gives your sales team instant AI-powered intelligence on every lead — scoring engagement, intent, and deal potential, surfacing the latest activity, and recommending the next best action. Ask the AI assistant about any lead by name or email and get a full briefing in seconds.',
  icon_emoji  = '🎯',
  tags        = ARRAY['Sales AI', 'Lead Intelligence', 'CRM'],
  status      = 'live'
WHERE slug = 'lead-generator';

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

-- ─── Additional Demo Leads ────────────────────────────────────────────────────

INSERT INTO leads (name, company, role, email, phone, source, status) VALUES
  ('Marcus Webb',      'Cornerstone Property Management', 'Director of Facilities',    'm.webb@cornerstoneproperty.com',    '(404) 555-0127', 'LinkedIn Outreach',           'converted'),
  ('Sofia Nakamura',   'BlueSky Construction LLC',        'Senior Project Manager',    's.nakamura@blueskyconst.com',       '(503) 555-0364', 'Trade Show (IRE 2025)',       'warm'),
  ('Tyler Brennan',    'Ironclad Roofing & Construction', 'Chief Estimator',           't.brennan@ironclad-rc.com',         '(480) 555-0591', 'Referral (Walsh Builders)',   'hot'),
  ('Priya Sharma',     'Olympia Commercial Real Estate',  'Director of Facilities',    'p.sharma@olympiacre.com',           '(206) 555-0738', 'Cold Email',                  'warm'),
  ('Carlos Mendez',    'Southwest Builder Group',         'VP of Operations',          'c.mendez@swbuildergroup.com',       '(602) 555-0956', 'Cold Email',                  'cold'),
  ('Lauren Kim',       'Atlas Development Partners',      'Procurement Director',      'l.kim@atlasdevpartners.com',        '(415) 555-0182', 'Website Inquiry',             'new'),
  ('David Chen',       'Horizon Infrastructure Group',   'Chief Estimator',           'd.chen@horizonig.com',              '(714) 555-0447', 'Permit Filing (AI Detected)', 'hot'),
  ('Nadia Okafor',     'Crown Commercial Contractors',   'Project Director',          'n.okafor@crowncommercial.com',      '(312) 555-0673', 'LinkedIn Outreach',           'warm'),
  ('Robert Stiles',    'Magnolia Building Corp',          'Senior Buyer',              'r.stiles@magnoliabuild.com',        '(901) 555-0819', 'Cold Email',                  'cold'),
  ('Jennifer Huang',   'Pacific Rim Developers',          'VP of Construction',        'j.huang@pacificrimdev.com',         '(858) 555-0234', 'Trade Show (IRE 2025)',       'new')
ON CONFLICT DO NOTHING;

-- Marcus Webb (lead 6) — converted, large property portfolio, signed multi-site agreement
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('linkedin_message', 'Connected with Marcus on LinkedIn after he posted about Cornerstone''s 5-year capital improvement plan across their 32-property commercial portfolio.',                NOW() - INTERVAL '55 days'),
  ('email_reply',      'Marcus moved conversation to email. "We replace 3–5 roofs per year across the portfolio. Current supplier has had quality issues. Open to talking."',                NOW() - INTERVAL '52 days'),
  ('call',             '35-min discovery call. Cornerstone manages Class A office parks, retail centers, and light industrial. They need a consistent supplier for TPO and metal systems.',  NOW() - INTERVAL '48 days'),
  ('meeting',          'In-person meeting at Cornerstone HQ. Presented our preferred-vendor program: dedicated account rep, volume pricing tiers, 72-hr emergency material fulfillment.',   NOW() - INTERVAL '42 days'),
  ('sample_request',   'Marcus requested full sample kit for materials committee review — TPO, standing seam metal, and EPDM. Also asked for references from other property managers.',     NOW() - INTERVAL '38 days'),
  ('email_reply',      'Materials committee approved our TPO and standing seam metal lines. Marcus asked for enterprise pricing proposal covering up to 8 roof replacements per year.',     NOW() - INTERVAL '33 days'),
  ('quote_sent',       'Submitted enterprise pricing proposal: tiered volume discounts from 8–15% based on annual spend, dedicated account manager, net-60 payment terms.',                 NOW() - INTERVAL '28 days'),
  ('site_visit',       'Walked two properties with Marcus and his facilities team — an office park in Midtown and a retail center in Buckhead. Scoped first two projects of the year.',     NOW() - INTERVAL '22 days'),
  ('meeting',          'Contract review meeting with Cornerstone''s legal and procurement team. Agreed on a 3-year preferred-vendor agreement covering all roofing material purchases.',    NOW() - INTERVAL '14 days'),
  ('email_reply',      'Marcus confirmed: contract signed by CPO. First PO issued for the Midtown office park re-roof — 18,000 sq ft TPO system, delivery scheduled in 2 weeks.',          NOW() - INTERVAL '7 days'),
  ('follow_up',        'Sent onboarding packet to Marcus: account manager intro, ordering portal access, and delivery tracking setup. Relationship is fully active.',                        NOW() - INTERVAL '3 days')
) AS a(type, notes, occurred_at) ON l.name = 'Marcus Webb';

-- Sofia Nakamura (lead 7) — warm, trade show contact, mid-funnel
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'Follow-up from the IRE 2025 trade show in Nashville. Sofia visited our booth and picked up samples of our 80-mil TPO line. Referenced our conversation about flat-roof systems.',         NOW() - INTERVAL '28 days'),
  ('email_reply',      '"Good timing — we just got awarded a 3-building industrial campus project in Portland. Flat roofs, total ~75,000 sq ft across all three. Let''s talk."',                                   NOW() - INTERVAL '26 days'),
  ('call',             '30-min intro call. Project is a phased build — Phase 1 (35,000 sq ft) breaks ground in 10 weeks. Sofia is the PM managing procurement coordination with the GC.',                         NOW() - INTERVAL '23 days'),
  ('sample_request',   'Shipped expanded sample kit: 60-mil TPO, 80-mil TPO, and ISO insulation board. Sofia wants her roofing sub to review before the spec is finalized.',                                     NOW() - INTERVAL '19 days'),
  ('email_reply',      'Roofing sub reviewed and prefers the 80-mil TPO for long-term warranty. Sofia asked for a Phase 1 material quote and lead time confirmation for the 10-week window.',                     NOW() - INTERVAL '14 days'),
  ('quote_sent',       'Submitted Phase 1 quote: 35,000 sq ft 80-mil TPO system at $4.65/sq ft materials. Lead time: 3.5 weeks. Included Phase 2 and 3 pricing schedules as preview.',                           NOW() - INTERVAL '10 days'),
  ('follow_up',        'Check-in on the quote. Sofia said the GC is still finalizing the Phase 1 scope but our pricing is competitive. She expects to move forward within the next two weeks.',                   NOW() - INTERVAL '4 days')
) AS a(type, notes, occurred_at) ON l.name = 'Sofia Nakamura';

-- Tyler Brennan (lead 8) — hot, referral, close to PO
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'Warm intro via referral from Walsh Builders — they mentioned Ironclad does 15–20 commercial re-roofs per year in the Phoenix metro and is unhappy with their current supplier.',           NOW() - INTERVAL '24 days'),
  ('email_reply',      'Tyler replied within 2 hours. "Walsh''s endorsement carries weight with us. We have two back-to-back projects needing materials in the next 6 weeks. Can we jump on a call today?"',       NOW() - INTERVAL '24 days'),
  ('call',             'First call same day. Project A: 28,000 sq ft TPO re-roof on a medical office building. Project B: 45,000 sq ft EPDM system on a distribution center. Both need delivery by week 5.',     NOW() - INTERVAL '23 days'),
  ('call',             'Technical follow-up call with Tyler and Ironclad''s lead foreman. Reviewed system specs, adhesive requirements, and penetration details. Foreman approved our EPDM spec for Project B.',  NOW() - INTERVAL '20 days'),
  ('demo',             'Hosted Tyler and foreman at our regional distribution center for a product demo. Showed the 60-mil EPDM bonding system live. Tyler was impressed with the seam consistency.',             NOW() - INTERVAL '16 days'),
  ('quote_sent',       'Submitted combined quote for both projects: Project A (TPO, $4.10/sq ft) and Project B (EPDM, $3.75/sq ft). Bundled delivery to reduce freight costs. Total materials: ~$252K.',          NOW() - INTERVAL '12 days'),
  ('email_reply',      '"Pricing is sharper than our current supplier and the lead time works. Getting sign-off from our owner. Should have a PO for both projects by end of week."',                              NOW() - INTERVAL '8 days'),
  ('follow_up',        'Sent confirmation of delivery slot reservation for both projects. Tyler confirmed the owner approved. PO drafting is in progress with their accounting team.',                              NOW() - INTERVAL '3 days'),
  ('follow_up',        'Tyler gave a verbal: PO will be issued Monday. Asked us to hold delivery slot for Project A (Week 3) and Project B (Week 5). Highest-priority deal in the pipeline.',                     NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Tyler Brennan';

-- Priya Sharma (lead 9) — warm, large portfolio, building relationship
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'Cold outreach to Olympia CRE after identifying 4 active permit filings for roof replacements on properties in their Seattle portfolio.',                                                    NOW() - INTERVAL '35 days'),
  ('email_reply',      'Priya replied: "We have 11 properties with aging flat roofs scheduled for replacement over the next 18 months. Happy to explore supplier options."',                                       NOW() - INTERVAL '32 days'),
  ('call',             '40-min discovery call. Olympia prioritizes long-term warranty, energy efficiency (WA state requirements), and net-60 payment terms. They currently use two suppliers.',                    NOW() - INTERVAL '28 days'),
  ('meeting',          'Presented at Olympia''s quarterly facilities review. Covered our energy-efficient TPO line (ENERGY STAR rated), warranty terms, and volume pricing. Well received by the team.',          NOW() - INTERVAL '21 days'),
  ('sample_request',   'Facilities team requested samples of our ENERGY STAR 60-mil TPO and our new white EPDM membrane. Priya flagged WA state rebate programs that favor cool-roof materials.',               NOW() - INTERVAL '16 days'),
  ('follow_up',        'Sent WA state rebate documentation showing our ENERGY STAR TPO qualifies for up to $0.15/sq ft in utility rebates. Priya forwarded to their sustainability director.',                   NOW() - INTERVAL '9 days'),
  ('email_reply',      'Sustainability director approved the TPO spec. Priya asked for a formal quote for their first project — a 22,000 sq ft office building in Bellevue scheduled for Q4.',                   NOW() - INTERVAL '4 days')
) AS a(type, notes, occurred_at) ON l.name = 'Priya Sharma';

-- Carlos Mendez (lead 10) — cold, initial interest then unresponsive
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'Cold outreach to Southwest Builder Group. They''re building 3 new tilt-up warehouse facilities in the Phoenix metro — identified via permit filings. Approx 90,000 sq ft of roofing.',   NOW() - INTERVAL '40 days'),
  ('email_reply',      'Carlos replied briefly: "We have an existing supplier for roofing materials but I''m open to a comparison quote. Send over your pricing for TPO on a 30,000 sq ft flat warehouse."',     NOW() - INTERVAL '37 days'),
  ('call',             '15-min introductory call. Carlos was guarded — their current supplier is a family relationship. Said he''d consider switching if our pricing is at least 10% better. No commitment.',    NOW() - INTERVAL '33 days'),
  ('quote_sent',       'Sent competitive quote for 30,000 sq ft TPO system at $3.95/sq ft — approximately 12% below their stated current pricing. Included a side-by-side warranty comparison.',               NOW() - INTERVAL '29 days'),
  ('no_show',          'Call scheduled to review the quote. Carlos did not join and sent no message.',                                                                                                             NOW() - INTERVAL '22 days'),
  ('follow_up',        'Follow-up email: "Happy to reschedule — also wanted to flag that our lead time could cover your Phase 2 warehouse start in 8 weeks."',                                                   NOW() - INTERVAL '16 days'),
  ('follow_up',        'Second follow-up with a brief value summary. No response. May require a longer nurture cycle or re-engagement closer to Phase 2 groundbreaking.',                                          NOW() - INTERVAL '7 days')
) AS a(type, notes, occurred_at) ON l.name = 'Carlos Mendez';

-- Lauren Kim (lead 11) — new, website inquiry, very early stage
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'Lauren submitted an inquiry via our website requesting info on bulk pricing for commercial roofing materials. Atlas Development has 4 projects breaking ground in Q1 next year.',          NOW() - INTERVAL '4 days'),
  ('email_reply',      '"Thanks for reaching out. We''re procuring materials for four mixed-use developments totaling ~180,000 sq ft of roofing. Need a supplier who can scale with our pipeline. Let''s talk."', NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'Lauren Kim';

-- David Chen (lead 12) — hot, permit filing detected, fast mover
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'AI flagged a permit filing for a 55,000 sq ft logistics hub by Horizon Infrastructure in Anaheim. Outreach to David as Chief Estimator — project starts in 7 weeks.',                    NOW() - INTERVAL '20 days'),
  ('email_reply',      '"Fast response — we''re literally finalizing the material spec this week. Current quote from our supplier came in high. What''s your lead time for 55K sq ft TPO?"',                      NOW() - INTERVAL '19 days'),
  ('call',             '20-min call. Tight timeline — slab pour is done, roofing contractor mobilizes in 6 weeks. David needs materials on-site in 5 weeks. Our regional warehouse can hit that window.',        NOW() - INTERVAL '17 days'),
  ('demo',             'David and the roofing sub''s foreman came to our Anaheim distribution center to inspect our 60-mil TPO inventory firsthand. Confirmed material quality and quantity availability.',       NOW() - INTERVAL '14 days'),
  ('sample_request',   'Sub''s foreman requested seam tape and detail accessory samples to verify compatibility with their installation method. Shipped same day.',                                               NOW() - INTERVAL '12 days'),
  ('meeting',          'Three-way meeting: David, the roofing sub PM, and our sales engineer. Aligned on system spec, accessories list, and phased delivery schedule (60% week 3, 40% week 5).',               NOW() - INTERVAL '9 days'),
  ('quote_sent',       'Submitted final quote: 55,000 sq ft 60-mil TPO system, full accessory package, phased delivery confirmed. Total materials: $241,450. Pricing valid for 10 days.',                       NOW() - INTERVAL '6 days'),
  ('email_reply',      '"We''re going with you. Pricing works and more importantly the timeline is the only one that fits. Will have PO to you within 48 hours — do not release that delivery slot."',            NOW() - INTERVAL '3 days'),
  ('follow_up',        'PO received. Delivery slot confirmed. Production team notified. David is now an active customer — flagged for account manager handoff after project delivery.',                            NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'David Chen';

-- Nadia Okafor (lead 13) — warm, LinkedIn outreach, quote stage
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('linkedin_message', 'Sent a LinkedIn message to Nadia after Crown Commercial Contractors posted about winning a major hospital expansion contract. Flagged roofing material supply as a key procurement need.',  NOW() - INTERVAL '30 days'),
  ('email_reply',      'Nadia connected and moved to email. "The hospital project is 38,000 sq ft of TPO on the new wing. We also have a school gymnasium re-roof (12,000 sq ft) starting concurrently."',       NOW() - INTERVAL '27 days'),
  ('call',             '35-min call. Both projects have strict specs — hospital requires FM Global-approved materials; gymnasium needs impact-resistant membrane per local code. Confirmed our products qualify.',   NOW() - INTERVAL '23 days'),
  ('follow_up',        'Sent FM Global approval documentation for our 60-mil TPO and impact-resistance test reports for our IR EPDM membrane. Nadia forwarded to her project architects.',                        NOW() - INTERVAL '18 days'),
  ('sample_request',   'Architect approved both materials. Nadia requested samples for the owner''s final review — standard protocol for public institutional projects.',                                           NOW() - INTERVAL '13 days'),
  ('quote_sent',       'Submitted dual-project quote: Hospital TPO (38,000 sq ft, $4.45/sq ft) + School EPDM (12,000 sq ft, $3.90/sq ft). Bundled freight saves ~$1,800. 4-week lead time.',                    NOW() - INTERVAL '7 days'),
  ('follow_up',        'Nadia said the hospital owner is reviewing and the school district board votes on procurement next Tuesday. She expects to move forward on at least one project by end of week.',           NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'Nadia Okafor';

-- Robert Stiles (lead 14) — cold, minimal engagement
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'Cold outreach to Magnolia Building Corp after identifying two large commercial re-roof projects in their Memphis portfolio based on age and permit history.',                               NOW() - INTERVAL '45 days'),
  ('email_reply',      'Brief reply from Robert: "We''re locked into a contract with our current supplier through Q2 next year. Reach back out then."',                                                            NOW() - INTERVAL '42 days'),
  ('follow_up',        'Sent a value-add follow-up: "Understood — wanted to share our new contractor rebate program launching Q1 in case it''s useful context ahead of your Q3 procurement cycle."',             NOW() - INTERVAL '25 days'),
  ('follow_up',        'Second follow-up with a brief case study from a similar Memphis-area re-roof project. No response. Will re-engage Q2 when their contract expires.',                                        NOW() - INTERVAL '10 days')
) AS a(type, notes, occurred_at) ON l.name = 'Robert Stiles';

-- Jennifer Huang (lead 15) — new, trade show, first reply just in
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',       'Follow-up from IRE 2025. Jennifer stopped by our booth twice and asked detailed questions about our metal roofing line for high-end mixed-use developments.',                              NOW() - INTERVAL '6 days'),
  ('email_reply',      '"We have two luxury mixed-use projects in San Diego''s Little Italy neighborhood — both specify standing seam metal roofing. About 8,000 sq ft each. Can we set up a call this week?"',  NOW() - INTERVAL '3 days'),
  ('follow_up',        'Sent calendar invite for a discovery call + our standing seam metal roofing spec sheet and recent project photos from a comparable luxury development in LA.',                              NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Jennifer Huang';

-- ─── 10 Additional Leads ─────────────────────────────────────────────────────

INSERT INTO leads (name, company, role, email, phone, source, status) VALUES
  ('Sagar Naduvinkeri', 'Nexus Commercial Builders',      'Senior Procurement Manager', 's.naduvinkeri@nexuscommercial.com', '(972) 555-0318', 'Permit Filing (AI Detected)', 'hot'),
  ('Maggie Klein',      'Klein & Associates Construction', 'Principal / Owner',          'm.klein@kleinassoc.com',            '(512) 555-0742', 'LinkedIn Outreach',           'warm'),
  ('Derek Thornton',    'Thornton Real Estate Group',      'VP of Facilities',           'd.thornton@thorntonreg.com',        '(615) 555-0193', 'Referral (Apex Building)',    'warm'),
  ('Aisha Patel',       'Pinnacle Urban Development',      'Director of Construction',   'a.patel@pinnacleurbdev.com',        '(303) 555-0867', 'Website Inquiry',             'new'),
  ('Victor Reyes',      'Southwest Industrial Parks',      'Chief Estimator',            'v.reyes@swip.com',                 '(480) 555-0534', 'Permit Filing (AI Detected)', 'hot'),
  ('Samantha Burke',    'Burke Property Management',       'Head of Facilities',         's.burke@burkeproperty.com',         '(704) 555-0921', 'Trade Show (IRE 2025)',       'converted'),
  ('Omar Hassan',       'Crescent Building Co',            'VP of Procurement',          'o.hassan@crescentbuilding.com',     '(214) 555-0456', 'Cold Email',                  'cold'),
  ('Lily Chen',         'Pacific Heights Development',     'Senior Project Manager',     'l.chen@pachightsdev.com',           '(415) 555-0283', 'Referral (Turner Roofing)',   'warm'),
  ('Brandon Scott',     'Midwest Roofing Partners',        'Estimating Manager',         'b.scott@midwestroofingp.com',       '(314) 555-0619', 'Cold Email',                  'cold'),
  ('Fatima Al-Rashid',  'Global Commercial Properties',   'Director of Procurement',    'f.alrashid@globalcommercialp.com',  '(312) 555-0774', 'LinkedIn Outreach',           'new')
ON CONFLICT DO NOTHING;

-- Sagar Naduvinkeri (lead 16) — hot, permit filing, fast-moving large project
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'AI flagged a permit for a 70,000 sq ft logistics campus in Dallas by Nexus Commercial. Outreach to Sagar as procurement lead — project mobilizes in 5 weeks.',                         NOW() - INTERVAL '18 days'),
  ('email_reply',   '"Perfect timing. Our current roofing supplier pushed lead times to 8 weeks — we can''t wait that long. Can you do 4 weeks for 70K sq ft TPO?" Replied within the hour.',             NOW() - INTERVAL '17 days'),
  ('call',          '25-min call. Three-building logistics campus. Sagar needs delivery split: 40K sq ft in week 3, 30K sq ft in week 5. Our regional Dallas warehouse can hit both windows.',              NOW() - INTERVAL '15 days'),
  ('demo',          'Sagar brought his roofing sub to our Dallas warehouse. Reviewed the 60-mil TPO inventory on hand. Sub approved the membrane and accessory kit. Sagar wants the quote by EOD.',        NOW() - INTERVAL '12 days'),
  ('quote_sent',    'Submitted quote: 70,000 sq ft 60-mil TPO system — split delivery schedule confirmed. Total materials $308,000. Pricing valid 7 days given tight timeline.',                           NOW() - INTERVAL '11 days'),
  ('email_reply',   '"Numbers work. Running it by the owner today. If approved, we need PO issued by Friday to lock the delivery slot." Highest urgency deal in the pipeline.',                             NOW() - INTERVAL '8 days'),
  ('call',          'Owner approved the budget. Sagar confirmed PO is in final review with their CFO. Asked us to hold both delivery slots — gave verbal commitment.',                                      NOW() - INTERVAL '5 days'),
  ('follow_up',     'Sent delivery slot hold confirmation and counter-signed scope letter. Sagar said PO will be issued Monday morning. Deal is effectively closed pending paperwork.',                     NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'Sagar Naduvinkeri';

-- Maggie Klein (lead 17) — warm, owner of mid-size contractor, evaluating supplier switch
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('linkedin_message', 'Connected with Maggie on LinkedIn after she posted about Klein & Associates winning three commercial contracts in the Austin metro totaling $12M in construction value.',              NOW() - INTERVAL '32 days'),
  ('email_reply',      '"We self-perform roofing on most of our projects — about 8–10 commercial roofs per year. Our current material supplier has been inconsistent on quality. Happy to talk."',           NOW() - INTERVAL '29 days'),
  ('call',             '40-min call with Maggie directly. She runs a tight operation — 22 employees, all commercial work. Wants a supplier who can do net-45, provide jobsite delivery, and hold warranty.', NOW() - INTERVAL '25 days'),
  ('meeting',          'Met Maggie at their office in Austin. Walked through our TPO and modified bitumen lines. She''s done mostly mod-bit historically but is open to TPO on larger flat roofs.',          NOW() - INTERVAL '19 days'),
  ('sample_request',   'Maggie requested samples of our SBS cap sheet, 60-mil TPO, and our walkway pad system. Said her lead foreman will review before the next project spec decision.',                  NOW() - INTERVAL '14 days'),
  ('email_reply',      'Lead foreman approved the TPO sample quality. Maggie asked for a pricing sheet covering 10K–30K sq ft ranges so she can use it across multiple bids this quarter.',               NOW() - INTERVAL '8 days'),
  ('follow_up',        'Sent tiered pricing sheet and introduced our dedicated contractor portal for reorder tracking. Maggie said she has a 14,000 sq ft re-roof bid going out next week and may use us.', NOW() - INTERVAL '3 days')
) AS a(type, notes, occurred_at) ON l.name = 'Maggie Klein';

-- Derek Thornton (lead 18) — warm, referral, large property portfolio
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'Warm intro via referral from Apex Building Corp — Amanda Solis mentioned Derek manages roofing capital projects across Thornton''s 8-property commercial portfolio in Nashville.',       NOW() - INTERVAL '27 days'),
  ('email_reply',   '"Amanda speaks highly of your materials. We have three roofs due for replacement this fiscal year — two office buildings and a strip mall. Let''s talk numbers."',                      NOW() - INTERVAL '24 days'),
  ('call',          '30-min discovery call. Total scope: ~55,000 sq ft across three properties. Derek wants a single-source supplier for all three. Timeline spans Q3–Q4 this year.',                      NOW() - INTERVAL '20 days'),
  ('meeting',       'Presented our portfolio supply program at Thornton''s Nashville HQ. Covered phased delivery scheduling, volume pricing tiers, and dedicated account management.',                       NOW() - INTERVAL '14 days'),
  ('sample_request','Derek requested TPO samples for the two office buildings (flat roofs) and modified bitumen for the strip mall re-roof. Shipped overnight — his facilities team reviewing.',            NOW() - INTERVAL '9 days'),
  ('follow_up',     'Check-in on sample review. Derek confirmed the TPO quality meets their spec. Waiting on the strip mall building owner to approve the mod-bit spec before requesting a formal quote.',  NOW() - INTERVAL '3 days')
) AS a(type, notes, occurred_at) ON l.name = 'Derek Thornton';

-- Aisha Patel (lead 19) — new, website inquiry, large pipeline
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'Aisha submitted a bulk inquiry via our website — Pinnacle Urban is breaking ground on four mixed-use developments in Denver with a combined ~200,000 sq ft of flat and low-slope roofing.', NOW() - INTERVAL '3 days'),
  ('email_reply',   '"We need a supplier who can scale with our pipeline and provide consistent quality across multiple GCs. We''re especially interested in your TPO and EPDM lines. Can we schedule a call?"',   NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Aisha Patel';

-- Victor Reyes (lead 20) — hot, permit filing, urgent industrial project
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'AI detected permit filings for a new 4-building industrial park in Scottsdale by Southwest Industrial Parks — 95,000 sq ft of flat roofing, groundbreaking in 6 weeks.',                NOW() - INTERVAL '21 days'),
  ('email_reply',   '"Timing is critical. Our supplier for this project just told us they can''t hit our start date. What''s your fastest lead time for 95K sq ft of TPO?" Replied same day.',               NOW() - INTERVAL '20 days'),
  ('call',          '20-min call. Victor needs phased delivery across 4 buildings over 10 weeks. We confirmed our Phoenix distribution center can handle it. He wants a site visit before committing.',        NOW() - INTERVAL '17 days'),
  ('site_visit',    'Victor and the GC''s project manager walked our Phoenix facility. Confirmed inventory levels for the full TPO system. GC approved our loading dock access for just-in-time delivery.',   NOW() - INTERVAL '13 days'),
  ('demo',          'Full product walkthrough with Victor''s roofing sub. Reviewed seam tape, termination details, and accessory kit compatibility. Sub confirmed our system matches their installation method.',NOW() - INTERVAL '10 days'),
  ('quote_sent',    'Submitted 4-building phased quote: 95,000 sq ft 60-mil TPO system, $3.95/sq ft. Phased delivery weeks 2, 4, 7, 9. Total materials: $375,250. Pricing valid 10 days.',                  NOW() - INTERVAL '7 days'),
  ('email_reply',   '"Pricing is competitive and the delivery plan works. Taking it to ownership for sign-off tomorrow. Expect PO by end of week."',                                                           NOW() - INTERVAL '4 days'),
  ('follow_up',     'Victor confirmed ownership approved. PO is being drafted. Asked to confirm our insurance certificates are on file — sent immediately. Deal closing this week.',                           NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Victor Reyes';

-- Samantha Burke (lead 21) — converted, signed 2-year supply agreement
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'Follow-up from IRE 2025. Samantha visited our booth and asked specifically about our preferred-vendor program for property management companies.',                                        NOW() - INTERVAL '50 days'),
  ('email_reply',   '"We manage 19 commercial properties in the Charlotte metro. We re-roof 4–5 per year. If your quality and lead times are consistent, we''d consider making you our primary supplier."',  NOW() - INTERVAL '47 days'),
  ('call',          '35-min discovery call. Burke Property manages Class B and Class C commercial properties. Most roofs are TPO or BUR. Samantha is the sole decision-maker for all procurement.',          NOW() - INTERVAL '43 days'),
  ('meeting',       'In-person meeting at Burke''s Charlotte office. Presented our preferred-vendor program: volume pricing, dedicated rep, 72-hour emergency fulfillment, net-45 terms.',                   NOW() - INTERVAL '37 days'),
  ('sample_request','Samantha requested samples of our 45-mil and 60-mil TPO lines plus our EPDM membrane. She wants to standardize on one system across the entire portfolio.',                             NOW() - INTERVAL '32 days'),
  ('email_reply',   'Materials committee approved the 60-mil TPO as their new standard. Samantha asked for a 2-year pricing agreement with locked-in rates and annual volume commitments.',                  NOW() - INTERVAL '25 days'),
  ('quote_sent',    'Submitted 2-year preferred-vendor agreement: locked 60-mil TPO pricing at $4.05/sq ft through 2027, 10% volume rebate above 60,000 sq ft/year, dedicated account manager.',           NOW() - INTERVAL '18 days'),
  ('meeting',       'Contract review with Samantha and Burke''s legal counsel. Minor revision to payment terms — agreed on net-45 with 1.5% early payment discount.',                                        NOW() - INTERVAL '11 days'),
  ('email_reply',   'Contract signed by both parties. Samantha issued first PO: 22,000 sq ft TPO for their Uptown Charlotte office re-roof. Delivery confirmed for next month.',                            NOW() - INTERVAL '5 days'),
  ('follow_up',     'Sent onboarding materials, introduced dedicated account manager, and set up Burke''s reorder portal access. Full 2-year agreement active. Flagship converted account.',                 NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'Samantha Burke';

-- Omar Hassan (lead 22) — cold, competitor locked in
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'Cold outreach to Crescent Building Co after their announcement of a 65,000 sq ft office complex in Frisco, TX. Omar handles all roofing material procurement.',                         NOW() - INTERVAL '38 days'),
  ('email_reply',   'Brief reply: "We have a long-standing relationship with our current supplier. Not looking to switch, but I''ll keep your info on file." Polite but non-committal.',                     NOW() - INTERVAL '35 days'),
  ('follow_up',     'Sent a comparison one-pager highlighting our warranty terms vs industry standard and our 72-hr emergency fulfillment program. No response.',                                             NOW() - INTERVAL '22 days'),
  ('follow_up',     'Final outreach: offered a no-commitment pilot on a small project to demonstrate quality. Still no reply. Will add to long-term nurture sequence.',                                       NOW() - INTERVAL '8 days')
) AS a(type, notes, occurred_at) ON l.name = 'Omar Hassan';

-- Lily Chen (lead 23) — warm, referral, multi-building mixed-use
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'Warm intro from Turner Roofing — Lily is PM on a 3-building mixed-use development in San Francisco''s Mission District. Total roofing scope ~42,000 sq ft including green roof sections.', NOW() - INTERVAL '29 days'),
  ('email_reply',   '"Turner spoke highly of your TPO quality and lead times. We have a tight construction schedule — Building 1 needs materials in 7 weeks. Can you handle it?"',                             NOW() - INTERVAL '26 days'),
  ('call',          '30-min call. Building 1 is 16,000 sq ft flat TPO. Buildings 2 and 3 are 13,000 sq ft each with partial green roof assemblies over EPDM. Complex spec but manageable.',                  NOW() - INTERVAL '22 days'),
  ('sample_request','Lily requested samples of our 60-mil EPDM (for green roof base), drainage mat, and TPO for Building 1. Also requested our green roof assembly technical guide.',                        NOW() - INTERVAL '17 days'),
  ('email_reply',   'Architect reviewed samples and approved both the EPDM base and TPO specs. Lily asked for a phased quote covering all three buildings with Building 1 prioritized.',                     NOW() - INTERVAL '11 days'),
  ('quote_sent',    'Submitted phased quote: Building 1 TPO $68,800 (week 7), Buildings 2+3 EPDM + drainage package $109,200 (weeks 12-14). Total: $178,000.',                                              NOW() - INTERVAL '6 days'),
  ('follow_up',     'Lily confirmed Building 1 quote is approved internally. Buildings 2 and 3 are pending city permitting. Expects Building 1 PO within 10 days.',                                         NOW() - INTERVAL '2 days')
) AS a(type, notes, occurred_at) ON l.name = 'Lily Chen';

-- Brandon Scott (lead 24) — cold, brief interest then silent
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('email_sent',    'Cold outreach to Midwest Roofing Partners — Brandon oversees estimating for their commercial division, which does ~30 re-roofs per year across Missouri and Illinois.',                  NOW() - INTERVAL '42 days'),
  ('email_reply',   '"We buy a lot of material. What''s your pricing on 60-mil TPO in volume? And do you have distribution in St. Louis?" Brief but showed some interest.',                                   NOW() - INTERVAL '39 days'),
  ('call',          '15-min call. Brandon is price-driven — his current supplier gives him net-30 and stock at a local depot. He''s interested only if we can match pricing and local availability.',         NOW() - INTERVAL '35 days'),
  ('follow_up',     'Sent St. Louis distribution capability confirmation and competitive volume pricing. Brandon said he''d "take a look." No response since.',                                               NOW() - INTERVAL '20 days'),
  ('follow_up',     'Second follow-up with a contractor rebate program overview. No response. Likely price-anchored to current supplier.',                                                                    NOW() - INTERVAL '7 days')
) AS a(type, notes, occurred_at) ON l.name = 'Brandon Scott';

-- Fatima Al-Rashid (lead 25) — new, LinkedIn, large international portfolio
INSERT INTO lead_activities (lead_id, type, notes, occurred_at)
SELECT l.id, a.type, a.notes, a.occurred_at
FROM leads l
JOIN (VALUES
  ('linkedin_message', 'Connected with Fatima on LinkedIn after Global Commercial Properties posted about their US expansion — 6 new commercial developments planned across Chicago, Houston, and Miami.',      NOW() - INTERVAL '5 days'),
  ('email_reply',      '"We manage 40+ properties globally and are scaling our US portfolio significantly. We need a reliable domestic roofing supplier who can support multi-city projects. Let''s connect."',  NOW() - INTERVAL '3 days'),
  ('follow_up',        'Sent an introduction to our national distribution network and multi-site account program. Proposed a discovery call this week to understand their US project pipeline.',                NOW() - INTERVAL '1 day')
) AS a(type, notes, occurred_at) ON l.name = 'Fatima Al-Rashid';
