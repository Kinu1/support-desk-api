import { ApiProperty } from '@nestjs/swagger';

import { TicketResponseDto } from './ticket-response.dto';

class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedTicketsResponseDto {
  @ApiProperty({ type: [TicketResponseDto] })
  data!: TicketResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
