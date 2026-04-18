#!/bin/bash

# Check and update user role for test@company.vn

echo "Checking user role..."

# Connect to database and check current role
psql "$DATABASE_URL" -c "
SELECT id, email, role, is_super_admin 
FROM users 
WHERE email = 'test@company.vn' 
LIMIT 1;
"

echo ""
echo "Updating role to 'admin'..."

# Update role to admin
psql "$DATABASE_URL" -c "
UPDATE users 
SET role = 'admin' 
WHERE email = 'test@company.vn';
"

echo ""
echo "Verifying update..."

# Verify update
psql "$DATABASE_URL" -c "
SELECT id, email, role, is_super_admin 
FROM users 
WHERE email = 'test@company.vn' 
LIMIT 1;
"

echo "✅ Done! Please logout and login again to refresh the token."
