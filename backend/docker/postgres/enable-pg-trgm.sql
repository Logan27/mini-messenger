-- Enable pg_trgm extension for trigram similarity search and fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';

-- Create GIN indexes for full-text search on users table
CREATE INDEX IF NOT EXISTS idx_users_search_gin ON users USING gin(
  to_tsvector('english',
    COALESCE(username, '') || ' ' ||
    COALESCE("firstName", '') || ' ' ||
    COALESCE("lastName", '') || ' ' ||
    COALESCE(email, '')
  )
);

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_firstname_trgm ON users USING gin("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_lastname_trgm ON users USING gin("lastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin(email gin_trgm_ops);

COMMENT ON EXTENSION pg_trgm IS 'Trigram similarity and fuzzy string matching for user search';
