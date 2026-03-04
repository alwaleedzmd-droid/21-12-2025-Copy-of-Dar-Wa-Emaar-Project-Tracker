-- جدول لحفظ لقطات الإحصائيات اليومية
CREATE TABLE IF NOT EXISTS statistics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  total_projects INTEGER DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  
  total_works INTEGER DEFAULT 0,
  completed_works INTEGER DEFAULT 0,
  overdue_works INTEGER DEFAULT 0,
  
  total_technical_requests INTEGER DEFAULT 0,
  completed_technical_requests INTEGER DEFAULT 0,
  total_deed_requests INTEGER DEFAULT 0,
  completed_deed_requests INTEGER DEFAULT 0,
  
  total_assignments INTEGER DEFAULT 0,
  pending_assignments INTEGER DEFAULT 0,
  
  raw_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON statistics_snapshots(snapshot_date DESC);

ALTER TABLE statistics_snapshots ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بالقراءة والإدراج (بما فيهم anon للديمو)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'snapshots_select_all' AND tablename = 'statistics_snapshots') THEN
    CREATE POLICY "snapshots_select_all" ON statistics_snapshots FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'snapshots_insert_all' AND tablename = 'statistics_snapshots') THEN
    CREATE POLICY "snapshots_insert_all" ON statistics_snapshots FOR INSERT WITH CHECK (true);
  END IF;
END $$;
