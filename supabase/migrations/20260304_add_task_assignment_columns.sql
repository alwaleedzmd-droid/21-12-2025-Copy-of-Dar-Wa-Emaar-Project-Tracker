-- إضافة أعمدة الإسناد لجدول أعمال المشاريع
ALTER TABLE project_works ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);
ALTER TABLE project_works ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
ALTER TABLE project_works ADD COLUMN IF NOT EXISTS assignment_description TEXT;
ALTER TABLE project_works ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE project_works ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'in_progress', 'completed', 'overdue'));
ALTER TABLE project_works ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- فهرس للبحث السريع حسب المسنَد إليه
CREATE INDEX IF NOT EXISTS idx_project_works_assigned_to ON project_works(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_works_assignment_status ON project_works(assignment_status);
CREATE INDEX IF NOT EXISTS idx_project_works_assigned_at ON project_works(assigned_at);
