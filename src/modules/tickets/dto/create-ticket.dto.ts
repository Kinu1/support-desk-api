import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'Nao consigo acessar o painel' })
  @IsString()
  @Length(5, 120)
  title!: string;

  @ApiProperty({ example: 'O login retorna erro mesmo com senha correta.' })
  @IsString()
  @Length(10, 2000)
  description!: string;

  @ApiProperty({ example: 'access' })
  @IsString()
  @Length(2, 60)
  category!: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
