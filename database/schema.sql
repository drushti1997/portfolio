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
