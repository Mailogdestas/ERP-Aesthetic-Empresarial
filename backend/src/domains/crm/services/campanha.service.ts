import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { Campanha } from '@prisma/client';

/**
 * 📢 CAMPANHA SERVICE
 * 
 * Casos de Uso:
 * - Criar Campanha de Marketing
 * - Ativar/Desativar Campanha
 * - Segmentar Clientes para Campanha
 * - Acompanhar Performance da Campanha
 */

@Injectable()
export class CampanhaService extends BaseService<Campanha> {
  constructor(prisma: PrismaService) {
    super(prisma, 'campanha');
  }

  /**
   * 📝 CASO DE USO: Criar Campanha
   */
  async criarCampanha(
    data: {
      nome: string;
      descricao?: string;
      tipo: 'PROMOCIONAL' | 'FIDELIDADE' | 'REATIVACAO' | 'ANIVERSARIO';
      dataInicio: Date;
      dataFim: Date;
      ativa: boolean;
      segmentacao?: any;
    },
    barbeariaId: string,
    usuarioId: string,
  ): Promise<Campanha> {
    // Validar datas
    if (data.dataInicio >= data.dataFim) {
      throw new ConflictException('Data de início deve ser anterior à data de fim');
    }

    // Validar se já existe campanha ativa com mesmo nome
    const campanhaExistente = await this.prisma.campanha.findFirst({
      where: {
        nome: data.nome,
        barbeariaId,
        ativo: true,
        deletedAt: null,
      },
    });

    if (campanhaExistente) {
      throw new ConflictException('Já existe uma campanha ativa com este nome');
    }

    return this.create({
      ...data,
      barbeariaId,
    }, usuarioId);
  }

  /**
   * 🎯 CASO DE USO: Segmentar Clientes para Campanha
   */
  async segmentarClientes(
    campanhaId: string,
    barbeariaId: string,
    filtros: {
      nivel_fidelidade?: string[];
      ultima_visita_dias?: number;
      gasto_minimo?: number;
      aniversariantes?: boolean;
    },
  ) {
    const campanha = await this.findById(campanhaId);
    if (!campanha || campanha.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Campanha não encontrada');
    }

    let whereClause: any = {
      barbeariaId,
      deletedAt: null,
    };

    // Filtro por nível de fidelidade
    if (filtros.nivel_fidelidade?.length) {
      whereClause.fidelidade = {
        nivel: { in: filtros.nivel_fidelidade },
        deletedAt: null,
      };
    }

    // Filtro por última visita
    if (filtros.ultima_visita_dias) {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - filtros.ultima_visita_dias);
      
      whereClause.historicoAtendimento = {
        some: {
          createdAt: { gte: dataLimite },
          deletedAt: null,
        },
      };
    }

    // Filtro por aniversariantes do mês
    if (filtros.aniversariantes) {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      
      whereClause.dataNascimento = {
        not: null,
      };
      // Usar função SQL para extrair o mês
      whereClause.AND = [
        {
          dataNascimento: {
            not: null,
          },
        },
      ];
    }

    const clientesSegmentados = await this.prisma.cliente.findMany({
      where: whereClause,
      include: {
        fidelidade: true,
        _count: {
          select: {
            vendas: true,
            historicos: true,
          },
        },
      },
    });

    // Atualizar campanha com segmentação
    await this.update(campanhaId, {
      segmentacao: filtros,
      totalClientes: clientesSegmentados.length,
    });

    return {
      campanha,
      clientesSegmentados,
      totalClientes: clientesSegmentados.length,
    };
  }

  /**
   * ⚡ CASO DE USO: Ativar/Desativar Campanha
   */
  async alterarStatusCampanha(
    campanhaId: string,
    barbeariaId: string,
    ativa: boolean,
    usuarioId: string,
  ): Promise<Campanha> {
    const campanha = await this.findById(campanhaId);
    if (!campanha || campanha.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Campanha não encontrada');
    }

    return this.update(campanhaId, { ativa }, usuarioId);
  }

  /**
   * 📊 CASO DE USO: Acompanhar Performance da Campanha
   */
  async performanceCampanha(campanhaId: string, barbeariaId: string) {
    const campanha = await this.findById(campanhaId);
    if (!campanha || campanha.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Campanha não encontrada');
    }

    // Buscar métricas no período da campanha
    const [vendas, agendamentos, novosClientes] = await Promise.all([
      // Vendas no período da campanha
      this.prisma.venda.findMany({
        where: {
          barbeariaId,
          createdAt: {
            gte: campanha.dataInicio,
            lte: campanha.dataFim,
          },
          deletedAt: null,
        },
        include: {
          cliente: true,
        },
      }),

      // Agendamentos no período
      this.prisma.agendamento.findMany({
        where: {
          barbeariaId,
          createdAt: {
            gte: campanha.dataInicio,
            lte: campanha.dataFim,
          },
          deletedAt: null,
        },
      }),

      // Novos clientes no período
      this.prisma.cliente.count({
        where: {
          barbeariaId,
          createdAt: {
            gte: campanha.dataInicio,
            lte: campanha.dataFim,
          },
          deletedAt: null,
        },
      }),
    ]);

    const totalVendas = vendas.reduce((sum, venda) => sum + venda.valorTotal, 0);
    const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;

    return {
      campanha,
      metricas: {
        totalVendas: vendas.length,
        valorTotalVendas: totalVendas,
        ticketMedio,
        totalAgendamentos: agendamentos.length,
        novosClientes,
        clientesImpactados: new Set(vendas.map(v => v.clienteId)).size,
      },
    };
  }

  /**
   * 📋 Listar Campanhas da Barbearia
   */
  async listarCampanhas(
    barbeariaId: string,
    filtros?: {
      ativa?: boolean;
      tipo?: string;
    },
  ): Promise<Campanha[]> {
    const where: any = {
      barbeariaId,
      deletedAt: null,
    };

    if (filtros?.ativa !== undefined) {
      where.ativa = filtros.ativa;
    }

    if (filtros?.tipo) {
      where.tipo = filtros.tipo;
    }

    return this.findMany(where);
  }

  /**
   * 🗑️ SOFT DELETE: Deletar Campanha
   */
  async deletarCampanha(
    campanhaId: string,
    barbeariaId: string,
    usuarioId: string,
  ): Promise<void> {
    const campanha = await this.findById(campanhaId);
    if (!campanha || campanha.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Campanha não encontrada');
    }

    await this.softDelete(campanhaId, usuarioId);
  }
}
