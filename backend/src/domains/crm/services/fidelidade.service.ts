import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { DomainEventEmitterService } from '../../../shared/events/event-emitter.service';
import { OnEvent } from '@nestjs/event-emitter';
import { VendaPagaEvent, DomainEventType } from '../../../shared/events/domain-events';
import { Fidelidade } from '@prisma/client';

/**
 * 🎯 FIDELIDADE SERVICE
 * 
 * Casos de Uso:
 * - Gerar Pontos Fidelidade (via evento VENDA_PAGA)
 * - Consultar Pontos do Cliente
 * - Resgatar Pontos
 * - Calcular Nível de Fidelidade
 */

@Injectable()
export class FidelidadeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: DomainEventEmitterService,
  ) {}

  /**
   * 🎁 CASO DE USO: Gerar Pontos Fidelidade
   * Disparado automaticamente quando uma venda é paga
   */
  @OnEvent(DomainEventType.VENDA_PAGA)
  async gerarPontosFidelidade(event: VendaPagaEvent): Promise<void> {
    try {
      // Verificar se o evento tem payload válido
      if (!event.payload) {
        console.warn('[FIDELIDADE] Evento VENDA_PAGA sem payload');
        return;
      }

      const { clienteId, total, barbeariaId } = event.payload;

      // Se não há cliente associado, não gerar pontos
      if (!clienteId) {
        console.log('[FIDELIDADE] Venda sem cliente associado - não gerando pontos');
        return;
      }

      // Regra de negócio: 1 ponto para cada R$ 10,00 gastos
      const pontosGanhos = Math.floor(total / 10);

      if (pontosGanhos <= 0) return;

      // Buscar ou criar registro de fidelidade
      let fidelidade = await this.prisma.fidelidade.findFirst({
        where: {
          clienteId,
          barbeariaId,
        },
      });

      if (!fidelidade) {
        // Criar novo registro de fidelidade
        fidelidade = await this.prisma.fidelidade.create({
          data: {
            clienteId,
            barbeariaId,
            pontos: pontosGanhos,
            nivel: this.calcularNivel(pontosGanhos),
          },
        });
      } else {
        // Atualizar pontos existentes
        const novosPontos = fidelidade.pontos + pontosGanhos;

        await this.prisma.fidelidade.update({
          where: { id: fidelidade.id },
          data: {
            pontos: novosPontos,
            nivel: this.calcularNivel(novosPontos),
          },
        });
      }

      console.log(`[FIDELIDADE] Cliente ${clienteId} ganhou ${pontosGanhos} pontos`);

    } catch (error) {
      console.error('[FIDELIDADE_ERROR] Erro ao gerar pontos:', error);
    }
  }

  /**
   * 📊 CASO DE USO: Consultar Pontos do Cliente
   */
  async consultarPontos(clienteId: string, barbeariaId: string): Promise<Fidelidade | null> {
    return this.prisma.fidelidade.findFirst({
      where: {
        clienteId,
        barbeariaId,
      },
      include: {
        cliente: {
          select: {
            nome: true,
            telefone: true,
          },
        },
      },
    });
  }

  /**
   * 🎁 CASO DE USO: Resgatar Pontos
   */
  async resgatarPontos(
    clienteId: string,
    barbeariaId: string,
    pontosResgatar: number,
    usuarioId: string,
  ): Promise<Fidelidade> {
    const fidelidade = await this.consultarPontos(clienteId, barbeariaId);

    if (!fidelidade) {
      throw new NotFoundException('Cliente não possui programa de fidelidade');
    }

    if (fidelidade.pontos < pontosResgatar) {
      throw new Error(`Cliente possui apenas ${fidelidade.pontos} pontos`);
    }

    const novosPontos: number = fidelidade.pontos - pontosResgatar;
    const novoNivel: string = this.calcularNivel(novosPontos);

    return await this.prisma.fidelidade.update({
      where: { 
        id: fidelidade.id 
      },
      data: {
        pontos: novosPontos,
        nivel: novoNivel,
      },
    });
  }

  /**
   * ➕ CASO DE USO: Adicionar Pontos Manualmente
   * Permite adicionar pontos de fidelidade manualmente para um cliente
   */
  async adicionarPontosManual(
    clienteId: string,
    barbeariaId: string,
    pontosAdicionar: number,
    usuarioId: string,
    motivo?: string,
  ): Promise<Fidelidade> {
    if (pontosAdicionar <= 0) {
      throw new Error('A quantidade de pontos deve ser maior que zero');
    }

    // Buscar ou criar registro de fidelidade
    let fidelidade = await this.consultarPontos(clienteId, barbeariaId);

    if (!fidelidade) {
      // Criar novo registro de fidelidade
      fidelidade = await this.prisma.fidelidade.create({
        data: {
          clienteId,
          barbeariaId,
          pontos: pontosAdicionar,
          nivel: this.calcularNivel(pontosAdicionar),
        },
        include: {
          cliente: {
            select: {
              nome: true,
              telefone: true,
            },
          },
        },
      });
    } else {
      // Atualizar pontos existentes
      const novosPontos = fidelidade.pontos + pontosAdicionar;

      fidelidade = await this.prisma.fidelidade.update({
        where: { id: fidelidade.id },
        data: {
          pontos: novosPontos,
          nivel: this.calcularNivel(novosPontos),
        },
        include: {
          cliente: {
            select: {
              nome: true,
              telefone: true,
            },
          },
        },
      });
    }

    console.log(`[FIDELIDADE_MANUAL] Cliente ${clienteId} recebeu ${pontosAdicionar} pontos manualmente. Motivo: ${motivo || 'Não informado'}`);

    return fidelidade;
  }

  /**
   * 📈 Calcular Nível de Fidelidade
   */
  private calcularNivel(pontos: number): string {
    if (pontos >= 1000) return 'DIAMANTE';
    if (pontos >= 500) return 'OURO';
    if (pontos >= 200) return 'PRATA';
    if (pontos >= 50) return 'BRONZE';
    return 'INICIANTE';
  }

  /**
   * 🏆 Buscar Top Clientes por Fidelidade
   */
  async topClientesFidelidade(barbeariaId: string, limite: number = 10) {
    return this.prisma.fidelidade.findMany({
      where: {
        barbeariaId,
      },
      include: {
        cliente: {
          select: {
            nome: true,
            telefone: true,
          },
        },
      },
      orderBy: [
        { pontos: 'desc' },
      ],
      take: limite,
    });
  }

  /**
   * 📊 Relatório de Fidelidade
   */
  async relatorioFidelidade(barbeariaId: string) {
    const [totalClientes, clientesPorNivel, pontosTotais] = await Promise.all([
      // Total de clientes no programa
      this.prisma.fidelidade.count({ 
        where: { barbeariaId } 
      }),

      // Clientes por nível
      this.prisma.fidelidade.groupBy({
        by: ['nivel'],
        where: {
          barbeariaId,
        },
        _count: {
          nivel: true,
        },
      }),

      // Total de pontos em circulação
      this.prisma.fidelidade.aggregate({
        where: {
          barbeariaId,
        },
        _sum: {
          pontos: true,
        },
      }),
    ]);

    return {
      totalClientes,
      clientesPorNivel: clientesPorNivel.reduce((acc, item) => {
        acc[item.nivel] = item._count.nivel;
        return acc;
      }, {} as Record<string, number>),
      pontosTotaisCirculacao: pontosTotais._sum.pontos || 0,
    };
  }
}
