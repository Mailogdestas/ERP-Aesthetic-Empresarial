import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { 
  CreateFechamentoDiarioDto, 
  UpdateFechamentoDiarioDto, 
  FechamentoDiarioQueryDto,
  ProcessarFechamentoDiarioDto 
} from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FechamentoDiarioService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processa fechamento diário automaticamente
   */
  async processarFechamentoDiario(
    barbeariaId: string,
    userId: string,
    dto: ProcessarFechamentoDiarioDto
  ) {
    const dataFechamento = new Date(dto.data);
    
    // Verifica se já existe fechamento para esta data
    const fechamentoExistente = await this.prisma.fechamentoDiario.findUnique({
      where: {
        barbeariaId_data: {
          barbeariaId,
          data: dataFechamento
        }
      }
    });

    if (fechamentoExistente && !dto.forcarReprocessamento) {
      throw new BadRequestException('Fechamento já existe para esta data');
    }

    // Busca dados do dia
    const dadosDia = await this.calcularDadosDia(barbeariaId, dataFechamento);

    const dadosFechamento = {
      barbeariaId,
      data: dataFechamento,
      saldoInicial: dadosDia.saldoInicial,
      totalVendas: dadosDia.totalVendas,
      totalDinheiro: dadosDia.totalDinheiro,
      totalCartao: dadosDia.totalCartao,
      totalPix: dadosDia.totalPix,
      totalDespesas: dadosDia.totalDespesas,
      saldoFinal: dadosDia.saldoFinal,
      fechadoPorId: userId
    };

    if (fechamentoExistente) {
      // Atualiza fechamento existente
      return this.prisma.fechamentoDiario.update({
        where: { id: fechamentoExistente.id },
        data: dadosFechamento,
        include: {
          fechadoPor: {
            select: { id: true, nome: true, email: true }
          },
          barbearia: {
            select: { id: true, nome: true }
          }
        }
      });
    } else {
      // Cria novo fechamento
      return this.prisma.fechamentoDiario.create({
        data: dadosFechamento,
        include: {
          fechadoPor: {
            select: { id: true, nome: true, email: true }
          },
          barbearia: {
            select: { id: true, nome: true }
          }
        }
      });
    }
  }

  /**
   * Calcula dados do dia para fechamento
   */
  private async calcularDadosDia(barbeariaId: string, data: Date) {
    const inicioData = new Date(data);
    inicioData.setHours(0, 0, 0, 0);
    
    const fimData = new Date(data);
    fimData.setHours(23, 59, 59, 999);

    // Busca saldo inicial (fechamento do dia anterior)
    const dataAnterior = new Date(data);
    dataAnterior.setDate(dataAnterior.getDate() - 1);
    
    const fechamentoAnterior = await this.prisma.fechamentoDiario.findUnique({
      where: {
        barbeariaId_data: {
          barbeariaId,
          data: dataAnterior
        }
      }
    });

    const saldoInicial = fechamentoAnterior?.saldoFinal || new Decimal(0);

    // Busca vendas do dia
    const vendas = await this.prisma.venda.findMany({
      where: {
        barbeariaId,
        createdAt: {
          gte: inicioData,
          lte: fimData
        },
        status: 'FINALIZADA'
      },
      include: {
        pagamentos: true
      }
    });

    // Calcula totais por forma de pagamento
    let totalVendas = new Decimal(0);
    let totalDinheiro = new Decimal(0);
    let totalCartao = new Decimal(0);
    let totalPix = new Decimal(0);

    vendas.forEach(venda => {
      totalVendas = totalVendas.add(venda.valorTotal);
      
      venda.pagamentos.forEach(pagamento => {
        if (pagamento.status === 'APROVADO') {
          switch (pagamento.metodo) {
            case 'DINHEIRO':
              totalDinheiro = totalDinheiro.add(pagamento.valor);
              break;
            case 'CARTAO':
              totalCartao = totalCartao.add(pagamento.valor);
              break;
            case 'PIX':
              totalPix = totalPix.add(pagamento.valor);
              break;
          }
        }
      });
    });

    // Busca despesas pagas no dia
    const despesas = await this.prisma.despesa.findMany({
      where: {
        barbeariaId,
        pagoEm: {
          gte: inicioData,
          lte: fimData
        },
        deletedAt: null
      }
    });

    const totalDespesas = despesas.reduce(
      (total, despesa) => total.add(despesa.valor),
      new Decimal(0)
    );

    // Calcula saldo final
    const saldoFinal = saldoInicial
      .add(totalVendas)
      .sub(totalDespesas);

    return {
      saldoInicial,
      totalVendas,
      totalDinheiro,
      totalCartao,
      totalPix,
      totalDespesas,
      saldoFinal
    };
  }

  /**
   * Cria fechamento manual
   */
  async criarFechamento(
    barbeariaId: string,
    userId: string,
    dto: CreateFechamentoDiarioDto
  ) {
    const dataFechamento = new Date(dto.data);
    
    // Verifica se já existe fechamento para esta data
    const fechamentoExistente = await this.prisma.fechamentoDiario.findUnique({
      where: {
        barbeariaId_data: {
          barbeariaId,
          data: dataFechamento
        }
      }
    });

    if (fechamentoExistente) {
      throw new BadRequestException('Fechamento já existe para esta data');
    }

    return this.prisma.fechamentoDiario.create({
      data: {
        barbeariaId,
        data: dataFechamento,
        saldoInicial: dto.saldoInicial,
        totalVendas: dto.totalVendas,
        totalDinheiro: dto.totalDinheiro,
        totalCartao: dto.totalCartao,
        totalPix: dto.totalPix,
        totalDespesas: dto.totalDespesas,
        saldoFinal: dto.saldoFinal,
        saldoConferido: dto.saldoConferido,
        diferenca: dto.diferenca,
        observacoes: dto.observacoes,
        fechadoPorId: userId
      },
      include: {
        fechadoPor: {
          select: { id: true, nome: true, email: true }
        },
        barbearia: {
          select: { id: true, nome: true }
        }
      }
    });
  }

  /**
   * Lista fechamentos com filtros
   */
  async listarFechamentos(barbeariaId: string, query: FechamentoDiarioQueryDto) {
    // Garantir valores padrão para paginação
    const page = query.page || 1;
    const limit = query.limit || 10;

    const where: any = {
      barbeariaId,
      deletedAt: null
    };

    if (query.dataInicial || query.dataFinal) {
      where.data = {};
      if (query.dataInicial) {
        where.data.gte = new Date(query.dataInicial);
      }
      if (query.dataFinal) {
        where.data.lte = new Date(query.dataFinal);
      }
    }

    const [fechamentos, total] = await Promise.all([
      this.prisma.fechamentoDiario.findMany({
        where,
        include: {
          fechadoPor: {
            select: { id: true, nome: true, email: true }
          },
          barbearia: {
            select: { id: true, nome: true }
          }
        },
        orderBy: { data: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.fechamentoDiario.count({ where })
    ]);

    return {
      data: fechamentos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Busca fechamento por ID
   */
  async buscarFechamento(barbeariaId: string, id: string) {
    const fechamento = await this.prisma.fechamentoDiario.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null
      },
      include: {
        fechadoPor: {
          select: { id: true, nome: true, email: true }
        },
        barbearia: {
          select: { id: true, nome: true }
        },
        caixaSessoes: {
          include: {
            barbeiro: {
              select: { id: true, nome: true }
            },
            operador: {
              select: { id: true, nome: true }
            },
            openedByUser: {
              select: { id: true, nome: true }
            },
            closedByUser: {
              select: { id: true, nome: true }
            }
          }
        },
        movimentos: {
          include: {
            venda: {
              select: { id: true, valorTotal: true }
            },
            pagamento: {
              select: { id: true, valor: true, metodo: true }
            }
          }
        }
      }
    });

    if (!fechamento) {
      throw new NotFoundException('Fechamento não encontrado');
    }

    return fechamento;
  }

  /**
   * Busca fechamento por data
   */
  async buscarFechamentoPorData(barbeariaId: string, data: string) {
    const dataFechamento = new Date(data);
    
    const fechamento = await this.prisma.fechamentoDiario.findUnique({
      where: {
        barbeariaId_data: {
          barbeariaId,
          data: dataFechamento
        }
      },
      include: {
        fechadoPor: {
          select: { id: true, nome: true, email: true }
        },
        barbearia: {
          select: { id: true, nome: true }
        }
      }
    });

    if (!fechamento) {
      throw new NotFoundException('Fechamento não encontrado para esta data');
    }

    return fechamento;
  }

  /**
   * Atualiza fechamento (conferência)
   */
  async atualizarFechamento(
    barbeariaId: string,
    id: string,
    dto: UpdateFechamentoDiarioDto
  ) {
    const fechamento = await this.prisma.fechamentoDiario.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null
      }
    });

    if (!fechamento) {
      throw new NotFoundException('Fechamento não encontrado');
    }

    // Calcula diferença se saldoConferido foi informado
    let diferenca = dto.diferenca;
    if (dto.saldoConferido && !diferenca) {
      diferenca = dto.saldoConferido.sub(fechamento.saldoFinal);
    }

    return this.prisma.fechamentoDiario.update({
      where: { id },
      data: {
        saldoConferido: dto.saldoConferido,
        diferenca,
        observacoes: dto.observacoes
      },
      include: {
        fechadoPor: {
          select: { id: true, nome: true, email: true }
        },
        barbearia: {
          select: { id: true, nome: true }
        }
      }
    });
  }

  /**
   * Remove fechamento (soft delete)
   */
  async removerFechamento(barbeariaId: string, id: string) {
    const fechamento = await this.prisma.fechamentoDiario.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null
      }
    });

    if (!fechamento) {
      throw new NotFoundException('Fechamento não encontrado');
    }

    return this.prisma.fechamentoDiario.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Busca resumo de fechamentos por período
   */
  async resumoFechamentos(
    barbeariaId: string,
    dataInicial: string,
    dataFinal: string
  ) {
    const fechamentos = await this.prisma.fechamentoDiario.findMany({
      where: {
        barbeariaId,
        data: {
          gte: new Date(dataInicial),
          lte: new Date(dataFinal)
        },
        deletedAt: null
      },
      orderBy: { data: 'asc' }
    });

    const resumo = fechamentos.reduce(
      (acc, fechamento) => ({
        totalVendas: acc.totalVendas.add(fechamento.totalVendas),
        totalDinheiro: acc.totalDinheiro.add(fechamento.totalDinheiro),
        totalCartao: acc.totalCartao.add(fechamento.totalCartao),
        totalPix: acc.totalPix.add(fechamento.totalPix),
        totalDespesas: acc.totalDespesas.add(fechamento.totalDespesas),
        totalDiferenca: acc.totalDiferenca.add(fechamento.diferenca || new Decimal(0))
      }),
      {
        totalVendas: new Decimal(0),
        totalDinheiro: new Decimal(0),
        totalCartao: new Decimal(0),
        totalPix: new Decimal(0),
        totalDespesas: new Decimal(0),
        totalDiferenca: new Decimal(0)
      }
    );

    return {
      periodo: { dataInicial, dataFinal },
      totalFechamentos: fechamentos.length,
      resumo,
      fechamentos
    };
  }
}