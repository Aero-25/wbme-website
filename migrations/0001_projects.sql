-- WBME projects blog on Cloudflare D1 (replaces the Supabase "projects" table).
-- Apply with: wrangler d1 execute wbme --remote --file=migrations/0001_projects.sql
CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  discipline   TEXT NOT NULL DEFAULT 'General',
  summary      TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  cover_path   TEXT NOT NULL,
  gallery      TEXT NOT NULL DEFAULT '[]',   -- JSON array of media paths
  published    INTEGER NOT NULL DEFAULT 1,
  project_date TEXT NOT NULL DEFAULT (date('now')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS projects_listing ON projects (published, project_date DESC, created_at DESC);
