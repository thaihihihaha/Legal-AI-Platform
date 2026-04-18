-- Fix user role for test@company.vn to admin
-- Run this script to grant admin role to the test user

BEGIN;

-- Check current role
SELECT id, email, role, is_super_admin 
FROM users 
WHERE email = 'test@company.vn';

-- Update role to admin
UPDATE users 
SET role = 'admin'::user_role 
WHERE email = 'test@company.vn';

-- Verify update
SELECT id, email, role, is_super_admin 
FROM users 
WHERE email = 'test@company.vn';

COMMIT;
