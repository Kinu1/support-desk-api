import {
  PrismaClient,
  TicketEventType,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@supportdesk.test' },
    update: {},
    create: {
      name: 'Admin Support Desk',
      email: 'admin@supportdesk.test',
      passwordHash: '$2b$10$seed.hash.placeholder.admin',
      role: UserRole.ADMIN,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@supportdesk.test' },
    update: {},
    create: {
      name: 'Support Agent',
      email: 'agent@supportdesk.test',
      passwordHash: '$2b$10$seed.hash.placeholder.agent',
      role: UserRole.AGENT,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@supportdesk.test' },
    update: {},
    create: {
      name: 'Customer Demo',
      email: 'customer@supportdesk.test',
      passwordHash: '$2b$10$seed.hash.placeholder.customer',
      role: UserRole.CUSTOMER,
    },
  });

  const ticket = await prisma.ticket.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Nao consigo acessar o painel',
      description: 'O login retorna erro mesmo com as credenciais corretas.',
      category: 'access',
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      customerId: customer.id,
      agentId: agent.id,
    },
  });

  await prisma.ticketComment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000101',
      ticketId: ticket.id,
      authorId: customer.id,
      body: 'Preciso de ajuda para recuperar o acesso.',
    },
  });

  await prisma.ticketEvent.upsert({
    where: { id: '00000000-0000-4000-8000-000000000201' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000201',
      ticketId: ticket.id,
      actorId: admin.id,
      type: TicketEventType.CREATED,
      field: 'status',
      newValue: TicketStatus.OPEN,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
