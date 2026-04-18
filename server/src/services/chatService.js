import { prisma } from '../lib/prisma.js';

export const ensureDefaultSession = async (companyId, userId) => {
  const existing = await prisma.chatSession.findFirst({
    where: {
      company_id: companyId,
      user_id: userId,
      status: 'active',
    },
    orderBy: {
      last_message_at: 'desc',
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.chatSession.create({
    data: {
      company_id: companyId,
      user_id: userId,
      title: 'Phiên chat pháp lý',
      agent_type: 'qa',
      status: 'active',
      message_count: 0,
      last_message_at: new Date(),
      metadata: {},
    },
  });
};

export const appendChatMessages = async ({ sessionId, companyId, userMessage, aiMessage }) => {
  const serializedAiMessage = typeof aiMessage === 'string' ? aiMessage : JSON.stringify(aiMessage);

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        session_id: sessionId,
        company_id: companyId,
        role: 'user',
        content: userMessage,
        metadata: {},
      },
    });

    await tx.message.create({
      data: {
        session_id: sessionId,
        company_id: companyId,
        role: 'assistant',
        content: serializedAiMessage,
        metadata: {},
      },
    });

    await tx.chatSession.update({
      where: { id: sessionId },
      data: {
        message_count: {
          increment: 2,
        },
        last_message_at: new Date(),
      },
    });
  });
};
