CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  owner_uuid TEXT NOT NULL,
  title TEXT NOT NULL,
  source_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  adaptation_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_materials_owner_updated_at
ON materials(owner_uuid, updated_at DESC);
