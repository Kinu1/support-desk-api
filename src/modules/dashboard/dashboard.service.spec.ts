import { TicketPriority, TicketStatus, UserRole } from '@prisma/client';

import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('returns scoped ticket metrics for an agent', async () => {
    const createdAt = new Date('2026-05-19T10:00:00.000Z');
    const resolvedAt = new Date('2026-05-19T14:00:00.000Z');
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([
        2,
        1,
        1,
        1,
        0,
        1,
        0,
        1,
        0,
        [{ createdAt, resolvedAt }],
      ]),
      ticket: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const service = new DashboardService(prisma as never);

    await expect(
      service.getSummary({
        sub: 'agent-id',
        email: 'agent@example.com',
        role: UserRole.AGENT,
      }),
    ).resolves.toEqual({
      scope: UserRole.AGENT,
      totalTickets: 2,
      openTickets: 1,
      urgentTickets: 1,
      resolvedTickets: 1,
      averageResolutionHours: 4,
      byStatus: {
        [TicketStatus.OPEN]: 0,
        [TicketStatus.IN_PROGRESS]: 1,
        [TicketStatus.WAITING_CUSTOMER]: 0,
        [TicketStatus.RESOLVED]: 1,
        [TicketStatus.CLOSED]: 0,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.ticket.count).toHaveBeenCalledWith({
      where: { agentId: 'agent-id' },
    });
    expect(prisma.ticket.count).toHaveBeenCalledWith({
      where: { agentId: 'agent-id', priority: TicketPriority.URGENT },
    });
  });
});
