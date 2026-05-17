import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VendasService } from '../services/vendas.service';
import { ComissaoService } from '../services/comissao.service';
import { CreateVendaDto } from '../dto/create-venda.dto';
import { UpdateVendaDto } from '../dto/update-venda.dto';
import { AddItemVendaDto } from '../dto/add-item-venda.dto';
import { VendaResponseDto } from '../dto/venda-response.dto';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';

@ApiTags('Vendas')
@ApiBearerAuth()
@Controller('vendas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendasController {
  constructor(
    private readonly vendasService: VendasService,
    private readonly comissaoService: ComissaoService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Criar nova venda',
    description: 'Cria uma nova venda com status ABERTA. Barbeiros, gerentes e administradores podem criar vendas.',
  })
  @ApiResponse({
    status: 201,
    description: 'Venda criada com sucesso',
    type: VendaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async create(
    @Body() createVendaDto: CreateVendaDto,
    @Request() req: any,
  ): Promise<VendaResponseDto> {
    const usuarioId = req?.user?.['id'];
    return this.vendasService.create(createVendaDto, usuarioId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(@Request() req?: any) {
    const barbeariaId = req?.user?.['barbeariaId'];
    return this.vendasService.findAll(barbeariaId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  async findOne(@Param('id') id: string) {
    return this.vendasService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateVendaDto, @Request() req?: any) {
    const usuarioId = req?.user?.['id'];
    return this.vendasService.update(id, dto, usuarioId);
  }

  @Put(':id/finalizar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  async finalizar(@Param('id') id: string, @Request() req?: any) {
    const usuarioId = req?.user?.['id'];
    return this.vendasService.finalizar(id, usuarioId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async remove(@Param('id') id: string, @Request() req?: any) {
    const usuarioId = req?.user?.['id'];
    return this.vendasService.remove(id, usuarioId);
  }

  @Put(':id/restore')
  @Roles(Role.ADMIN)
  async restore(@Param('id') id: string, @Request() req?: any) {
    const usuarioId = req?.user?.['id'];
    return this.vendasService.restore(id, usuarioId);
  }

  @Post(':id/itens')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  async addItem(
    @Param('id') id: string,
    @Body() dto: AddItemVendaDto,
    @Request() req?: any
  ): Promise<VendaResponseDto> {
    return this.vendasService.addItemToVenda(id, dto);
  }

  @Get('deleted/list')
  @Roles(Role.ADMIN)
  async findDeleted() {
    return this.vendasService.findDeleted();
  }

  // === ROTAS DE COMISSÃO ===

  @Get('comissoes/barbeiro/:barbeiroId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Calcular comissão do barbeiro por período',
    description: 'Calcula a comissão de um barbeiro específico em um período determinado',
  })
  async calcularComissaoBarbeiro(
    @Param('barbeiroId') barbeiroId: string,
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
    @Request() req: any,
  ) {
    const barbeariaId = req?.user?.['barbeariaId'];
    
    if (!dataInicio || !dataFim) {
      throw new BadRequestException('dataInicio e dataFim são obrigatórios');
    }

    return this.comissaoService.calcularComissaoPorPeriodo(
      barbeiroId,
      barbeariaId,
      new Date(dataInicio),
      new Date(dataFim),
    );
  }

  @Get('comissoes/periodo')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Listar comissões de todos os barbeiros por período',
    description: 'Lista as comissões de todos os barbeiros da barbearia em um período',
  })
  async listarComissoesPorPeriodo(
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
    @Request() req: any,
  ) {
    const barbeariaId = req?.user?.['barbeariaId'];
    
    if (!dataInicio || !dataFim) {
      throw new BadRequestException('dataInicio e dataFim são obrigatórios');
    }

    return this.comissaoService.listarComissoesPorPeriodo(
      barbeariaId,
      new Date(dataInicio),
      new Date(dataFim),
    );
  }

  // === ROTAS DE AUDITORIA ===

  @Get('auditoria/historico/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Histórico de alterações da venda',
    description: 'Retorna o histórico completo de alterações de uma venda específica',
  })
  async historicoVenda(@Param('id') id: string) {
    return this.vendasService.getAuditHistory(id);
  }

  @Get('auditoria/deletadas')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar vendas deletadas (soft delete)',
    description: 'Lista todas as vendas que foram deletadas (soft delete) para auditoria',
  })
  async vendasDeletadas(@Request() req: any) {
    const barbeariaId = req?.user?.['barbeariaId'];
    return this.vendasService.findDeleted(barbeariaId);
  }

  @Put('auditoria/restaurar/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Restaurar venda deletada',
    description: 'Restaura uma venda que foi deletada (soft delete)',
  })
  async restaurarVenda(@Param('id') id: string, @Request() req: any) {
    const usuarioId = req?.user?.['id'];
    return this.vendasService.restore(id, usuarioId);
  }
}
