-- Versteckte (gelöschte) Standardspalten pro Projekt
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hidden_columns text[] DEFAULT '{}';
