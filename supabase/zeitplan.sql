-- Zeitplan-Einträge für Projekte
CREATE TABLE IF NOT EXISTS zeitplan_eintraege (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  uhrzeit text,
  programmpunkt text NOT NULL,
  ort text,
  verantwortlich text,
  bemerkung text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE zeitplan_eintraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read zeitplan"
  ON zeitplan_eintraege FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert zeitplan"
  ON zeitplan_eintraege FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update zeitplan"
  ON zeitplan_eintraege FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated users can delete zeitplan"
  ON zeitplan_eintraege FOR DELETE TO authenticated USING (true);
