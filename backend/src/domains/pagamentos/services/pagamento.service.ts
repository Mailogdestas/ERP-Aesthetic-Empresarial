import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  PagamentoAvancado, 
  ParcelaAvancada, 
  ConfigJuros, 
  TipoPagamento, 
  StatusPagamento, 
  StatusParcela 
} from '@prisma/client';
import { 
  SimularPagamentoDto, 
  CriarPagamentoDto, 
  PagarParcelaDto,
  SimulacaoResponseDto,
  ParcelaDetalheDto 
} from '../dto/pagamento.dto';
import { 
  PagamentoSimplesDto,
  PagamentoSimplesResponseDto,
  TipoPagamentoSimples 
} from '../dto/pagamento-simples.dto';
import { DomainEventType } from '../../../shared/events/domain-events';

/**
 * 💳 PAGAMENTO SERVICE
 * 
 * Casos de Uso:
 * - Simular Pagamento (calcular juros e parcelas)
 * - Criar Pagamento Avançado
 * - Pagar Parcela Individual
 * - Receber evento VENDA_FINALIZADA
 * - Emitir evento VENDA_PAGA
 */

@Injectable()
export class PagamentoService extends BaseService<PagamentoAvancado> {
  constructor(
    protected prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    super(prisma, 'pagamentoAvancado');
  }

  private include = {
    venda: { 
      select: { 
        id: true, 
        valorTotal: true, 
        status: true,
        cliente: { select: { id: true, nome: true } }
      } 
    },
    parcelas: true,
  };

  /**
   * 🧮 CASO DE USO: Simular Pagamento
   * Calcula juros e parcelas sem criar registros
   */
  async simularPagamento(dto: SimularPagamentoDto): Promise<SimulacaoResponseDto> {
    // Buscar venda para obter valor total
    const venda = await this.prisma.venda.findUnique({
      where: { id: dto.vendaId }
    });

    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    // Buscar configuração de juros da barbearia
    const config = await this.buscarConfigJuros(venda.barbeariaId);
    
    // Aplicar overrides se fornecidos
    const configFinal = this.aplicarOverrides(config, dto.override);

    // Validar número de parcelas
    const numeroParcelas = dto.parcelas || 1;
    if (numeroParcelas > configFinal.maxParcelas) {
      throw new BadRequestException(`Máximo de ${configFinal.maxParcelas} parcelas permitidas`);
    }

    // Converter Decimal para number
    const valorBase = Number(venda.valorTotal);

    // Calcular simulação
    const simulacao = this.calcularSimulacao(valorBase, numeroParcelas, configFinal);

    return {
      valorBase,
      tipo: dto.tipo,
      parcelas: numeroParcelas,
      repassaJuros: dto.repassaJuros ?? true,
      taxas: {
        jurosPercentual: Number(configFinal.jurosPercentual),
        jurosPorParcela: Number(configFinal.jurosPorParcela || 0),
        descontoAvista: Number(configFinal.descontoAvista)
      },
      totalCliente: simulacao.valorComJuros,
      custoJuros: simulacao.valorJuros,
      valorLiquido: simulacao.valorComJuros,
      parcelasDetalhe: simulacao.parcelas
    };
  }

  /**
   * 💰 CASO DE USO: Criar Pagamento Avançado
   * Cria pagamento com parcelas baseado na simulação
   */
  async criarPagamento(dto: CriarPagamentoDto, usuarioId: string): Promise<PagamentoAvancado> {
    // Validar se venda existe e está finalizada
    const venda = await this.prisma.venda.findUnique({
      where: { id: dto.vendaId },
      include: { pagamentos: true }
    });

    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.status !== 'FINALIZADA') {
      throw new BadRequestException('Venda deve estar finalizada para criar pagamento');
    }

    // Verificar se já existe pagamento para esta venda
    if (venda.pagamentos.length > 0) {
      throw new BadRequestException('Venda já possui pagamento');
    }

    // Simular pagamento para obter cálculos
    const simulacao = await this.simularPagamento({
      vendaId: dto.vendaId,
      tipo: dto.tipo,
      parcelas: dto.parcelas,
      repassaJuros: dto.repassaJuros,
      override: dto.override
    });

    // Converter Decimal para number
    const valorTotal = Number(venda.valorTotal);
    const numeroParcelas = dto.parcelas || 1;

