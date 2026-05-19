import { ApiProperty } from '@nestjs/swagger';

export class TicketCommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticketId!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  isInternal!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
