#!/bin/bash
# Creates the Authentik database on first PostgreSQL container start.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE ${AUTHENTIK_DB_NAME:-authentik}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${AUTHENTIK_DB_NAME:-authentik}')\\gexec
EOSQL
