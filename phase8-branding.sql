-- ── Branding fields on organisations ───────────────────────────────
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS logo_url            text,
  ADD COLUMN IF NOT EXISTS brand_color         text    DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS company_display_name text;

-- Allow hosts to read and update their own org branding
CREATE POLICY IF NOT EXISTS "org members can read org" ON organisations
  FOR SELECT USING (
    id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "hosts can update org branding" ON organisations
  FOR UPDATE USING (
    id IN (SELECT organisation_id FROM profiles WHERE id = auth.uid() AND role IN ('host','cohost'))
  );