    // Criar pagamento avançado
    const pagamento = await this.prisma.pagamentoAvancado.create({
      data: {
        vendaId: dto.vendaId,
        barbeariaId: venda.barbeariaId,
        tipo: dto.tipo,
        metodo: 'PIX' as any,
        valorBruto: valorTotal,
        valorCliente: simulacao.totalCliente,
        valorLiquido: simulacao.totalCliente,
        status: StatusPagamento.PENDENTE,
        createdByUsuarioId: usuarioId,
        updatedByUsuarioId: usuarioId,
        parcelas: {
          create: simulacao.parcelasDetalhe.map((parcela, index) => ({
            numero: index + 1,
            valor: parcela.valor,
            dataVencimento: parcela.vencimento,
            status: StatusParcela.PENDENTE,
            createdByUsuarioId: usuarioId,
            updatedByUsuarioId: usuarioId,
          }))
        }
      },
      include: this.include
    });

    // Emitir evento de pagamento criado
    this.eventEmitter.emit(DomainEventType.PAGAMENTO_CRIADO, {
      pagamentoId: pagamento.id,
      vendaId: dto.vendaId,
      valorTotal: simulacao.totalCliente,
      numeroParcelas: numeroParcelas,
      barbeariaId: venda.barbeariaId,
    });

