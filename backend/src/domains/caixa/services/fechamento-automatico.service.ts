import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { FechamentoDiarioService } from './fechamento-diario.service';

@Injectable()
export class FechamentoAutomaticoService {
  private readonly logger = new Logger(FechamentoAutomaticoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fechamentoDiarioService: FechamentoDiarioService
  ) {}

  /**
   * Executa fechamento automático diário às 23:30
   * Processa o fechamento do dia anterior para todas as barbearias ativas
   */
  @Cron('30 23 * * *', {
    name: 'fechamento-diario-automatico',
    timeZone: 'America/Sao_Paulo'
  })
  async processarFechamentosAutomaticos() {
    this.logger.log('Iniciando processamento de fechamentos automáticos...');

    try {
      // Busca todas as barbearias ativas
      const barbearias = await this.prisma.barbearia.findMany({
        where: {
          ativo: true,
          deletedAt: null
        },
        select: {
          id: true,
          nome: true,
          configuracoes: true
        }
      });

      this.logger.log(`Encontradas ${barbearias.length} barbearias ativas`);

      // Data do dia anterior (que será fechado)
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const dataFechamento = ontem.toISOString().split('T')[0];

      const resultados = [];

      for (const barbearia of barbearias) {
        try {
          // Verifica se a barbearia tem fechamento automático habilitado
          const config = barbearia.configuracoes as any;
          if (config?.fechamentoAutomatico === false) {
            this.logger.log(`Barbearia ${barbearia.nome} tem fechamento automático desabilitado`);
            continue;
          }

          // Verifica se já existe fechamento para esta data
          const fechamentoExistente = await this.prisma.fechamentoDiario.findUnique({
            where: {
              barbeariaId_data: {
                barbeariaId: barbearia.id,
                data: new Date(dataFechamento)
              }
            }
          });

          if (fechamentoExistente) {
            this.logger.log(`Fechamento já existe para ${barbearia.nome} em ${dataFechamento}`);
            continue;
          }

          // Busca um usuário admin/gerente da barbearia para ser o "fechador"
          const usuarioFechador = await this.prisma.usuario.findFirst({
            where: {
              barbeariaId: barbearia.id,
              role: { in: ['ADMIN', 'MANAGER'] },
              ativo: true,
              deletedAt: null
            }
          });

          if (!usuarioFechador) {
            this.logger.warn(`Nenhum usuário admin/gerente encontrado para barbearia ${barbearia.nome}`);
            continue;
          }

          // Processa o fechamento
          const fechamento = await this.fechamentoDiarioService.processarFechamentoDiario(
            barbearia.id,
            usuarioFechador.id,
            {
              data: dataFechamento,
              forcarReprocessamento: false
            }
          );

          resultados.push({
            barbeariaId: barbearia.id,
            barbeariaNome: barbearia.nome,
            fechamentoId: fechamento.id,
            status: 'sucesso',
            totalVendas: fechamento.totalVendas,
            saldoFinal: fechamento.saldoFinal
          });

          this.logger.log(`Fechamento processado com sucesso para ${barbearia.nome}`);

        } catch (error) {
          this.logger.error(`Erro ao processar fechamento para ${barbearia.nome}:`, error);
          resultados.push({
            barbeariaId: barbearia.id,
            barbeariaNome: barbearia.nome,
            status: 'erro',
            erro: error.message
          });
        }
      }

      this.logger.log(`Processamento concluído. Sucessos: ${resultados.filter(r => r.status === 'sucesso').length}, Erros: ${resultados.filter(r => r.status === 'erro').length}`);

      // Salva log do processamento
      await this.salvarLogProcessamento(dataFechamento, resultados);

    } catch (error) {
      this.logger.error('Erro geral no processamento de fechamentos automáticos:', error);
    }
  }

  /**
   * Executa fechamento automático para uma barbearia específica
   */
  async processarFechamentoBarbearia(barbeariaId: string, data?: string) {
    const dataFechamento = data || new Date().toISOString().split('T')[0];
    
    this.logger.log(`Processando fechamento manual para barbearia ${barbeariaId} em ${dataFechamento}`);

    try {
      const barbearia = await this.prisma.barbearia.findUnique({
        where: { id: barbeariaId },
        select: { id: true, nome: true }
      });

      if (!barbearia) {
        throw new Error('Barbearia não encontrada');
      }

      // Busca usuário admin/gerente
      const usuarioFechador = await this.prisma.usuario.findFirst({
        where: {
          barbeariaId,
          role: { in: ['ADMIN', 'MANAGER'] },
          ativo: true,
          deletedAt: null
        }
      });

      if (!usuarioFechador) {
        throw new Error('Nenhum usuário admin/gerente encontrado');
      }

      const fechamento = await this.fechamentoDiarioService.processarFechamentoDiario(
        barbeariaId,
        usuarioFechador.id,
        {
          data: dataFechamento,
          forcarReprocessamento: true
        }
      );

      this.logger.log(`Fechamento processado com sucesso para ${barbearia.nome}`);
      return fechamento;

    } catch (error) {
      this.logger.error(`Erro ao processar fechamento para barbearia ${barbeariaId}:`, error);
      throw error;
    }
  }

  /**
   * Salva log do processamento automático
   */
  private async salvarLogProcessamento(data: string, resultados: any[]) {
    try {
      // Aqui você pode implementar uma tabela de logs se necessário
      // Por enquanto, apenas logamos no console
      this.logger.log(`Log do processamento ${data}:`, JSON.stringify(resultados, null, 2));
    } catch (error) {
      this.logger.error('Erro ao salvar log do processamento:', error);
    }
  }

  /**
   * Reprocessa fechamentos com erro
   */
  async reprocessarFechamentosComErro(data: string) {
    this.logger.log(`Reprocessando fechamentos com erro para ${data}`);

    try {
      const barbearias = await this.prisma.barbearia.findMany({
        where: {
          ativo: true,
          deletedAt: null,
          fechamentosDiarios: {
            none: {
              data: new Date(data)
            }
          }
        },
        select: {
          id: true,
          nome: true
        }
      });

      const resultados = [];

      for (const barbearia of barbearias) {
        try {
          const fechamento = await this.processarFechamentoBarbearia(barbearia.id, data);
          resultados.push({
            barbeariaId: barbearia.id,
            barbeariaNome: barbearia.nome,
            status: 'sucesso',
            fechamentoId: fechamento.id
          });
        } catch (error) {
          resultados.push({
            barbeariaId: barbearia.id,
            barbeariaNome: barbearia.nome,
            status: 'erro',
            erro: error.message
          });
        }
      }

      this.logger.log(`Reprocessamento concluído para ${data}:`, resultados);
      return resultados;

    } catch (error) {
      this.logger.error(`Erro no reprocessamento para ${data}:`, error);
      throw error;
    }
  }

  /**
   * Verifica status dos fechamentos de ontem
   */
  async verificarStatusFechamentos() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const dataVerificacao = ontem.toISOString().split('T')[0];

    const barbeariasAtivas = await this.prisma.barbearia.count({
      where: {
        ativo: true,
        deletedAt: null
      }
    });

    const fechamentosProcessados = await this.prisma.fechamentoDiario.count({
      where: {
        data: new Date(dataVerificacao)
      }
    });

    const status = {
      data: dataVerificacao,
      barbeariasAtivas,
      fechamentosProcessados,
      pendentes: barbeariasAtivas - fechamentosProcessados,
      percentualConcluido: Math.round((fechamentosProcessados / barbeariasAtivas) * 100)
    };

    this.logger.log(`Status dos fechamentos de ${dataVerificacao}:`, status);
    return status;
  }
}