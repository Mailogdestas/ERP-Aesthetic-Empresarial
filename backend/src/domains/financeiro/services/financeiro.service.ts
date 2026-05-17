import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateDespesaDto, CreateComissaoDto, CreateRepasseDto, PagarDespesaDto, PagarDespesaResponseDto } from '../dto';
import { Comissao, RepasseBarbeiro, Despesa, PagamentoStatus, MetodoPagamento } from '@prisma/client';
import { DomainEventType } from '../../../shared/events/domain-events';

interface DespesaFilters {
  barbeariaId: string;
  dataInicio?: Date;
  dataFim?: Date;
  categoria?: string;
}

interface ComissaoFilters {
  barbeariaId: string;
  barbeiroId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  status?: string;
}

interface RepasseFilters {
  barbeariaId: string;
  barbeiroId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

@Injectable()
export class FinanceiroService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createDespesa(createDespesaDto: CreateDespesaDto): Promise<Despesa> {
    return this.prisma.despesa.create({
      data: {
        barbeariaId: createDespesaDto.barbeariaId,
        descricao: createDespesaDto.descricao,
        valor: createDespesaDto.valor,
        tipo: createDespesaDto.categoria || 'GERAL',
        vencimento: createDespesaDto.data || new Date(),
        createdByUsuarioId: createDespesaDto.usuarioId,
      },
    });
  }