    return pagamento;
  }

  /**
   * 💸 CASO DE USO: Pagar Parcela
   * Registra pagamento de uma parcela específica
   */
  async pagarParcela(dto: PagarParcelaDto, usuarioId: string): Promise<ParcelaAvancada> {
    // Buscar parcela
    const parcela = await this.prisma.parcelaAvancada.findUnique({
      where: { id: dto.parcelaId },
      include: {
        pagamento: {
          include: {
            venda: true
          }
        }
      }
    });

    if (!parcela) {
      throw new NotFoundException('Parcela não encontrada');
    }

    if (parcela.status === StatusParcela.PAGA) {
      throw new BadRequestException('Parcela já foi paga');
    }

    // Converter Decimal para number
    const valorParcela = Number(parcela.valor);
    const valorPago = dto.valorPago ? Number(dto.valorPago) : valorParcela;

    // Atualizar parcela
    const parcelaPaga = await this.prisma.parcelaAvancada.update({
      where: { id: dto.parcelaId },
      data: {
        status: StatusParcela.PAGA,
        dataPagamento: dto.dataPagamento || new Date(),
        updatedByUsuarioId: usuarioId,
      }
    });

    // Verificar se todas as parcelas foram pagas
    const parcelasRestantes = await this.prisma.parcelaAvancada.count({
      where: {
        pagamentoId: parcela.pagamentoId,
        status: StatusParcela.PENDENTE
      }
    });

    // Se todas as parcelas foram pagas, atualizar status do pagamento
    if (parcelasRestantes === 0) {
      await this.prisma.pagamentoAvancado.update({
        where: { id: parcela.pagamentoId },
        data: {
          status: StatusPagamento.CONCLUIDO,
          updatedAt: new Date(),
          updatedByUsuarioId: usuarioId,
        }
      });

      // Atualizar status da venda para PAGA
      await this.prisma.venda.update({
        where: { id: parcela.pagamento.vendaId },
        data: { 
          status: 'PAGA' as any,
          updatedAt: new Date()
        }
      });

      // Emitir evento VENDA_PAGA
      this.eventEmitter.emit(DomainEventType.VENDA_PAGA, {
        vendaId: parcela.pagamento.vendaId,
        pagamentoId: parcela.pagamentoId,
        total: Number(parcela.pagamento.valorCliente),
        barbeariaId: parcela.pagamento.venda.barbeariaId,
        clienteId: parcela.pagamento.venda.clienteId,
        barbeiroId: parcela.pagamento.venda.barbeiroId,
      });
    }

    // Emitir evento de parcela paga
    this.eventEmitter.emit(DomainEventType.PARCELA_PAGA, {
      parcelaId: dto.parcelaId,
      pagamentoId: parcela.pagamentoId,
      vendaId: parcela.pagamento.vendaId,
      valor: valorPago,
      numeroParcela: parcelaPaga.numero,
      barbeariaId: parcela.pagamento.venda.barbeariaId,
    });

    return parcelaPaga;
  }

  /**
   * 📋 CASO DE USO: Buscar Pagamentos por Venda
   */
  async buscarPorVenda(vendaId: string): Promise<PagamentoAvancado | null> {
    return this.prisma.pagamentoAvancado.findFirst({
      where: { 
        vendaId,
        deletedAt: null 
      },
      include: this.include
    });
  }

  /**
   * 📊 CASO DE USO: Listar Parcelas Pendentes
   */
  async listarParcelasPendentes(barbeariaId: string, dataLimite?: Date): Promise<ParcelaAvancada[]> {
    const where: any = {
      barbeariaId,
      status: StatusParcela.PENDENTE,
      deletedAt: null,
    };

    if (dataLimite) {
      where.dataVencimento = { lte: dataLimite };
    }

    return this.prisma.parcelaAvancada.findMany({
      where,
      include: {
        pagamento: {
          include: {
            venda: {
              include: {
                cliente: { select: { id: true, nome: true, telefone: true } }
              }
            }
          }
        }
      },
      orderBy: { dataVencimento: 'asc' }
    });
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Busca configuração de juros da barbearia
   */
  private async buscarConfigJuros(barbeariaId: string): Promise<ConfigJuros> {
    let config = await this.prisma.configJuros.findFirst({
      where: { barbeariaId }
    });

    // Se não existe configuração, criar uma padrão
    if (!config) {
      config = await this.prisma.configJuros.create({
        data: {
          barbeariaId,
          jurosPercentual: 2.5, // 2.5% ao mês
          jurosPorParcela: 0.19, // 0.19% por parcela
          descontoAvista: 5.0, // 5% de desconto à vista
          minValorParcela: 50.0,
          maxParcelas: 12,
        }
      });
    }

    return config;
  }

  /**
   * Aplica overrides na configuração de juros
   */
  private aplicarOverrides(config: ConfigJuros, overrides?: any): ConfigJuros {
    if (!overrides) return config;

    return {
      ...config,
      ...overrides
    };
  }

  /**
   * Calcula simulação de pagamento
   */
  private calcularSimulacao(valorTotal: number, numeroParcelas: number, config: ConfigJuros) {
    let valorComJuros = valorTotal;
    let valorJuros = 0;

    // Aplicar desconto à vista se for 1 parcela
    if (numeroParcelas === 1) {
      const desconto = Number(config.descontoAvista);
      valorComJuros = valorTotal * (1 - desconto / 100);
    } else if (numeroParcelas > 1) {
      // Calcular juros
      const jurosPercentual = Number(config.jurosPercentual);
      const jurosPorParcela = Number(config.jurosPorParcela || 0);
      
      if (jurosPorParcela > 0) {
        // Juros por parcela (juros simples)
        valorJuros = valorTotal * (jurosPorParcela / 100) * (numeroParcelas - 1);
      } else {
        // Juros compostos
        valorComJuros = valorTotal * Math.pow(1 + jurosPercentual / 100, numeroParcelas - 1);
        valorJuros = valorComJuros - valorTotal;
      }
      valorComJuros = valorTotal + valorJuros;
    }

    const valorParcela = valorComJuros / numeroParcelas;
    const minValorParcela = Number(config.minValorParcela);

    // Validar valor mínimo da parcela APENAS para pagamentos parcelados (mais de 1 parcela)
    if (numeroParcelas > 1 && valorParcela < minValorParcela) {
      throw new BadRequestException(
        `Valor da parcela (R$ ${valorParcela.toFixed(2)}) é menor que o mínimo permitido (R$ ${minValorParcela.toFixed(2)})`
      );
    }

    // Gerar parcelas
    const parcelas: ParcelaDetalheDto[] = [];
    const hoje = new Date();

    for (let i = 0; i < numeroParcelas; i++) {
      const dataVencimento = new Date(hoje);
      dataVencimento.setMonth(dataVencimento.getMonth() + i + 1);

      parcelas.push({
        numeroParcela: i + 1,
        valor: valorParcela,
        vencimento: dataVencimento
      });
    }

    return {
      valorComJuros,
      valorJuros,
      valorParcela,
      parcelas
    };
  }

  /**
   * 💰 CASO DE USO: Pagamento Simples
   * Processa pagamento direto com base na flag tipoPagamento
   */
  async processarPagamentoSimples(dto: PagamentoSimplesDto, usuarioId: string): Promise<PagamentoSimplesResponseDto> {
    // Validar se venda existe e está finalizada
    const venda = await this.prisma.venda.findUnique({
      where: { id: dto.vendaId },
      include: { pagamentos: true }
    });

    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.status !== 'FINALIZADA') {
      throw new BadRequestException('Venda deve estar finalizada para criar pagamento');
    }

    // Verificar se já existe pagamento para esta venda
    if (venda.pagamentos.length > 0) {
      throw new BadRequestException('Venda já possui pagamento');
    }

    const valorOriginal = Number(venda.valorTotal);
    let valorFinal = dto.valorPago;
    let desconto = 0;
    let juros = 0;
    let numeroParcelas = 1;

    // Buscar configuração de juros
    const config = await this.buscarConfigJuros(venda.barbeariaId);

    if (dto.tipoPagamento === TipoPagamentoSimples.AVISTA) {
      // Aplicar desconto à vista se configurado
      if (config.descontoAvista && Number(config.descontoAvista) > 0) {
        desconto = valorOriginal * (Number(config.descontoAvista) / 100);
        valorFinal = valorOriginal - desconto;
      }
    } else if (dto.tipoPagamento === TipoPagamentoSimples.PARCELADO) {
      // Validar número de parcelas
      if (!dto.parcelas || dto.parcelas < 2) {
        throw new BadRequestException('Número de parcelas é obrigatório para pagamento parcelado');
      }

      if (dto.parcelas > (config.maxParcelas || 12)) {
        throw new BadRequestException(`Número máximo de parcelas é ${config.maxParcelas || 12}`);
      }

      numeroParcelas = dto.parcelas;

      // Calcular juros
      const simulacao = this.calcularSimulacao(valorOriginal, numeroParcelas, config);
      juros = simulacao.valorJuros;
      valorFinal = simulacao.valorComJuros;
    }

    // Criar pagamento avançado
    const pagamento = await this.prisma.pagamentoAvancado.create({
      data: {
        vendaId: dto.vendaId,
        barbeariaId: venda.barbeariaId,
        tipo: dto.tipoPagamento === TipoPagamentoSimples.AVISTA ? TipoPagamento.DINHEIRO : TipoPagamento.CREDITO,
        metodo: dto.metodoPagamento as any,
        valorBruto: valorOriginal,
        valorCliente: valorFinal,
        valorLiquido: valorFinal,
        repassaJuros: dto.tipoPagamento === TipoPagamentoSimples.PARCELADO,
        status: StatusPagamento.CONCLUIDO,
        createdByUsuarioId: usuarioId,
      }
    });

    // Criar parcelas
    if (dto.tipoPagamento === TipoPagamentoSimples.PARCELADO && numeroParcelas > 1) {
      const valorParcela = valorFinal / numeroParcelas;
      const hoje = new Date();

      for (let i = 0; i < numeroParcelas; i++) {
        const dataVencimento = new Date(hoje);
        dataVencimento.setMonth(dataVencimento.getMonth() + i + 1);

        await this.prisma.parcelaAvancada.create({
          data: {
            pagamentoId: pagamento.id,
            numero: i + 1,
            valor: valorParcela,
            dataVencimento: dataVencimento,
            status: StatusParcela.PAGA, // Marcar como paga se pagamento foi aprovado
            dataPagamento: new Date(),
            createdByUsuarioId: usuarioId,
          }
        });
      }
    } else {
      // Criar uma única parcela para pagamento à vista
      await this.prisma.parcelaAvancada.create({
        data: {
          pagamentoId: pagamento.id,
          numero: 1,
          valor: valorFinal,
          dataVencimento: new Date(),
          status: StatusParcela.PAGA,
          dataPagamento: new Date(),
          createdByUsuarioId: usuarioId,
        }
      });
    }

    // Criar registro na tabela Pagamento para compatibilidade
    const pagamentoSimples = await this.prisma.pagamento.create({
      data: {
        vendaId: dto.vendaId,
        valor: valorFinal,
        metodo: dto.metodoPagamento,
        status: 'APROVADO' as any,
        pagoEm: new Date(),
        pagamentoAvancadoId: pagamento.id,
        createdByUsuarioId: usuarioId,
      }
    });

    // Atualizar status da venda para PAGA
    await this.prisma.venda.update({
      where: { id: dto.vendaId },
      data: { 
        status: 'PAGA' as any,
        updatedAt: new Date()
      }
    });

    // Emitir evento VENDA_PAGA
    this.eventEmitter.emit(DomainEventType.VENDA_PAGA, {
      vendaId: dto.vendaId,
      pagamentoId: pagamentoSimples.id, // Usar o ID do pagamento simples
      total: valorFinal,
      metodoPagamento: dto.metodoPagamento,
      barbeariaId: venda.barbeariaId,
      clienteId: venda.clienteId,
      barbeiroId: venda.barbeiroId,
    });

    return {
      id: pagamento.id,
      vendaId: dto.vendaId,
      metodoPagamento: dto.metodoPagamento,
      tipoPagamento: dto.tipoPagamento,
      valorOriginal,
      valorPago: valorFinal,
      desconto: desconto > 0 ? desconto : undefined,
      juros: juros > 0 ? juros : undefined,
      parcelas: numeroParcelas > 1 ? numeroParcelas : undefined,
      status: 'APROVADO',
      createdAt: pagamento.createdAt,
    };
  }
}
