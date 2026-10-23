-- Website assistant: enquiries it takes down, and a usage log for rate limits.
-- The Pages Functions create these tables on first use (functions/_shared/assistant-store.js),
-- so applying this by hand is optional:
--   wrangler d1 execute wbme --remote --file=migrations/0002_assistant.sql
CREATE TABLE IF NOT EXISTS enquiries (
  id         TEXT PRIMARY KEY,
  ref        TEXT NOT NULL,                 -- shown to the visitor, e.g. WB-7K3Q
  sid        TEXT,                          -- chat session, so corrections update one record
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  status     TEXT NOT NULL DEFAULT 'new',   -- new | handled
  source     TEXT NOT NULL DEFAULT 'assistant',
  name       TEXT NOT NULL,
  company    TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  vessel     TEXT NOT NULL DEFAULT '',
  service    TEXT NOT NULL DEFAULT 'General',
  urgency    TEXT NOT NULL DEFAULT 'planned',
  job        TEXT NOT NULL,
  page       TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '[]'     -- JSON [{r:'v'|'a', t}] of the chat, last 16 messages
);
CREATE INDEX IF NOT EXISTS enquiries_created ON enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_sid ON enquiries (sid, created_at DESC);
CREATE TABLE IF NOT EXISTS chat_usage (k TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS chat_usage_k_ts ON chat_usage (k, ts);
CREATE INDEX IF NOT EXISTS chat_usage_ts ON chat_usage (ts);
