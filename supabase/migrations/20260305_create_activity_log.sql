-- سجل نشاطات النظام — يحفظ كل إجراء مهم
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  user_id UUID,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT '',
  
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  
  description TEXT NOT NULL,
  old_value JSONB DEFAULT '{}',
  new_value JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(action_type);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بالقراءة والإدراج (بما فيهم anon للديمو)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activity_select_all' AND tablename = 'activity_log') THEN
    CREATE POLICY "activity_select_all" ON activity_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activity_insert_all' AND tablename = 'activity_log') THEN
    CREATE POLICY "activity_insert_all" ON activity_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;
