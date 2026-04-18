/**
 * Fix user role for testing
 * Updates test@company.vn role to 'admin' to enable review and delete operations
 */

import { prisma } from '../server/src/lib/prisma.js';

async function fixUserRole() {
  try {
    console.log('🔍 Checking current user role...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'test@company.vn' },
      select: { id: true, email: true, role: true, is_super_admin: true }
    });

    if (!user) {
      console.log('❌ User test@company.vn not found!');
      process.exit(1);
    }

    console.log('📋 Current status:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Is Super Admin: ${user.is_super_admin}\n`);

    // Update role to admin
    console.log('⚙️  Updating role to admin...\n');
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { 
        role: 'admin',
        is_super_admin: true  // Also make super admin for full access
      },
      select: { id: true, email: true, role: true, is_super_admin: true }
    });

    console.log('✅ Update successful!');
    console.log('📋 New status:');
    console.log(`   Email: ${updated.email}`);
    console.log(`   Role: ${updated.role}`);
    console.log(`   Is Super Admin: ${updated.is_super_admin}\n`);

    console.log('💡 Next steps:');
    console.log('   1. Logout from the web application');
    console.log('   2. Login again with test@company.vn / Test@12345');
    console.log('   3. Try AI Review and Delete again\n');

    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserRole();
