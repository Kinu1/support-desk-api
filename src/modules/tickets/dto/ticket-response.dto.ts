import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';

export class TicketResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: TicketStatus })
  status!: TicketStatus;

  @ApiProperty({ enum: TicketPriority })
  priority!: TicketPriority;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  customerId!: string;

  @ApiPropertyOptional()
  agentId!: string | null;

  @ApiPropertyOptional()
  resolvedAt!: string | null;

  @ApiPropertyOptional()
  closedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
