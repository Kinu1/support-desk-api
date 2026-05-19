import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus, UserRole } from '@prisma/client';

export class DashboardSummaryResponseDto {
  @ApiProperty({ enum: UserRole })
  scope!: UserRole;

  @ApiProperty()
  totalTickets!: number;

  @ApiProperty()
  openTickets!: number;

  @ApiProperty()
  urgentTickets!: number;

  @ApiProperty()
  resolvedTickets!: number;

  @ApiPropertyOptional({ nullable: true })
  averageResolutionHours!: number | null;

  @ApiProperty({
    example: {
      OPEN: 4,
      IN_PROGRESS: 2,
      WAITING_CUSTOMER: 1,
      RESOLVED: 3,
      CLOSED: 2,
    },
  })
  byStatus!: Record<TicketStatus, number>;
}
