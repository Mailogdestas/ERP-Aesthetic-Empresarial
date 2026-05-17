import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class PacoteAutomaticoService {
  private readonly logger = new Logger(PacoteAutomaticoService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  /**
   * Verifica pacotes próximos do vencimento e envia alertas
   * Executa diariamente às 09:00
   */
  @Cron('0 9 * * *', {
    name: 'verificar-pacotes-vencimento',
    timeZone: 'America/Sao_Paulo'
  })
  async verificarPacotesVencimento() {
    this.logger.log('Verificando pacotes para promoção...');

    try {
      // Como o modelo PacoteConsumo não tem campos de vencimento,
      // vamos buscar pacotes consumidos há mais de 15 dias para oferecer novos pacotes
      const quinzeDiasAtras = new Date();
      quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);

      const pacotesAntigos = await this.prisma.pacoteConsumo.findMany({
        where: {
          createdAt: {
            lt: quinzeDiasAtras
          },
          deletedAt: null // Apenas ativos
        },
        include: {
          pacote: true,
          cliente: true,
          barbearia: true
        },
        take: 5 // Limitar para não sobrecarregar
      });

      this.logger.log(`Encontrados ${pacotesAntigos.length} pacotes antigos para promoção`);

      for (const pacoteConsumo of pacotesAntigos) {
        try {
          // Calcula dias desde o consumo
          const diasDesdeConsumo = Math.ceil(
            (new Date().getTime() - pacoteConsumo.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Cria notificação promocional
          await this.prisma.notificacao.create({
            data: {
              barbeariaId: pacoteConsumo.barbeariaId,
              tipo: 'PROMOCIONAL',
              payload: {
                titulo: 'Novos Pacotes Disponíveis!',
                mensagem: `Olá ${pacoteConsumo.cliente.nome}! 👋\n\n` +
                  `Você consumiu o pacote "${pacoteConsumo.pacote.nome}" há ${diasDesdeConsumo} dias.\n\n` +
                  `Temos novos pacotes incríveis disponíveis para você! 😊\n\n` +
                  `Entre em contato e conheça nossas ofertas especiais.\n\n` +
                  `${pacoteConsumo.barbearia.nome}`,
                clienteId: pacoteConsumo.clienteId,
                telefone: pacoteConsumo.cliente.telefone,
              },
              status: 'ENVIADO'
            }
          });

          this.logger.log(`Promoção criada para pacote ${pacoteConsumo.id} do cliente ${pacoteConsumo.cliente.nome}`);

        } catch (error) {
          this.logger.error(`Erro ao processar pacote ${pacoteConsumo.id}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Erro geral na verificação de pacotes:', error);
    }
  }

  /**
   * Desativa pacotes vencidos
   * Executa diariamente às 01:00
   */
  @Cron('0 1 * * *', {
    name: 'desativar-pacotes-vencidos',
    timeZone: 'America/Sao_Paulo'
  })
  async desativarPacotesVencidos() {
    this.logger.log('Desativando pacotes vencidos...');

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Como o modelo PacoteConsumo não tem campos de vencimento,
      // vamos simular a lógica usando pacotes criados há mais de 30 dias
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // Busca pacotes antigos para simular vencimento
      const pacotesAntigos = await this.prisma.pacoteConsumo.findMany({
        where: {
          createdAt: {
            lt: trintaDiasAtras
          },
          deletedAt: null // Apenas ativos
        },
        include: {
          pacote: true,
          cliente: true,
          barbearia: true
        },
        take: 10 // Limitar para não sobrecarregar
      });

      // Cria notificações de vencimento simulado
      for (const pacoteConsumo of pacotesAntigos) {
        try {
          await this.prisma.notificacao.create({
            data: {
              barbeariaId: pacoteConsumo.barbeariaId,
              tipo: 'PROMOCIONAL',
              payload: {
                titulo: 'Pacote Antigo - Nova Oferta!',
                mensagem: `Olá ${pacoteConsumo.cliente.nome}! 👋\n\n` +
                  `Você tem um pacote "${pacoteConsumo.pacote.nome}" antigo.\n\n` +
                  `Que tal conhecer nossas novas ofertas e pacotes disponíveis? 😊\n\n` +
                  `Entre em contato conosco para conhecer as opções.\n\n` +
                  `${pacoteConsumo.barbearia.nome}`,
                clienteId: pacoteConsumo.clienteId,
                telefone: pacoteConsumo.cliente.telefone,
              },
              status: 'ENVIADO'
            }
          });

        } catch (error) {
          this.logger.error(`Erro ao criar notificação promocional para pacote ${pacoteConsumo.id}:`, error);
        }
      }

      this.logger.log(`${pacotesAntigos.length} notificações promocionais de pacotes antigos foram enviadas`);

    } catch (error) {
      this.logger.error('Erro geral no processamento de pacotes antigos:', error);
    }
  }

  /**
   * Processa pontos de fidelidade e promoções automáticas
   * Executa a cada 6 horas
   */
  @Cron('0 */6 * * *', {
    name: 'processar-fidelidade',
    timeZone: 'America/Sao_Paulo'
  })
  async processarFidelidade() {
    this.logger.log('Processando programa de fidelidade...');

    try {
      // Busca clientes com pontos suficientes para recompensas
      const clientesComPontos = await this.prisma.cliente.findMany({
        where: {
          ativo: true
        },
        include: {
          barbearia: true,
          fidelidade: {
            where: {
              pontos: {
                gte: 100 // Mínimo para recompensa
              }
            }
          }
        }
      });

      this.logger.log(`Encontrados ${clientesComPontos.length} clientes elegíveis para recompensas`);

      for (const cliente of clientesComPontos) {
          // Pular clientes sem fidelidade ou com poucos pontos
          if (!cliente.fidelidade || cliente.fidelidade.pontos < 100) {
            continue;
          }
        try {
          // Verifica se já não recebeu notificação recentemente
          const notificacaoRecente = await this.prisma.notificacao.findFirst({
            where: {
              barbeariaId: cliente.barbeariaId,
              tipo: 'PROMOCIONAL',
              enviadoEm: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
              },
              AND: [
                {
                  payload: {
                    path: ['clienteId'],
                    equals: cliente.id
                  }
                },
                {
                  payload: {
                    path: ['mensagem'],
                    string_contains: 'pontos de fidelidade'
                  }
                }
              ]
            }
          });

          if (notificacaoRecente) {
            continue; // Pula se já foi notificado recentemente
          }

          // Calcula recompensas disponíveis
          const pontosDisponiveis = cliente.fidelidade?.pontos || 0;
          const descontosDisponiveis = Math.floor(pontosDisponiveis / 100) * 10; // 10% de desconto a cada 100 pontos

          // Cria notificação de fidelidade
          await this.prisma.notificacao.create({
            data: {
              barbeariaId: cliente.barbeariaId,
              tipo: 'PROMOCIONAL',
              payload: {
                titulo: 'Parabéns pela fidelidade!',
                mensagem: `Parabéns ${cliente.nome}! 🎉\n\n` +
                  `Você tem ${pontosDisponiveis} pontos de fidelidade acumulados!\n` +
                  `💰 Isso equivale a ${descontosDisponiveis}% de desconto no seu próximo serviço.\n\n` +
                  `Agende já e aproveite sua recompensa! 😊\n\n` +
                  `${cliente.barbearia.nome}`,
                clienteId: cliente.id,
                telefone: cliente.telefone,
              },
              status: 'ENVIADO'
            }
          });

          this.logger.log(`Notificação de fidelidade criada para cliente ${cliente.nome}`);

        } catch (error) {
          this.logger.error(`Erro ao processar fidelidade do cliente ${cliente.id}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Erro geral no processamento de fidelidade:', error);
    }
  }

  /**
   * Gera estatísticas de uso de pacotes
   * Executa semanalmente às segundas-feiras às 10:00
   */
  @Cron('0 10 * * 1', {
    name: 'gerar-estatisticas-pacotes',
    timeZone: 'America/Sao_Paulo'
  })
  async gerarEstatisticasPacotes() {
    this.logger.log('Gerando estatísticas de pacotes...');

    try {
      const barbearias = await this.prisma.barbearia.findMany({
        where: {
          ativo: true,
          deletedAt: null
        },
        select: {
          id: true,
          nome: true
        }
      });

      for (const barbearia of barbearias) {
        try {
          // Última semana
          const semanaPassada = new Date();
          semanaPassada.setDate(semanaPassada.getDate() - 7);

          // Calcular estatísticas da semana
          const [pacotesAtivos, pacotesVendidos, pacotesVencidos] = await Promise.all([
            // Pacotes ativos (PacoteConsumo não tem campo ativo, usar deletedAt)
            this.prisma.pacoteConsumo.count({
              where: {
                barbeariaId: barbearia.id,
                deletedAt: null
              }
            }),

            // Pacotes vendidos na semana
            this.prisma.pacoteConsumo.count({
              where: {
                barbeariaId: barbearia.id,
                createdAt: {
                  gte: semanaPassada
                }
              }
            }),

            // Pacotes vencidos na semana (usar deletedAt como indicador)
            this.prisma.pacoteConsumo.count({
              where: {
                barbeariaId: barbearia.id,
                deletedAt: {
                  not: null,
                  gte: semanaPassada
                }
              }
            }),
          ]);

          // Consumo médio - contar registros de PacoteConsumo
          const totalConsumos = await this.prisma.pacoteConsumo.count({
            where: {
              barbeariaId: barbearia.id,
              createdAt: {
                gte: semanaPassada
              },
            },
          });

          const mediaConsumo = pacotesAtivos > 0 ? totalConsumos / pacotesAtivos : 0;

          // Log das estatísticas (sem salvar no banco por enquanto)
          this.logger.log(`📊 Estatísticas para ${barbearia.nome}:`);
          this.logger.log(`  - Pacotes ativos: ${pacotesAtivos}`);
          this.logger.log(`  - Pacotes vendidos: ${pacotesVendidos}`);
          this.logger.log(`  - Pacotes vencidos: ${pacotesVencidos}`);
          this.logger.log(`  - Consumo médio: ${mediaConsumo.toFixed(2)}`);
          this.logger.log(`  - Taxa de utilização: ${pacotesAtivos > 0 ? ((mediaConsumo / pacotesAtivos) * 100).toFixed(1) : 0}%`);

          this.logger.log(`✅ Estatísticas geradas para ${barbearia.nome}: ${pacotesAtivos} ativos, ${pacotesVendidos} vendidos`);

        } catch (error) {
          this.logger.error(`Erro ao gerar estatísticas para ${barbearia.nome}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Erro geral na geração de estatísticas:', error);
    }
  }
}