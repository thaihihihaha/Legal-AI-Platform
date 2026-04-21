/**
 * Script dọn dẹp các user soft-deleted cũ (email bắt đầu bằng "deleted_")
 * Chạy 1 lần: node src/scripts/cleanup-deleted-users.js
 */
import { prisma } from '../lib/prisma.js';

async function cleanup() {
  console.log('🔍 Tìm các user soft-deleted...');

  const deletedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { deleted_at: { not: null } },
        { email: { startsWith: 'deleted_' } },
      ],
    },
    select: { id: true, email: true, full_name: true },
  });

  if (!deletedUsers.length) {
    console.log('✅ Không có user nào cần dọn dẹp.');
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Tìm thấy ${deletedUsers.length} user soft-deleted:`);
  deletedUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  const ids = deletedUsers.map(u => u.id);

  console.log('\n🔄 Bắt đầu dọn dẹp trong transaction...');

  await prisma.$transaction(async (tx) => {
    // Orphan tài liệu & hợp đồng
    const docs = await tx.document.updateMany({ where: { uploaded_by: { in: ids } }, data: { uploaded_by: null } });
    const contracts = await tx.contract.updateMany({ where: { uploaded_by: { in: ids } }, data: { uploaded_by: null } });
    console.log(`  ✓ Orphaned ${docs.count} tài liệu, ${contracts.count} hợp đồng`);

    // Xóa drafts
    const drafts = await tx.draftGenerated.deleteMany({ where: { user_id: { in: ids } } });
    console.log(`  ✓ Đã xóa ${drafts.count} bản nháp`);

    // Hard delete tất cả user soft-deleted
    for (const user of deletedUsers) {
      try {
        await tx.user.delete({ where: { id: user.id } });
        console.log(`  ✓ Đã xóa user: ${user.email}`);
      } catch (err) {
        console.error(`  ✗ Lỗi khi xóa ${user.email}:`, err.message);
      }
    }
  });

  console.log('\n✅ Dọn dẹp hoàn tất! Database đã sạch.');
  await prisma.$disconnect();
}

cleanup().catch(async (err) => {
  console.error('❌ Lỗi:', err);
  await prisma.$disconnect();
  process.exit(1);
});
