import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Ticket,
  TicketStatus,
  UserRole,
} from '@prisma/client';

import { AuthenticatedUser } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { PaginatedTicketsResponseDto } from './dto/paginated-tickets-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(
    dto: CreateTicketDto,
    currentUser: AuthenticatedUser,
  ): Promise<TicketResponseDto> {
    if (currentUser.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can create tickets');
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        customerId: currentUser.sub,
      },
    });

    return this.toTicketResponse(ticket);
  }

  async listTickets(
    query: ListTicketsQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedTicketsResponseDto> {
    const where = this.buildTicketWhere(query, currentUser);
    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets.map((ticket) => this.toTicketResponse(ticket)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getTicketById(
    ticketId: string,
    currentUser: AuthenticatedUser,
  ): Promise<TicketResponseDto> {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.ensureCanReadTicket(ticket, currentUser);

    return this.toTicketResponse(ticket);
  }

  async updateTicket(
    ticketId: string,
    dto: UpdateTicketDto,
    currentUser: AuthenticatedUser,
  ): Promise<TicketResponseDto> {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.ensureCanUpdateTicket(ticket, currentUser);

    const data = await this.buildUpdateData(ticket, dto, currentUser);
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data,
    });

    return this.toTicketResponse(updatedTicket);
  }

  private buildTicketWhere(
    query: ListTicketsQueryDto,
    currentUser: AuthenticatedUser,
  ): Prisma.TicketWhereInput {
    const filters: Prisma.TicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    if (currentUser.role === UserRole.ADMIN) {
      return {
        ...filters,
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.agentId ? { agentId: query.agentId } : {}),
      };
    }

    if (currentUser.role === UserRole.AGENT) {
      return {
        ...filters,
        OR: [{ agentId: currentUser.sub }, { agentId: null }],
      };
    }

    return {
      ...filters,
      customerId: currentUser.sub,
    };
  }

  private async findTicketOrThrow(ticketId: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  private ensureCanReadTicket(
    ticket: Ticket,
    currentUser: AuthenticatedUser,
  ): void {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.CUSTOMER && ticket.customerId === currentUser.sub) {
      return;
    }

    if (
      currentUser.role === UserRole.AGENT &&
      (ticket.agentId === currentUser.sub || ticket.agentId === null)
    ) {
      return;
    }

    throw new ForbiddenException('Ticket is outside user scope');
  }

  private ensureCanUpdateTicket(
    ticket: Ticket,
    currentUser: AuthenticatedUser,
  ): void {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (
      currentUser.role === UserRole.AGENT &&
      (ticket.agentId === currentUser.sub || ticket.agentId === null)
    ) {
      return;
    }

    throw new ForbiddenException('Customers cannot update tickets');
  }

  private async buildUpdateData(
    ticket: Ticket,
    dto: UpdateTicketDto,
    currentUser: AuthenticatedUser,
  ): Promise<Prisma.TicketUpdateInput> {
    const data: Prisma.TicketUpdateInput = {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.priority ? { priority: dto.priority } : {}),
      ...(dto.category ? { category: dto.category } : {}),
    };

    if (dto.status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    if (dto.status === TicketStatus.CLOSED) {
      data.closedAt = new Date();
    }

    if (currentUser.role === UserRole.ADMIN) {
      if (dto.agentId) {
        await this.ensureActiveAgent(dto.agentId);
        data.agent = { connect: { id: dto.agentId } };
      }

      return data;
    }

    if (dto.agentId && dto.agentId !== currentUser.sub) {
      throw new ForbiddenException('Agents can only assign tickets to themselves');
    }

    if (!ticket.agentId) {
      data.agent = { connect: { id: currentUser.sub } };
    }

    return data;
  }

  private async ensureActiveAgent(agentId: string): Promise<void> {
    const agent = await this.prisma.user.findFirst({
      where: {
        id: agentId,
        role: UserRole.AGENT,
        isActive: true,
      },
      select: { id: true },
    });

    if (!agent) {
      throw new BadRequestException('Agent must be active');
    }
  }

  private toTicketResponse(ticket: Ticket): TicketResponseDto {
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      customerId: ticket.customerId,
      agentId: ticket.agentId,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      closedAt: ticket.closedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}
