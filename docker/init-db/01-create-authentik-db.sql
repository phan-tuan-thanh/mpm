-- Create separate database for Authentik if it doesn't exist
-- This script runs on first PostgreSQL container initialization

SELECT 'CREATE DATABASE authentik'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'authentik')\gexec
