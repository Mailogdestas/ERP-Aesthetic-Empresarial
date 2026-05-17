import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BloqueioAgendaService } from '../services/bloqueio-agenda.service';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import {
  CreateBloqueioAgendaDto,
  UpdateBloqueioAgendaDto,
  BloqueioAgendaResponseDto,
  BloqueioAgendaQueryDto,
} from '../dto/bloqueio-agenda.dto';

/**
 * 🚫 BLOQUEIO AGENDA CONTROLLER
 * 
 * Endpoints para gerenciar bloqueios de agenda:
 * - POST /agenda/bloqueios - Criar bloqueio
 * - GET /agenda/bloqueios - Listar bloqueios
 * - GET /agenda/bloqueios/:id - Buscar bloqueio
 * - PUT /agenda/bloqueios/:id - Atualizar bloqueio
 * - DELETE /agenda/bloqueios/:id - Remover bloqueio
 */
@ApiTags('Bloqueio de Agenda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agenda/bloqueios')
export class BloqueioAgendaController {
  constructor(private readonly bloqueioAgendaService: BloqueioAgendaService) {}

  /**
   * 🎯 Criar Bloqueio de Agenda
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ 
    summary: 'Criar bloqueio de agenda',
    description: 'Cria um novo bloqueio de agenda para barbeiro específico ou geral'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Bloqueio criado com sucesso',
    type: BloqueioAgendaResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou conflito de horário' })
  @ApiResponse({ status: 404, description: 'Barbeiro não encontrado' })
  async criarBloqueio(
    @Body() dto: CreateBloqueioAgendaDto,
    @Req() req: any,
  ): Promise<BloqueioAgendaResponseDto> {
    // Garantir que o bloqueio seja criado na barbearia do usuário
    dto.barbeariaId = req.user.barbeariaId;
    return this.bloqueioAgendaService.criarBloqueio(dto);
  }

  /**
   * 📋 Listar Bloqueios
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Listar bloqueios de agenda',
    description: 'Lista bloqueios com filtros opcionais'
  })
  @ApiQuery({ name: 'barbeiroId', required: false, description: 'Filtrar por barbeiro' })
  @ApiQuery({ name: 'tipo', required: false, description: 'Filtrar por tipo de bloqueio' })
  @ApiQuery({ name: 'dataInicio', required: false, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dataFim', required: false, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'apenasAtivos', required: false, description: 'Apenas bloqueios ativos' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de bloqueios',
    type: [BloqueioAgendaResponseDto] 
  })
  async listarBloqueios(
    @Req() req: any,
    @Query() filters: BloqueioAgendaQueryDto,
  ): Promise<BloqueioAgendaResponseDto[]> {
    return this.bloqueioAgendaService.listarBloqueios(req.user.barbeariaId, filters);
  }

  /**
   * 🔍 Buscar Bloqueio por ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Buscar bloqueio por ID',
    description: 'Retorna detalhes de um bloqueio específico'
  })
  @ApiParam({ name: 'id', description: 'ID do bloqueio' })
  @ApiResponse({ 
    status: 200, 
    description: 'Detalhes do bloqueio',
    type: BloqueioAgendaResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  async buscarBloqueio(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<BloqueioAgendaResponseDto> {
    return this.bloqueioAgendaService.buscarPorId(id, req.user.barbeariaId);
  }

  /**
   * ✏️ Atualizar Bloqueio
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ 
    summary: 'Atualizar bloqueio de agenda',
    description: 'Atualiza dados de um bloqueio existente'
  })
  @ApiParam({ name: 'id', description: 'ID do bloqueio' })
  @ApiResponse({ 
    status: 200, 
    description: 'Bloqueio atualizado com sucesso',
    type: BloqueioAgendaResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou conflito de horário' })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  async atualizarBloqueio(
    @Param('id') id: string,
    @Body() dto: UpdateBloqueioAgendaDto,
    @Req() req: any,
  ): Promise<BloqueioAgendaResponseDto> {
    return this.bloqueioAgendaService.atualizarBloqueio(id, req.user.barbeariaId, dto);
  }

  /**
   * 🗑️ Remover Bloqueio
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ 
    summary: 'Remover bloqueio de agenda',
    description: 'Remove um bloqueio existente (soft delete)'
  })
  @ApiParam({ name: 'id', description: 'ID do bloqueio' })
  @ApiResponse({ status: 200, description: 'Bloqueio removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Bloqueio não encontrado' })
  async removerBloqueio(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    await this.bloqueioAgendaService.removerBloqueio(id, req.user.barbeariaId);
    return { message: 'Bloqueio removido com sucesso' };
  }

  /**
   * ⚡ Verificar se Horário está Bloqueado
   * Endpoint utilitário para validação rápida
   */
  @Get('verificar/:barbeiroId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Verificar se horário está bloqueado',
    description: 'Verifica se um horário específico está bloqueado para um barbeiro'
  })
  @ApiParam({ name: 'barbeiroId', description: 'ID do barbeiro' })
  @ApiQuery({ name: 'dataInicio', required: true, description: 'Data/hora de início (ISO)' })
  @ApiQuery({ name: 'dataFim', required: true, description: 'Data/hora de fim (ISO)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Status do bloqueio',
    schema: {
      type: 'object',
      properties: {
        bloqueado: { type: 'boolean' },
        motivo: { type: 'string' }
      }
    }
  })
  async verificarHorarioBloqueado(
    @Param('barbeiroId') barbeiroId: string,
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
    @Req() req: any,
  ): Promise<{ bloqueado: boolean; motivo?: string }> {
    const bloqueado = await this.bloqueioAgendaService.verificarHorarioBloqueado(
      req.user.barbeariaId,
      barbeiroId,
      new Date(dataInicio),
      new Date(dataFim),
    );

    return {
      bloqueado,
      ...(bloqueado && { motivo: 'Horário bloqueado para este barbeiro' }),
    };
  }
}