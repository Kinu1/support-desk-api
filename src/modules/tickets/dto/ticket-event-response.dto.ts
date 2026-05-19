import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketEventType } from '@prisma/client';

export class TicketEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  actorId!: string;

  @ApiProperty({ enum: TicketEventType })
  type!: TicketEventType;

  @ApiPropertyOptional()
  field!: string | null;

  @ApiPropertyOptional()
  oldValue!: string | null;

  @ApiPropertyOptional()
  newValue!: string | null;

  @ApiProperty()
  createdAt!: string;
}
