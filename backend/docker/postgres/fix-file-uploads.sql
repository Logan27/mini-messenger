-- Fix file_uploads table columns to camelCase
ALTER TABLE file_uploads RENAME COLUMN virus_scan_status TO "virusScanStatus";
ALTER TABLE file_uploads RENAME COLUMN virus_scan_result TO "virusScanResult";
ALTER TABLE file_uploads RENAME COLUMN is_quarantined TO "isQuarantined";

-- Check if groups table has all camelCase columns
-- (it should from the previous migration but let's verify)
