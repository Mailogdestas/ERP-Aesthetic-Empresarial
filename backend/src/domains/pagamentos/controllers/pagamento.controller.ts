import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import { PagamentoService } from '../services/pagamento.service';
import { 
  SimularPagamentoDto, 
  CriarPagamentoDto, 
  PagarParcelaDto,
  SimulacaoResponseDto 
} from '../dto/pagamento.dto';
import { 
  PagamentoSimplesDto,
  PagamentoSimplesResponseDto 
} from '../dto/pagamento-simples.dto';
import { 
  PagamentoResponseDto, 
  ParcelaResponseDto 
} from '../dto/pagamento-response.dto';

/**
 * 💳 PAGAMENTO CONTROLLER
 * 
 * Endpoints:
 * - POST /simular - Simular pagamento com juros
 * - POST / - Criar pagamento avançado
 * - PUT /parcela/:id/pagar - Pagar parcela específica
 * - GET /venda/:vendaId - Buscar pagamento por venda
 * - GET /parcelas/pendentes - Listar parcelas pendentes
 */

@ApiTags('Pagamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pagamentos')
export class PagamentoController {
  constructor(private readonly pagamentoService: PagamentoService) {}

  /**
   * 💳 Pagamento Simples
   * Processa pagamento à vista ou parcelado de forma simplificada
   */
  @Post('simples')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Processar pagamento simples',
    description: 'Processa pagamento à vista (com desconto) ou parcelado (com juros) de forma simplificada'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Pagamento processado com sucesso',
    type: PagamentoSimplesResponseDto
  })
  async processarPagamentoSimples(
    @Body() dto: PagamentoSimplesDto,
    @Request() req: any,
  ): Promise<PagamentoSimplesResponseDto> {
    return this.pagamentoService.processarPagamentoSimples(dto, req.user.sub);
  }

  /**
   * 🧮 Simular Pagamento
   * Calcula juros e parcelas sem criar registros
   */
  @Post('simular')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Simular pagamento com cálculo de juros e parcelas',
    description: 'Calcula valores de juros e parcelas baseado na configuração da barbearia'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Simulação calculada com sucesso',
    type: SimulacaoResponseDto
  })
  async simularPagamento(
    @Body() dto: SimularPagamentoDto,
    @Request() req: any,
  ): Promise<SimulacaoResponseDto> {
    return this.pagamentoService.simularPagamento(dto);
  }

  /**
   * 💰 Criar Pagamento Avançado
   * Cria pagamento com parcelas baseado na simulação
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Criar pagamento para uma venda',
    description: 'Cria um novo pagamento com cálculo automático de juros e parcelas'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Pagamento criado com sucesso',
    type: PagamentoResponseDto
  })
  async criarPagamento(
    @Body() dto: CriarPagamentoDto,
    @Request() req: any,
  ): Promise<PagamentoResponseDto> {
    const pagamento = await this.pagamentoService.criarPagamento(dto, req.user.id);
    return this.mapToPagamentoResponse(pagamento);
  }

  /**
   * 💸 Pagar Parcela
   * Registra pagamento de uma parcela específica
   */
  @Put('parcela/:id/pagar')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Pagar parcela específica',
    description: 'Registra o pagamento de uma parcela individual'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Parcela paga com sucesso',
    type: ParcelaResponseDto
  })
  async pagarParcela(
    @Param('id') parcelaId: string,
    @Body() dto: PagarParcelaDto,
    @Request() req: any,
  ): Promise<ParcelaResponseDto> {
    const parcela = await this.pagamentoService.pagarParcela(
      { ...dto, parcelaId },
      req.user.id
    );
    return this.mapToParcelaResponse(parcela);
  }

  /**
   * 🔍 Buscar Pagamento por Venda
   */
  @Get('venda/:vendaId')
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Buscar pagamento por venda',
    description: 'Retorna o pagamento associado a uma venda específica'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Pagamento encontrado',
    type: PagamentoResponseDto
  })
  async buscarPorVenda(
    @Param('vendaId') vendaId: string,
  ): Promise<PagamentoResponseDto | null> {
    const pagamento = await this.pagamentoService.buscarPorVenda(vendaId);
    return pagamento ? this.mapToPagamentoResponse(pagamento) : null;
  }

  /**
   * 📋 Listar Parcelas Pendentes
   */
  @Get('parcelas/pendentes')
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Listar parcelas pendentes',
    description: 'Lista todas as parcelas pendentes da barbearia, opcionalmente filtradas por data limite'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de parcelas pendentes',
    type: [ParcelaResponseDto]
  })
  async listarParcelasPendentes(
    @Request() req: any,
    @Query('dataLimite') dataLimite?: string,
  ): Promise<ParcelaResponseDto[]> {
    const dataLimiteDate = dataLimite ? new Date(dataLimite) : undefined;
    
    const parcelas = await this.pagamentoService.listarParcelasPendentes(
      req.user.barbeariaId,
      dataLimiteDate
    );

    return parcelas.map(parcela => this.mapToParcelaResponse(parcela));
  }

  /**
   * 📊 Buscar Pagamentos da Barbearia
   */
  @Get()
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Listar pagamentos da barbearia',
    description: 'Lista todos os pagamentos da barbearia com filtros opcionais'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de pagamentos',
    type: [PagamentoResponseDto]
  })
  async listarPagamentos(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ): Promise<PagamentoResponseDto[]> {
    const where: any = {
      barbeariaId: req.user.barbeariaId,
    };

    if (status) {
      where.status = status;
    }

    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim);
    }

    const pagamentos = await this.pagamentoService.findMany(where, {
      include: {
        venda: { 
          select: { 
            id: true, 
            valorTotal: true, 
            status: true,
            cliente: { select: { id: true, nome: true } }
          } 
        },
        parcelas: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return pagamentos.map(pagamento => this.mapToPagamentoResponse(pagamento));
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Mapeia entidade para DTO de resposta de pagamento
   */
  private mapToPagamentoResponse(pagamento: any): PagamentoResponseDto {
    return {
      id: pagamento.id,
      vendaId: pagamento.vendaId,
      barbeariaId: pagamento.barbeariaId,
      tipo: pagamento.tipo,
      valorBruto: Number(pagamento.valorBruto),
      valorCliente: Number(pagamento.valorCliente),
      valorLiquido: Number(pagamento.valorLiquido),
      repassaJuros: pagamento.repassaJuros,
      status: pagamento.status,
      createdAt: pagamento.createdAt,
      updatedAt: pagamento.updatedAt,
      deletedAt: pagamento.deletedAt,
      createdByUsuarioId: pagamento.createdByUsuarioId,
      updatedByUsuarioId: pagamento.updatedByUsuarioId,
      parcelas: pagamento.parcelas?.sort((a: any, b: any) => a.numero - b.numero).map((parcela: any) => this.mapToParcelaResponse(parcela)) || [],
    };
  }

  /**
   * Mapeia entidade para DTO de resposta de parcela
   */
  private mapToParcelaResponse(parcela: any): ParcelaResponseDto {
    return {
      id: parcela.id,
      pagamentoId: parcela.pagamentoId,
      numeroParcela: parcela.numeroParcela,
      valor: Number(parcela.valor),
      valorPago: parcela.valorPago ? Number(parcela.valorPago) : null,
      dataVencimento: parcela.dataVencimento,
      dataPagamento: parcela.dataPagamento,
      status: parcela.status,
      metodoPagamento: parcela.metodoPagamento,
      observacoes: parcela.observacoes,
      gatewayTxnId: parcela.gatewayTxnId,
      createdAt: parcela.createdAt,
      updatedAt: parcela.updatedAt,
      deletedAt: parcela.deletedAt,
      pagamento: parcela.pagamento ? {
        id: parcela.pagamento.id,
        valorComJuros: Number(parcela.pagamento.valorComJuros),
        venda: parcela.pagamento.venda,
      } : undefined,
    };
  }
}