  async findDespesas(filters: DespesaFilters) {
    const where: any = {
      barbeariaId: filters.barbeariaId,
    };

    if (filters.dataInicio && filters.dataFim) {
      where.vencimento = {
        gte: filters.dataInicio,
        lte: filters.dataFim,
      };
    }

    if (filters.categoria) {
      where.categoria = filters.categoria;
    }

    return this.prisma.despesa.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createComissao(createComissaoDto: CreateComissaoDto): Promise<Comissao> {
    return this.prisma.comissao.create({
      data: {
        vendaId: createComissaoDto.vendaId,
        barbeiroId: createComissaoDto.barbeiroId,
        percentual: createComissaoDto.percentual || 0,
        valor: createComissaoDto.valorFixo || (createComissaoDto.valorBase * (createComissaoDto.percentual || 0) / 100),
        barbeariaId: (await this.prisma.venda.findUnique({ 
          where: { id: createComissaoDto.vendaId },
          select: { barbeariaId: true }
        })).barbeariaId,
      },
    });
  }

  async findComissoes(filters: ComissaoFilters) {
    const where: any = {
      barbeiro: {
        barbeariaId: filters.barbeariaId,
      },
    };

    if (filters.barbeiroId) {
      where.barbeiroId = filters.barbeiroId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dataInicio && filters.dataFim) {
      where.createdAt = {
        gte: filters.dataInicio,
        lte: filters.dataFim,
      };
    }

    return this.prisma.comissao.findMany({
      where,
      include: {
        barbeiro: {
          select: {
            id: true,
            nome: true,
          },
        },
        venda: {
          select: {
            id: true,
            valorTotal: true,
            createdAt: true,
          },
        },
      },
      orderBy: { calculadoEm: 'desc' },
    });
  }

  async createRepasse(createRepasseDto: CreateRepasseDto): Promise<RepasseBarbeiro> {
    return this.prisma.repasseBarbeiro.create({
      data: {
        barbeiroId: createRepasseDto.barbeiroId,
        barbeariaId: createRepasseDto.barbeariaId,
        valor: createRepasseDto.valorTotal,
        status: 'PENDENTE' as any,
      },
    });
  }

  async findRepasses(filters: RepasseFilters) {
    const where: any = {};

    if (filters.barbeiroId) {
      where.barbeiroId = filters.barbeiroId;
    } else {
      where.barbeiro = {
        barbeariaId: filters.barbeariaId,
      };
    }

    if (filters.dataInicio && filters.dataFim) {
      where.createdAt = {
        gte: filters.dataInicio,
        lte: filters.dataFim,
      };
    }

    return this.prisma.repasseBarbeiro.findMany({
      where,
      include: {
        barbeiro: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboard(barbeariaId: string, periodo?: string) {
    const hoje = new Date();
    let dataInicio: Date;

    switch (periodo) {
      case 'semana':
        dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      default:
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }

    const [receitas, despesas, comissoesPendentes] = await Promise.all([
      this.prisma.venda.aggregate({
        where: {
          barbeariaId,
          createdAt: { gte: dataInicio },
          status: 'PAGA',
        },
        _sum: { valorTotal: true },
      }),
      this.prisma.despesa.aggregate({
        where: {
          barbeariaId,
          createdAt: { gte: dataInicio },
        },
        _sum: { valor: true },
      }),
      this.prisma.comissao.aggregate({
        where: {
          barbeiro: { barbeariaId },
          calculadoEm: { gte: dataInicio },
        },
        _sum: { valor: true },
      }),
    ]);

    const receitaTotal = receitas._sum.valorTotal || 0;
    const despesaTotal = despesas._sum.valor || 0;
    const comissoesPendentesTotal = comissoesPendentes._sum.valor || 0;

    return {
      receitas: receitaTotal,
      despesas: despesaTotal,
      lucroLiquido: receitaTotal - despesaTotal - comissoesPendentesTotal,
      comissoesPendentes: comissoesPendentesTotal,
      periodo,
    };
  }

  async getRelatorioFaturamento(barbeariaId: string, dataInicio: Date, dataFim: Date) {
    const vendas = await this.prisma.venda.findMany({
      where: {
        barbeariaId,
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: 'PAGA',
      },
      include: {
        itens: {
          include: {
            produto: true,
            servico: true,
          },
        },
        pagamentos: true,
      },
    });

    return {
      periodo: { dataInicio, dataFim },
      totalVendas: vendas.length,
      faturamentoTotal: vendas.reduce((sum, venda) => sum + venda.valorTotal, 0),
      vendas,
    };
  }

  async getRelatorioComissoes(barbeariaId: string, dataInicio: Date, dataFim: Date) {
    const comissoes = await this.prisma.comissao.findMany({
      where: {
        barbeiro: { barbeariaId },
        calculadoEm: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: {
        barbeiro: {
          select: {
            id: true,
            nome: true,
          },
        },
        venda: {
          select: {
            id: true,
            valorTotal: true,
          },
        },
      },
    });

    const totalComissoes = comissoes.reduce((sum, comissao) => sum + comissao.valor, 0);
    const comissoesPorBarbeiro = comissoes.reduce((acc, comissao) => {
      const barbeiroId = comissao.barbeiroId;
      if (!acc[barbeiroId]) {
        acc[barbeiroId] = {
          barbeiro: comissao.barbeiro,
          totalComissoes: 0,
          quantidadeVendas: 0,
        };
      }
      acc[barbeiroId].totalComissoes += comissao.valor;
      acc[barbeiroId].quantidadeVendas += 1;
      return acc;
    }, {});

    return {
      periodo: { dataInicio, dataFim },
      totalComissoes,
      comissoesPorBarbeiro: Object.values(comissoesPorBarbeiro),
      comissoes,
    };
  }

  /**
   * 💰 Pagar uma despesa cadastrada
   * Atualiza o status da despesa para PAGO e emite evento para o caixa
   */
  async pagarDespesa(despesaId: string, dto: PagarDespesaDto): Promise<PagarDespesaResponseDto> {
    // Buscar a despesa
    const despesa = await this.prisma.despesa.findUnique({
      where: { id: despesaId },
      include: {
        barbearia: { select: { id: true, nome: true } }
      }
    });

    if (!despesa) {
      throw new NotFoundException('Despesa não encontrada');
    }

    if (despesa.status === PagamentoStatus.APROVADO) {
      throw new BadRequestException('Esta despesa já foi paga');
    }

    // Atualizar a despesa
    const dataPagamento = dto.dataPagamento ? new Date(dto.dataPagamento) : new Date();
    
    const despesaAtualizada = await this.prisma.despesa.update({
      where: { id: despesaId },
      data: {
        status: PagamentoStatus.APROVADO,
        pagoEm: dataPagamento,
        metodo: dto.metodoPagamento as MetodoPagamento,
        updatedAt: new Date(),
      }
    });

    // Emitir evento DESPESA_PAGA para o domínio do caixa
    this.eventEmitter.emit('despesa.paga', {
      type: DomainEventType.DESPESA_PAGA,
      payload: {
        despesaId: despesa.id,
        descricao: despesa.descricao,
        valor: Number(despesa.valor),
        tipo: despesa.tipo,
        metodoPagamento: dto.metodoPagamento,
        dataPagamento,
        usuarioId: despesa.createdByUsuarioId || 'system',
        barbeariaId: despesa.barbeariaId,
      }
    });

    return {
      id: despesaAtualizada.id,
      descricao: despesaAtualizada.descricao,
      valor: Number(despesaAtualizada.valor),
      status: despesaAtualizada.status,
      metodoPagamento: despesaAtualizada.metodo || dto.metodoPagamento,
      dataPagamento: despesaAtualizada.pagoEm || dataPagamento,
      updatedAt: despesaAtualizada.updatedAt,
      observacoes: dto.observacoes,
    };
  }
}