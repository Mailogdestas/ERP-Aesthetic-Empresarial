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
  Request
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { AgendamentoService } from '../services/agendamento.service';
import { CreateAgendamentoDto, UpdateAgendamentoDto } from '../dto/agendamento.dto';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';

@ApiTags('Agendamentos')
@Controller('agendamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AgendamentoController {
  constructor(private readonly agendamentoService: AgendamentoService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Criar novo agendamento',
    description: 'Cria um novo agendamento verificando disponibilidade de horário'
  })
  @ApiResponse({ status: 201, description: 'Agendamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou horário indisponível' })
  async create(@Body() createAgendamentoDto: CreateAgendamentoDto, @Request() req: any) {
    return await this.agendamentoService.create(createAgendamentoDto, req.user?.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Listar agendamentos',
    description: 'Lista agendamentos com filtros opcionais'
  })
  @ApiQuery({ name: 'barbeariaId', required: false, description: 'ID da barbearia' })
  @ApiQuery({ name: 'barbeiroId', required: false, description: 'ID do barbeiro' })
  @ApiQuery({ name: 'clienteId', required: false, description: 'ID do cliente' })
  @ApiQuery({ name: 'dataInicio', required: false, description: 'Data de início (ISO string)' })
  @ApiQuery({ name: 'dataFim', required: false, description: 'Data de fim (ISO string)' })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos' })
  async findAll(
    @Query('barbeariaId') barbeariaId?: string,
    @Query('barbeiroId') barbeiroId?: string,
    @Query('clienteId') clienteId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return await this.agendamentoService.findMany({
      ...(barbeariaId && { barbeariaId }),
      ...(barbeiroId && { barbeiroId }),
      ...(clienteId && { clienteId }),
      ...(dataInicio && dataFim && {
        inicio: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim)
        }
      })
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Buscar agendamento por ID',
    description: 'Busca um agendamento específico pelo ID'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ status: 200, description: 'Dados do agendamento' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado' })
  async findOne(@Param('id') id: string) {
    return await this.agendamentoService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Atualizar agendamento',
    description: 'Atualiza dados de um agendamento existente'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateAgendamentoDto: UpdateAgendamentoDto,
  ) {
    return await this.agendamentoService.update(id, updateAgendamentoDto);
  }

  @Patch(':id/confirmar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Confirmar agendamento',
    description: 'Confirma um agendamento pendente'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento confirmado com sucesso' })
  async confirmar(@Param('id') id: string) {
    return await this.agendamentoService.confirmar(id);
  }

  @Patch(':id/iniciar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Iniciar atendimento',
    description: 'Inicia o atendimento de um agendamento confirmado'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ status: 200, description: 'Atendimento iniciado com sucesso' })
  async iniciar(@Param('id') id: string) {
    return await this.agendamentoService.iniciar(id);
  }

  @Patch(':id/cancelar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ 
    summary: 'Cancelar agendamento',
    description: 'Cancela um agendamento'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento cancelado com sucesso' })
  async cancelar(@Param('id') id: string, @Body('motivo') motivo?: string) {
    return await this.agendamentoService.cancelar(id, motivo);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ 
    summary: 'Remover agendamento (soft delete)',
    description: 'Remove um agendamento (soft delete)'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento removido com sucesso' })
  async remove(@Param('id') id: string) {
    return await this.agendamentoService.softDelete(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ 
    summary: 'Restaurar agendamento',
    description: 'Restaura um agendamento removido (soft delete)'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento restaurado com sucesso' })
  async restore(@Param('id') id: string) {
    return await this.agendamentoService.restore(id);
  }

  @Get('deleted/all')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ 
    summary: 'Listar agendamentos removidos',
    description: 'Lista todos os agendamentos removidos (soft delete)'
  })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos removidos' })
  async findDeleted() {
    return await this.agendamentoService.findDeleted();
  }
}
