import { prisma } from '@/lib/prisma';

interface LogInput {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
}

// Fire-and-forget activity logging. Never throws — logging must not break the
// main request flow.
export async function logActivity(input: LogInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        details: input.details ?? null,
      },
    });
  } catch (err) {
    console.error('logActivity failed:', err);
  }
}
