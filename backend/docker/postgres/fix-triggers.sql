-- Fix triggers to use camelCase column names

-- Drop old trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create new trigger function with camelCase
CREATE OR REPLACE FUNCTION "updateUpdatedAt"()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers on all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();
