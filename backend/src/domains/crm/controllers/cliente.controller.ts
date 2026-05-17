import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { ClienteService } from '../services/cliente.service';
import { ClienteTransformerService } from '../services/cliente-transformer.service';
import {
  CreateClienteDto,
  UpdateClienteDto,
  ClienteResponseDto,
  ClienteHistoricoResponseDto,
  ClienteBasicoDto,
  ClienteDetalhadoDto,
  ClienteAdministrativoDto,
} from '../dto/cliente.dto';
import { SoftDelete, RestoreDeleted } from '../../../shared/decorators/soft-delete.decorator';

/**
 * 👤 CLIENTE CONTROLLER
 * 
 * Endpoints do domínio CRM para gestão de clientes
 * Implementa soft delete em todas as operações de exclusão
 */

@ApiTags('CRM - Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/clientes')
export class ClienteController {
  constructor(
    private readonly clienteService: ClienteService,
    private readonly clienteTransformer: ClienteTransformerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastrar novo cliente',
    description: 'Cria um novo cliente na barbearia',
  })
  @ApiResponse({
    status: 201,
    description: 'Cliente cadastrado com sucesso',
    type: ClienteResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe cliente com este telefone/email',
  })
  async cadastrarCliente(
    @Body() createClienteDto: CreateClienteDto,
    @Request() req: any,
  ): Promise<ClienteResponseDto> {
    return this.clienteService.cadastrarCliente(
      createClienteDto,
      req.user.barbeariaId,
      req.user.userId,
    );
  }

  @Get('basico/listar')
  @ApiOperation({
    summary: 'Listar clientes (dados básicos)',
    description: 'Lista clientes com apenas dados essenciais - ideal para seletores e autocomplete',
  })
  @ApiQuery({ name: 'nome', required: false, description: 'Filtrar por nome' })
  @ApiResponse({
    status: 200,
    description: 'Lista básica de clientes',
    type: [ClienteBasicoDto],
  })
  async listarClientesBasico(
    @Request() req: any,
    @Query('nome') nome?: string,
  ): Promise<ClienteBasicoDto[]> {
    const clientes = await this.clienteService.buscarClientesBarbearia(req.user.barbeariaId, { nome });
    return this.clienteTransformer.toBasicoArray(clientes);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar clientes',
    description: 'Lista todos os clientes da barbearia com filtros opcionais',
  })
  @ApiQuery({ name: 'nome', required: false, description: 'Filtrar por nome' })
  @ApiQuery({ name: 'telefone', required: false, description: 'Filtrar por telefone' })
  @ApiQuery({ name: 'email', required: false, description: 'Filtrar por email' })
  @ApiQuery({ name: 'nivel', required: false, description: 'Nível de detalhes: basico, detalhado, administrativo', enum: ['basico', 'detalhado', 'administrativo'] })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes',
    type: [ClienteResponseDto],
  })
  async listarClientes(
    @Request() req: any,
    @Query('nome') nome?: string,
    @Query('telefone') telefone?: string,
    @Query('email') email?: string,
    @Query('nivel') nivel: 'basico' | 'detalhado' | 'administrativo' = 'detalhado',
  ): Promise<ClienteBasicoDto[] | ClienteDetalhadoDto[] | ClienteAdministrativoDto[]> {
    const clientes = await this.clienteService.buscarClientesBarbearia(req.user.barbeariaId, {
      nome, telefone, email
    });

    switch (nivel) {
       case 'basico':
         return this.clienteTransformer.toBasicoArray(clientes);
       case 'administrativo':
         return this.clienteTransformer.toAdministrativoArray(clientes);
       default:
         return this.clienteTransformer.toDetalhadoArray(clientes);
     }
   }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar cliente por ID',
    description: 'Retorna os dados de um cliente específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do cliente',
    type: ClienteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente não encontrado',
  })
  async buscarCliente(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ClienteResponseDto> {
    const cliente = await this.clienteService.findById(id);
    
    if (!cliente || cliente.barbeariaId !== req.user.barbeariaId) {
      throw new Error('Cliente não encontrado');
    }

    return cliente;
  }

  @Get(':id/historico')
  @ApiOperation({
    summary: 'Consultar histórico do cliente',
    description: 'Retorna histórico completo de atendimentos, vendas e agendamentos',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico do cliente',
    type: ClienteHistoricoResponseDto,
  })
  async consultarHistorico(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ClienteHistoricoResponseDto> {
    return this.clienteService.consultarHistorico(id, req.user.barbeariaId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Atualizar cliente',
    description: 'Atualiza os dados de um cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Cliente atualizado com sucesso',
    type: ClienteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Telefone/email já em uso por outro cliente',
  })
  async atualizarCliente(
    @Param('id') id: string,
    @Body() updateClienteDto: UpdateClienteDto,
    @Request() req: any,
  ): Promise<ClienteResponseDto> {
    return this.clienteService.atualizarCliente(
      id,
      updateClienteDto,
      req.user.barbeariaId,
      req.user.userId, // Corrigido: era req.user.sub
    );
  }

  @SoftDelete('Cliente')
  async deletarCliente(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    await this.clienteService.deletarCliente(
      id,
      req.user.barbeariaId,
      req.user.userId, // Corrigido: era req.user.sub
    );
  }

  @RestoreDeleted('Cliente')
  async restaurarCliente(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ClienteResponseDto> {
    return this.clienteService.restore(id, req.user.userId); // Corrigido: era req.user.sub
  }

  @Get('deletados/listar')
  @ApiOperation({
    summary: 'Listar clientes deletados',
    description: 'Lista clientes que foram deletados (soft delete) para auditoria',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes deletados',
    type: [ClienteResponseDto],
  })
  async listarClientesDeletados(
    @Request() req: any,
  ): Promise<ClienteResponseDto[]> {
    return this.clienteService.findDeleted({
      barbeariaId: req.user.barbeariaId,
    });
  }
}
