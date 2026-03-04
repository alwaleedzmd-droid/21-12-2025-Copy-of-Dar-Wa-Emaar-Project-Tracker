-- إضافة إحداثيات جغرافية لجدول المشاريع
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS map_zone TEXT DEFAULT '';

-- تحديث المشاريع الحالية بإحداثيات الرياض كافتراضية
UPDATE projects SET latitude = 24.7136, longitude = 46.6753 WHERE latitude IS NULL;
