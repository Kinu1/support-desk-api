import { ForbiddenException } from '@nestjs/common';
import { TicketPriority, TicketStatus, UserRole } from '@prisma/client';

import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  const now = new Date('2026-05-19T12:00:00.000Z');
  const ticket = {
    id: 'ticket-id',
    title: 'Nao consigo acessar',
    description: 'Login retorna erro inesperado.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: 'access',
    customerId: 'customer-id',
    agentId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  it('blocks non-customers from creating tickets', async () => {
    const service = new TicketsService({} as never);

    await expect(
      service.createTicket(
        {
          title: 'Nao consigo acessar',
          description: 'Login retorna erro inesperado.',
          category: 'access',
        },
        {
          sub: 'agent-id',
          email: 'agent@example.com',
          role: UserRole.AGENT,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a ticket for the authenticated customer', async () => {
    const prisma = {
      ticket: {
        create: jest.fn().mockResolvedValue(ticket),
      },
    };
    const service = new TicketsService(prisma as never);

    await expect(
      service.createTicket(
        {
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: TicketPriority.MEDIUM,
        },
        {
          sub: 'customer-id',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER,
        },
      ),
    ).resolves.toMatchObject({
      id: 'ticket-id',
      customerId: 'customer-id',
      status: TicketStatus.OPEN,
    });
    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: {
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: TicketPriority.MEDIUM,
        customerId: 'customer-id',
      },
    });
  });

  it('blocks customers from reading tickets owned by another customer', async () => {
    const prisma = {
      ticket: {
        findUnique: jest.fn().mockResolvedValue(ticket),
      },
    };
    const service = new TicketsService(prisma as never);

    await expect(
      service.getTicketById('ticket-id', {
        sub: 'other-customer-id',
        email: 'other@example.com',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
