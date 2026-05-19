import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { PaginatedTicketsResponseDto } from './dto/paginated-tickets-response.dto';
import { TicketCommentResponseDto } from './dto/ticket-comment-response.dto';
import { TicketEventResponseDto } from './dto/ticket-event-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@Controller({
  path: 'tickets',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiCreatedResponse({ type: TicketResponseDto })
  @ApiForbiddenResponse({ description: 'Only customers can create tickets.' })
  createTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ticketsService.createTicket(dto, currentUser);
  }

  @Get()
  @ApiOkResponse({ type: PaginatedTicketsResponseDto })
  listTickets(
    @Query() query: ListTicketsQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ticketsService.listTickets(query, currentUser);
  }

  @Get(':id')
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiForbiddenResponse({ description: 'Ticket is outside user scope.' })
  getTicketById(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ticketsService.getTicketById(id, currentUser);
  }

  @Get(':id/comments')
  @ApiOkResponse({ type: [TicketCommentResponseDto] })
  @ApiForbiddenResponse({ description: 'Ticket is outside user scope.' })
  listComments(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ticketsService.listComments(id, currentUser);
  }

  @Post(':id/comments')
  @ApiCreatedResponse({ type: TicketCommentResponseDto })
  @ApiForbiddenResponse({ description: 'Ticket is outside user scope.' })
  createComment(
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ticketsService.createComment(id, dto, currentUser);
  }

  @Get(':id/events')
  @ApiOkResponse({ type: [TicketEventResponseDto] })
  @ApiForbiddenResponse({ description: 'Ticket is outside user scope.' })
  listEvents(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ticketsService.listEvents(id, currentUser);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiForbiddenResponse({ description: 'Customers cannot update tickets.' })
  updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.ticketsService.updateTicket(id, dto, currentUser);
  }
}
