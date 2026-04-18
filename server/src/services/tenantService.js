import { prisma } from '../lib/prisma.js';

export const resolveCompanyId = async (user) => {
  if (user?.companyId) {
    return user.companyId;
  }

  if (!user?.id) {
    return null;
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true },
  });

  return record?.company_id || null;
};
