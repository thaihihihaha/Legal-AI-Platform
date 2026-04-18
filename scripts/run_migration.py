import os
from dotenv import load_dotenv
#!/usr/bin/env python3
"""
Run migration_auth.sql on Supabase database
"""
import psycopg2
import sys

# Load environment variables from .env file
load_dotenv()

DB_CONFIG = {
    "host": os.getenv("SUPABASE_DB_HOST") or os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("SUPABASE_DB_PORT") or os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME") or os.getenv("POSTGRES_DB", "postgres"),
    "user": os.getenv("DB_USER") or os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD", ""),
    "sslmode": os.getenv("DB_SSL_MODE", "disable") # Default to disable for local DB
}

def run_migration():
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Run base migration v1
        print("Running migration_v1.sql...")
        with open("scripts/migration_v1.sql", "r", encoding="utf-8") as f:
            cur.execute(f.read())
            
        # Run auth migration
        print("Running migration_auth.sql...")
        with open("scripts/migration_auth.sql", "r", encoding="utf-8") as f:
            cur.execute(f.read())
            
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
        # Verify
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('auth_id', 'password_hash', 'user_settings')")
        results = cur.fetchall()
        print(f"✅ Verified columns added to users table: {[r[0] for r in results]}")
        
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'company_invites'")
        if cur.fetchone():
            print("✅ Verified company_invites table created")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
