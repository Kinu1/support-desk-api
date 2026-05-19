import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Ticket,
  TicketComment,
  TicketEvent,
  TicketEventType,
  TicketStatus,
  UserRole,
} from '@prisma/client';

import { AuthenticatedUser } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { PaginatedTicketsResponseDto } from './dto/paginated-tickets-response.dto';
import { TicketCommentResponseDto } from './dto/ticket-comment-response.dto';
import { TicketEventResponseDto } from './dto/ticket-event-response.dto';
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

    const ticket = await this.prisma.$transaction(async (tx) => {
      const createdTicket = await tx.ticket.create({
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          priority: dto.priority,
          customerId: currentUser.sub,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: createdTicket.id,
          actorId: currentUser.sub,
          type: TicketEventType.CREATED,
          field: 'status',
          newValue: createdTicket.status,
        },
      });

      return createdTicket;
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
    const updatedTicket = await this.prisma.$transaction(async (tx) => {
      const changedEvents = this.buildUpdateEvents(ticket, dto, currentUser);
      const nextTicket = await tx.ticket.update({
        where: { id: ticketId },
        data,
      });

      if (changedEvents.length > 0) {
        await tx.ticketEvent.createMany({
          data: changedEvents,
        });
      }

      return nextTicket;
    });

    return this.toTicketResponse(updatedTicket);
  }

  async listComments(
    ticketId: string,
    currentUser: AuthenticatedUser,
  ): Promise<TicketCommentResponseDto[]> {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.ensureCanReadTicket(ticket, currentUser);

    const comments = await this.prisma.ticketComment.findMany({
      where: {
        ticketId,
        ...(currentUser.role === UserRole.CUSTOMER ? { isInternal: false } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => this.toCommentResponse(comment));
  }

  async createComment(
    ticketId: string,
    dto: CreateTicketCommentDto,
    currentUser: AuthenticatedUser,
  ): Promise<TicketCommentResponseDto> {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.ensureCanReadTicket(ticket, currentUser);

    if (currentUser.role === UserRole.CUSTOMER && dto.isInternal) {
      throw new ForbiddenException('Customers cannot create internal comments');
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const createdComment = await tx.ticketComment.create({
        data: {
          ticketId,
          authorId: currentUser.sub,
          body: dto.body,
          isInternal: dto.isInternal ?? false,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          actorId: currentUser.sub,
          type: TicketEventType.COMMENTED,
          field: dto.isInternal ? 'internalComment' : 'comment',
          newValue: createdComment.id,
        },
      });

      return createdComment;
    });

    return this.toCommentResponse(comment);
  }

  async listEvents(
    ticketId: string,
    currentUser: AuthenticatedUser,
  ): Promise<TicketEventResponseDto[]> {
    const ticket = await this.findTicketOrThrow(ticketId);
    this.ensureCanReadTicket(ticket, currentUser);

    const events = await this.prisma.ticketEvent.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return events.map((event) => this.toEventResponse(event));
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

  private buildUpdateEvents(
    ticket: Ticket,
    dto: UpdateTicketDto,
    currentUser: AuthenticatedUser,
  ): Prisma.TicketEventCreateManyInput[] {
    const events: Prisma.TicketEventCreateManyInput[] = [];

    if (dto.status && dto.status !== ticket.status) {
      events.push({
        ticketId: ticket.id,
        actorId: currentUser.sub,
        type:
          dto.status === TicketStatus.CLOSED
            ? TicketEventType.CLOSED
            : TicketEventType.STATUS_CHANGED,
        field: 'status',
        oldValue: ticket.status,
        newValue: dto.status,
      });
    }

    if (dto.priority && dto.priority !== ticket.priority) {
      events.push({
        ticketId: ticket.id,
        actorId: currentUser.sub,
        type: TicketEventType.PRIORITY_CHANGED,
        field: 'priority',
        oldValue: ticket.priority,
        newValue: dto.priority,
      });
    }

    if (dto.agentId && dto.agentId !== ticket.agentId) {
      events.push({
        ticketId: ticket.id,
        actorId: currentUser.sub,
        type: TicketEventType.ASSIGNED,
        field: 'agentId',
        oldValue: ticket.agentId,
        newValue: dto.agentId,
      });
    }

    if (
      currentUser.role === UserRole.AGENT &&
      !ticket.agentId &&
      !dto.agentId
    ) {
      events.push({
        ticketId: ticket.id,
        actorId: currentUser.sub,
        type: TicketEventType.ASSIGNED,
        field: 'agentId',
        oldValue: null,
        newValue: currentUser.sub,
      });
    }

    return events;
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

  private toCommentResponse(comment: TicketComment): TicketCommentResponseDto {
    return {
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: comment.authorId,
      body: comment.body,
      isInternal: comment.isInternal,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  private toEventResponse(event: TicketEvent): TicketEventResponseDto {
    return {
      id: event.id,
      ticketId: event.ticketId,
      actorId: event.actorId,
      type: event.type,
      field: event.field,
      oldValue: event.oldValue,
      newValue: event.newValue,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
