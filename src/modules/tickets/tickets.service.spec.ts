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
    const tx = {
      ticket: {
        create: jest.fn().mockResolvedValue(ticket),
      },
      ticketEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (txClient: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
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
    expect(tx.ticket.create).toHaveBeenCalledWith({
      data: {
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: TicketPriority.MEDIUM,
        customerId: 'customer-id',
      },
    });
    expect(tx.ticketEvent.create).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket-id',
        actorId: 'customer-id',
        type: 'CREATED',
        field: 'status',
        newValue: TicketStatus.OPEN,
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

  it('blocks customers from creating internal comments', async () => {
    const prisma = {
      ticket: {
        findUnique: jest.fn().mockResolvedValue(ticket),
      },
    };
    const service = new TicketsService(prisma as never);

    await expect(
      service.createComment(
        'ticket-id',
        {
          body: 'Internal note',
          isInternal: true,
        },
        {
          sub: 'customer-id',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists only scoped tickets for a customer', async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[ticket], 1]),
      ticket: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    const service = new TicketsService(prisma as never);

    await expect(
      service.listTickets(
        { page: 1, limit: 20 },
        {
          sub: 'customer-id',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER,
        },
      ),
    ).resolves.toMatchObject({
      data: [expect.objectContaining({ id: 'ticket-id' })],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-id' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('lets an agent update and assume an unassigned ticket', async () => {
    const updatedTicket = { ...ticket, agentId: 'agent-id' };
    const tx = {
      ticket: {
        update: jest.fn().mockResolvedValue(updatedTicket),
      },
      ticketEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const prisma = {
      ticket: {
        findUnique: jest.fn().mockResolvedValue(ticket),
      },
      $transaction: jest.fn((callback: (txClient: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const service = new TicketsService(prisma as never);

    await expect(
      service.updateTicket(
        'ticket-id',
        {
          status: TicketStatus.IN_PROGRESS,
          priority: TicketPriority.HIGH,
        },
        {
          sub: 'agent-id',
          email: 'agent@example.com',
          role: UserRole.AGENT,
        },
      ),
    ).resolves.toMatchObject({ agentId: 'agent-id' });
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-id' },
      data: {
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
        agent: { connect: { id: 'agent-id' } },
      },
    });
    expect(tx.ticketEvent.createMany).toHaveBeenCalled();
  });

  it('filters internal comments from customer responses', async () => {
    const publicComment = {
      id: 'comment-id',
      ticketId: 'ticket-id',
      authorId: 'customer-id',
      body: 'Public comment',
      isInternal: false,
      createdAt: now,
      updatedAt: now,
    };
    const prisma = {
      ticket: {
        findUnique: jest.fn().mockResolvedValue(ticket),
      },
      ticketComment: {
        findMany: jest.fn().mockResolvedValue([publicComment]),
      },
    };
    const service = new TicketsService(prisma as never);

    await expect(
      service.listComments('ticket-id', {
        sub: 'customer-id',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
      }),
    ).resolves.toEqual([
      {
        id: publicComment.id,
        ticketId: publicComment.ticketId,
        authorId: publicComment.authorId,
        body: publicComment.body,
        isInternal: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ]);
    expect(prisma.ticketComment.findMany).toHaveBeenCalledWith({
      where: { ticketId: 'ticket-id', isInternal: false },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('creates comments and audit events in one transaction', async () => {
    const comment = {
      id: 'comment-id',
      ticketId: 'ticket-id',
      authorId: 'agent-id',
      body: 'Internal note',
      isInternal: true,
      createdAt: now,
      updatedAt: now,
    };
    const tx = {
      ticketComment: {
        create: jest.fn().mockResolvedValue(comment),
      },
      ticketEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      ticket: {
        findUnique: jest.fn().mockResolvedValue({ ...ticket, agentId: 'agent-id' }),
      },
      $transaction: jest.fn((callback: (txClient: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const service = new TicketsService(prisma as never);

    await expect(
      service.createComment(
        'ticket-id',
        { body: 'Internal note', isInternal: true },
        {
          sub: 'agent-id',
          email: 'agent@example.com',
          role: UserRole.AGENT,
        },
      ),
    ).resolves.toMatchObject({ id: 'comment-id', isInternal: true });
    expect(tx.ticketEvent.create).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket-id',
        actorId: 'agent-id',
        type: 'COMMENTED',
        field: 'internalComment',
        newValue: 'comment-id',
      },
    });
  });
});
