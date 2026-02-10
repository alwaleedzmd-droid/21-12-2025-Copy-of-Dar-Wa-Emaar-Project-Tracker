-- Drops unused legacy tables. Confirmed by user.

DROP TABLE IF EXISTS clearance_requests CASCADE;
DROP TABLE IF EXISTS clearance_items CASCADE;
DROP TABLE IF EXISTS deed_comments CASCADE;
DROP TABLE IF EXISTS request_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS tech_request_comments CASCADE;
