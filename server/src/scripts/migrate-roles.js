/**
 * Recovery script - hoàn thiện migration gộp role
 * DB state: users.role đã dùng UserRole_new, invitation_tokens.role vẫn còn UserRole cũ
 */
import { prisma } from '../lib/prisma.js';

async function migrate() {
  console.log('🚀 Tiếp tục migration...\n');

  // Bước 1: Chuẩn hóa invitation_tokens (vẫn dùng UserRole cũ)
  console.log('📝 Bước 1: Chuẩn hóa invitation_tokens...');
  await prisma.$executeRawUnsafe(`UPDATE invitation_tokens SET role = 'admin' WHERE role = 'owner'`);
  await prisma.$executeRawUnsafe(`UPDATE invitation_tokens SET role = 'member' WHERE role = 'viewer'`);
  console.log('  ✓ Đã cập nhật invitation_tokens\n');

  // Bước 2: Chuyển invitation_tokens.role sang UserRole_new
  console.log('📝 Bước 2: Đổi kiểu cột invitation_tokens.role...');
  await prisma.$executeRawUnsafe(`ALTER TABLE invitation_tokens ALTER COLUMN role DROP DEFAULT`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE invitation_tokens ALTER COLUMN role TYPE "UserRole_new" USING role::text::"UserRole_new"`
  );
  console.log('  ✓ invitation_tokens.role đã dùng UserRole_new\n');

  // Bước 3: Xóa UserRole cũ, đổi tên UserRole_new → UserRole
  console.log('📝 Bước 3: Hoàn thiện enum...');
  await prisma.$executeRawUnsafe(`DROP TYPE "UserRole"`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole_new" RENAME TO "UserRole"`);
  console.log('  ✓ Enum UserRole giờ chỉ còn: admin, member\n');

  // Bước 4: Xóa is_super_admin
  console.log('📝 Bước 4: Xóa cột is_super_admin...');
  await prisma.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN IF EXISTS is_super_admin`);
  console.log('  ✓ Đã xóa is_super_admin\n');

  // Kiểm tra kết quả
  const users = await prisma.$queryRawUnsafe(`SELECT email, role FROM users ORDER BY role, email`);
  console.log('📊 Users sau migration:');
  users.forEach(u => console.log(`  [${u.role}] ${u.email}`));

  console.log('\n✅ Migration hoàn tất!');
  await prisma.$disconnect();
}

migrate().catch(async (err) => {
  console.error('❌ Lỗi:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
