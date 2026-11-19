-- Zeitplan column management (extra, hidden, ordering)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS zeitplan_extra_columns text[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS zeitplan_hidden_columns text[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS zeitplan_column_order text[] DEFAULT NULL;

-- Extra JSONB data per Zeitplan entry for custom columns
ALTER TABLE zeitplan_eintraege ADD COLUMN IF NOT EXISTS extra jsonb DEFAULT NULL;

-- Allow null programmpunkt (for empty newly added rows)
ALTER TABLE zeitplan_eintraege ALTER COLUMN programmpunkt DROP NOT NULL;
