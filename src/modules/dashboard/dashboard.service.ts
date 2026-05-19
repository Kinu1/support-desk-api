import { Injectable } from '@nestjs/common';
import { Prisma, TicketPriority, TicketStatus, UserRole } from '@prisma/client';

import { AuthenticatedUser } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    currentUser: AuthenticatedUser,
  ): Promise<DashboardSummaryResponseDto> {
    const scopeWhere = this.buildScopeWhere(currentUser);
    const [
      totalTickets,
      openTickets,
      urgentTickets,
      resolvedTickets,
      openStatusTickets,
      inProgressStatusTickets,
      waitingCustomerStatusTickets,
      resolvedStatusTickets,
      closedStatusTickets,
      resolvedDurations,
    ] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where: scopeWhere }),
      this.prisma.ticket.count({
        where: {
          ...scopeWhere,
          status: {
            in: [
              TicketStatus.OPEN,
              TicketStatus.IN_PROGRESS,
              TicketStatus.WAITING_CUSTOMER,
            ],
          },
        },
      }),
      this.prisma.ticket.count({
        where: { ...scopeWhere, priority: TicketPriority.URGENT },
      }),
      this.prisma.ticket.count({
        where: {
          ...scopeWhere,
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      }),
      this.prisma.ticket.count({
        where: { ...scopeWhere, status: TicketStatus.OPEN },
      }),
      this.prisma.ticket.count({
        where: { ...scopeWhere, status: TicketStatus.IN_PROGRESS },
      }),
      this.prisma.ticket.count({
        where: { ...scopeWhere, status: TicketStatus.WAITING_CUSTOMER },
      }),
      this.prisma.ticket.count({
        where: { ...scopeWhere, status: TicketStatus.RESOLVED },
      }),
      this.prisma.ticket.count({
        where: { ...scopeWhere, status: TicketStatus.CLOSED },
      }),
      this.prisma.ticket.findMany({
        where: {
          ...scopeWhere,
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      }),
    ]);

    return {
      scope: currentUser.role,
      totalTickets,
      openTickets,
      urgentTickets,
      resolvedTickets,
      averageResolutionHours:
        this.calculateAverageResolutionHours(resolvedDurations),
      byStatus: {
        [TicketStatus.OPEN]: openStatusTickets,
        [TicketStatus.IN_PROGRESS]: inProgressStatusTickets,
        [TicketStatus.WAITING_CUSTOMER]: waitingCustomerStatusTickets,
        [TicketStatus.RESOLVED]: resolvedStatusTickets,
        [TicketStatus.CLOSED]: closedStatusTickets,
      },
    };
  }

  private buildScopeWhere(
    currentUser: AuthenticatedUser,
  ): Prisma.TicketWhereInput {
    if (currentUser.role === UserRole.AGENT) {
      return { agentId: currentUser.sub };
    }

    return {};
  }

  private calculateAverageResolutionHours(
    tickets: { createdAt: Date; resolvedAt: Date | null }[],
  ): number | null {
    const resolvedTickets = tickets.filter((ticket) => ticket.resolvedAt);

    if (resolvedTickets.length === 0) {
      return null;
    }

    const totalHours = resolvedTickets.reduce((sum, ticket) => {
      const resolvedAt = ticket.resolvedAt as Date;

      return (
        sum +
        (resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)
      );
    }, 0);

    return Number((totalHours / resolvedTickets.length).toFixed(2));
  }

}
