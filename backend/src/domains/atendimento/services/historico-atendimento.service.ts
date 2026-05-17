import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { HistoricoAtendimento, AvaliacaoCliente } from '@prisma/client';
import { 
  CreateHistoricoAtendimentoDto, 
  UpdateHistoricoAtendimentoDto, 
  HistoricoAtendimentoResponseDto,
  AtendimentoHistoricoQueryDto,
  RelatorioAtendimentoDto,
  StatusAtendimento,
  AvaliacaoAtendimento
} from '../dto/atendimento.dto';

@Injectable()
export class HistoricoAtendimentoService extends BaseService<HistoricoAtendimento> {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'historicoAtendimento');
  }

  // ===== CASOS DE USO PRINCIPAIS =====

  /**
   * UC - Registrar Início de Atendimento
   * Chamado quando agendamento muda para EM_ANDAMENTO
   */
  async registrarInicioAtendimento(dto: CreateHistoricoAtendimentoDto): Promise<HistoricoAtendimentoResponseDto> {
    // Validar se agendamento existe e está no status correto
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id: dto.agendamentoId },
      include: {
        cliente: true,
        barbeiro: true,
        servico: true
      }
    });

    if (!agendamento) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (agendamento.status !== 'EM_ANDAMENTO') {
      throw new BadRequestException('Agendamento deve estar EM_ANDAMENTO para registrar atendimento');
    }

    // Verificar se já existe histórico para este agendamento
    const historicoExistente = await this.prisma.historicoAtendimento.findFirst({
      where: { agendamentoId: dto.agendamentoId }
    });

    if (historicoExistente) {
      throw new BadRequestException('Já existe histórico para este agendamento');
    }

    // Criar histórico de atendimento
    const historico = await this.prisma.historicoAtendimento.create({
      data: {
        agendamentoId: dto.agendamentoId,
        clienteId: dto.clienteId,
        barbeiroId: dto.barbeiroId,
        barbeariaId: agendamento.barbeariaId, // Usar do agendamento
        descricao: dto.observacoes || 'Atendimento realizado', // Campo obrigatório
        valorTotal: agendamento.servico?.preco || 0, // Usar preço do serviço
        dataHoraInicio: new Date(dto.dataHoraInicio),
        dataHoraFim: dto.dataHoraFim ? new Date(dto.dataHoraFim) : null,
        observacoes: dto.observacoes,
        servicoId: dto.servicoIds[0] || null
      },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true }
        },
        barbeiro: {
          select: { id: true, nome: true }
        },
        agendamento: {
          select: { id: true, inicio: true, status: true }
        },
        servico: {
          select: { id: true, nome: true, duracaoMin: true, preco: true }
        }
      }
    });

    return this.formatHistoricoResponse(historico);
  }

  /**
   * UC - Finalizar Atendimento
   * Chamado quando atendimento é concluído
   */
  async finalizarAtendimento(
    agendamentoId: string, 
    dto: UpdateHistoricoAtendimentoDto
  ): Promise<HistoricoAtendimentoResponseDto> {
    const historico = await this.prisma.historicoAtendimento.findFirst({
      where: { agendamentoId }
    });

    if (!historico) {
      throw new NotFoundException('Histórico de atendimento não encontrado');
    }

    // Remover verificação de status pois o campo não existe no modelo
    // O histórico pode ser atualizado se ainda não foi finalizado

    const dataHoraFim = dto.dataHoraFim ? new Date(dto.dataHoraFim) : new Date();
    const duracaoMinutos = Math.round(
      (dataHoraFim.getTime() - historico.dataHoraInicio.getTime()) / (1000 * 60)
    );

    const historicoAtualizado = await this.prisma.historicoAtendimento.update({
      where: { id: historico.id },
      data: {
        dataHoraFim,
        duracaoMinutos,
        observacoes: dto.observacoes || historico.observacoes,
        avaliacaoCliente: dto.avaliacaoCliente ? this.mapAvaliacaoToCliente(dto.avaliacaoCliente) : null,
        comentarioAvaliacao: dto.comentarioAvaliacao
      },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true }
        },
        barbeiro: {
          select: { id: true, nome: true }
        },
        agendamento: {
          select: { id: true, inicio: true, status: true }
        },
        servico: {
          select: { id: true, nome: true, duracaoMin: true, preco: true }
        }
      }
    });

    return this.formatHistoricoResponse(historicoAtualizado);
  }

  /**
   * Mapeia AvaliacaoAtendimento para AvaliacaoCliente
   */
  private mapAvaliacaoToCliente(avaliacao: AvaliacaoAtendimento): AvaliacaoCliente {
    const mapeamento = {
      [AvaliacaoAtendimento.MUITO_RUIM]: AvaliacaoCliente.MUITO_RUIM,
      [AvaliacaoAtendimento.RUIM]: AvaliacaoCliente.RUIM,
      [AvaliacaoAtendimento.REGULAR]: AvaliacaoCliente.REGULAR,
      [AvaliacaoAtendimento.BOM]: AvaliacaoCliente.BOM,
      [AvaliacaoAtendimento.EXCELENTE]: AvaliacaoCliente.EXCELENTE
    };
    return mapeamento[avaliacao];
  }


  /**
   * UC - Registrar Avaliação do Cliente
   */
  async registrarAvaliacao(
    historicoId: string,
    avaliacao: AvaliacaoCliente,
    comentario?: string
  ): Promise<HistoricoAtendimentoResponseDto> {
    const historico = await this.prisma.historicoAtendimento.findUnique({
      where: { id: historicoId }
    });

    if (!historico) {
      throw new NotFoundException('Histórico de atendimento não encontrado');
    }

    // Remover verificação de status pois o campo não existe no modelo
    // O histórico já foi criado, então pode ser avaliado

    const historicoAtualizado = await this.prisma.historicoAtendimento.update({
      where: { id: historicoId },
      data: {
        avaliacaoCliente: avaliacao ?? null,
        comentarioAvaliacao: comentario
      },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true }
        },
        barbeiro: {
          select: { id: true, nome: true }
        },
        agendamento: {
          select: { id: true, inicio: true, status: true }
        },
        servico: {
            select: { id: true, nome: true, duracaoMin: true, preco: true }
          }
      }
    });

    return this.formatHistoricoResponse(historicoAtualizado);
  }

  // ===== CONSULTAS E RELATÓRIOS =====

  /**
   * UC - Listar Histórico de Atendimentos
   */
  async listarHistorico(query: AtendimentoHistoricoQueryDto): Promise<HistoricoAtendimentoResponseDto[]> {
    const where: any = {};

    if (query.dataInicio || query.dataFim) {
      where.dataHoraInicio = {};
      if (query.dataInicio) where.dataHoraInicio.gte = new Date(query.dataInicio);
      if (query.dataFim) where.dataHoraInicio.lte = new Date(query.dataFim);
    }

    if (query.barbeiroId) where.barbeiroId = query.barbeiroId;
    if (query.clienteId) where.clienteId = query.clienteId;
    if (query.status) where.status = query.status;
    if (query.avaliacaoMinima) {
      where.avaliacaoCliente = { gte: query.avaliacaoMinima };
    }

    const historicos = await this.prisma.historicoAtendimento.findMany({
      where,
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true }
        },
        barbeiro: {
          select: { id: true, nome: true }
        },
        agendamento: {
          select: { id: true, inicio: true, status: true }
        },
        servico: {
            select: { id: true, nome: true, duracaoMin: true, preco: true }
          }
      },
      orderBy: { dataHoraInicio: 'desc' }
    });

    return historicos.map(h => this.formatHistoricoResponse(h));
  }

  /**
   * UC - Buscar Histórico por Cliente
   */
  async buscarHistoricoPorCliente(clienteId: string): Promise<HistoricoAtendimentoResponseDto[]> {
    const historicos = await this.prisma.historicoAtendimento.findMany({
      where: { clienteId },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true }
        },
        barbeiro: {
          select: { id: true, nome: true }
        },
        agendamento: {
          select: { id: true, inicio: true, status: true }
        },
        servico: {
            select: { id: true, nome: true, duracaoMin: true, preco: true }
          }
      },
      orderBy: { dataHoraInicio: 'desc' }
    });

    return historicos.map(h => this.formatHistoricoResponse(h));
  }

  /**
   * UC - Gerar Relatório de Atendimentos
   */
  async gerarRelatorio(
    dataInicio: Date, 
    dataFim: Date, 
    barbeiroId?: string
  ): Promise<RelatorioAtendimentoDto> {
    const where: any = {
      dataHoraInicio: {
        gte: dataInicio,
        lte: dataFim
      }
    };

    if (barbeiroId) where.barbeiroId = barbeiroId;

    // Estatísticas gerais
    const [
      totalAtendimentos,
      atendimentosConcluidos,
      atendimentosCancelados,
      tempoMedio
    ] = await Promise.all([
      this.prisma.historicoAtendimento.count({ where }),
      this.prisma.historicoAtendimento.count({ 
        where: { ...where, dataHoraFim: { not: null } } 
      }),
      this.prisma.historicoAtendimento.count({ 
        where: { ...where, observacoes: { contains: 'cancelado' } } 
      }),
      this.prisma.historicoAtendimento.aggregate({
        where: { ...where, duracaoMinutos: { not: null } },
        _avg: { duracaoMinutos: true }
      })
    ]);

    // Avaliação média geral (usando findMany e cálculo manual)
    const avaliacoesGerais = await this.prisma.historicoAtendimento.findMany({
      where: { ...where, avaliacaoCliente: { not: null } },
      select: { avaliacaoCliente: true }
    });

    const avaliacaoMediaGeral = avaliacoesGerais.length > 0 
      ? avaliacoesGerais.reduce((sum, item) => sum + Number(item.avaliacaoCliente), 0) / avaliacoesGerais.length
      : 0;

    // Performance por barbeiro (sem groupBy para evitar TS2615)
    const performanceBarbeiros = await this.prisma.historicoAtendimento.findMany({
      where,
      select: {
        barbeiroId: true,
        duracaoMinutos: true
      }
    });

    // Agrupar manualmente por barbeiro
    const barbeirosMap = new Map<string, { count: number; totalDuracao: number }>();
    performanceBarbeiros.forEach(item => {
      const existing = barbeirosMap.get(item.barbeiroId) || { count: 0, totalDuracao: 0 };
      barbeirosMap.set(item.barbeiroId, {
        count: existing.count + 1,
        totalDuracao: existing.totalDuracao + (item.duracaoMinutos || 0)
      });
    });

    // Avaliações por barbeiro (sem groupBy)
    const avaliacoesBarbeiros = await this.prisma.historicoAtendimento.findMany({
      where: { ...where, avaliacaoCliente: { not: null } },
      select: {
        barbeiroId: true,
        avaliacaoCliente: true
      }
    });

    // Agrupar avaliações manualmente
    const avaliacoesMap = new Map<string, { count: number; totalAvaliacao: number }>();
    avaliacoesBarbeiros.forEach(item => {
      if (item.avaliacaoCliente) {
        const existing = avaliacoesMap.get(item.barbeiroId) || { count: 0, totalAvaliacao: 0 };
        avaliacoesMap.set(item.barbeiroId, {
          count: existing.count + 1,
          totalAvaliacao: existing.totalAvaliacao + Number(item.avaliacaoCliente)
        });
      }
    });

    const barbeirosDetalhes = await Promise.all(
      Array.from(barbeirosMap.entries()).map(async ([barbeiroId, stats]) => {
        const barbeiro = await this.prisma.barbeiro.findUnique({
          where: { id: barbeiroId },
          select: { nome: true }
        });

        const clientesUnicos = await this.prisma.historicoAtendimento.findMany({
          where: { ...where, barbeiroId },
          select: { clienteId: true },
          distinct: ['clienteId']
        });

        // Buscar avaliação média para este barbeiro
        const avaliacaoBarbeiro = avaliacoesMap.get(barbeiroId);

        return {
          barbeiroId,
          barbeiro: barbeiro?.nome || 'N/A',
          totalAtendimentos: stats.count,
          tempoMedio: Math.round(stats.totalDuracao / stats.count || 0),
          avaliacaoMedia: avaliacaoBarbeiro 
            ? Number((avaliacaoBarbeiro.totalAvaliacao / avaliacaoBarbeiro.count).toFixed(1))
            : 0,
          clientesUnicos: clientesUnicos.length
        };
      })
    );

    // Distribuição de avaliações
    const distribuicaoAvaliacoes = await this.prisma.historicoAtendimento.groupBy({
      by: ['avaliacaoCliente'],
      where: { ...where, avaliacaoCliente: { not: null } },
      _count: { id: true }
    });

    const distribuicao: { 1: number; 2: number; 3: number; 4: number; 5: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    distribuicaoAvaliacoes.forEach(d => {
      if (d.avaliacaoCliente) {
        // Mapear AvaliacaoCliente para número
        const avaliacaoMap: { [key in AvaliacaoCliente]: 1 | 2 | 3 | 4 | 5 } = {
          [AvaliacaoCliente.MUITO_RUIM]: 1,
          [AvaliacaoCliente.RUIM]: 2,
          [AvaliacaoCliente.REGULAR]: 3,
          [AvaliacaoCliente.BOM]: 4,
          [AvaliacaoCliente.EXCELENTE]: 5
        };
        distribuicao[avaliacaoMap[d.avaliacaoCliente]] = d._count.id;
      }
    });

    return {
      periodo: { dataInicio, dataFim },
      estatisticas: {
        totalAtendimentos,
        atendimentosConcluidos,
        atendimentosCancelados,
        tempoMedioAtendimento: Math.round(tempoMedio._avg.duracaoMinutos || 0),
        avaliacaoMedia: Number(avaliacaoMediaGeral.toFixed(1))
      },
      performanceBarbeiros: barbeirosDetalhes,
      servicosPopulares: [], // TODO: Implementar quando tiver relação com serviços
      distribuicaoAvaliacoes: distribuicao
    };
  }

  // ===== MÉTODOS AUXILIARES =====

  private formatHistoricoResponse(historico: any): HistoricoAtendimentoResponseDto {
    return {
      id: historico.id,
      agendamentoId: historico.agendamentoId,
      clienteId: historico.clienteId,
      barbeiroId: historico.barbeiroId,
      dataHoraInicio: historico.dataHoraInicio,
      dataHoraFim: historico.dataHoraFim,
      duracaoMinutos: historico.duracaoMinutos || 0,
      status: historico.status,
      observacoes: historico.observacoes || '',
      avaliacaoCliente: historico.avaliacaoCliente,
      comentarioAvaliacao: historico.comentarioAvaliacao || '',
      createdAt: historico.createdAt,
      updatedAt: historico.updatedAt,
      cliente: historico.cliente,
      barbeiro: historico.barbeiro,
      agendamento: historico.agendamento,
      servicos: historico.servico ? [historico.servico] : []
    };
  }
}
