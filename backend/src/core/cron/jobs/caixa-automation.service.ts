import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CaixaAutomationService {
  private readonly logger = new Logger(CaixaAutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 💰 Fechamento automático de caixa diário
   * Executa todo dia às 23:59
   */
  async fecharCaixaAutomatico(): Promise<void> {
    try {
      this.logger.log('🕛 Iniciando fechamento automático de caixa...');

      // Buscar todas as barbearias ativas
      const barbearias = await this.prisma.barbearia.findMany({
        where: { ativo: true },
        include: { caixa: true }
      });

      let caixasFechados = 0;

      for (const barbearia of barbearias) {
        try {
          // Verificar se há caixa aberto
          const caixaAberto = await this.prisma.caixaSessao.findFirst({
            where: {
              barbeariaId: barbearia.id,
              closedAt: null,
            },
            include: {
              movimentos: true,
            },
          });

          if (!caixaAberto) {
            this.logger.log(`⚠️ Nenhum caixa aberto para ${barbearia.nome}`);
            continue;
          }

          // Calcular totais do dia
          const totalEntradas = caixaAberto.movimentos
            .filter(m => m.tipo === 'ENTRADA')
            .reduce((sum, m) => sum + m.valor.toNumber(), 0);

          const totalSaidas = caixaAberto.movimentos
            .filter(m => m.tipo === 'SAIDA')
            .reduce((sum, m) => sum + m.valor.toNumber(), 0);

          const saldoFinal = caixaAberto.valorAbertura.toNumber() + totalEntradas - totalSaidas;

          // Fechar caixa em transação
          await this.prisma.$transaction(async (tx) => {
            // Atualizar sessão de caixa
            await tx.caixaSessao.update({
              where: { id: caixaAberto.id },
              data: {
                closedAt: new Date(),
                valorFechamento: saldoFinal,
                diferenca: 0, // Assumindo fechamento automático sem diferença
              },
            });

            // Criar fechamento diário
            await tx.fechamentoDiario.create({
              data: {
                data: new Date(),
                barbeariaId: barbearia.id,
                saldoInicial: caixaAberto.valorAbertura,
                saldoFinal: saldoFinal,
                totalVendas: totalEntradas,
                totalDinheiro: totalEntradas, // Simplificado por enquanto
                totalCartao: 0,
                totalPix: 0,
                totalDespesas: totalSaidas,
                fechadoPorId: caixaAberto.openedByUserId, // Usando o usuário que abriu
              },
            });

            // Atualizar saldo do caixa principal
            if (barbearia.caixa) {
              await tx.caixa.update({
                where: { id: barbearia.caixa.id },
                data: {
                  saldo: parseFloat(saldoFinal.toString()),
                },
              });
            }
          });

          caixasFechados++;
          this.logger.log(`✅ Caixa fechado automaticamente para ${barbearia.nome} - Saldo final: R$ ${saldoFinal.toFixed(2)}`);

        } catch (error) {
          this.logger.error(`❌ Erro ao fechar caixa para ${barbearia.nome}:`, error);
        }
      }

      this.logger.log(`🎯 Fechamento automático concluído: ${caixasFechados} caixas fechados`);
    } catch (error) {
      this.logger.error('💥 Erro geral no fechamento automático de caixa:', error);
    }
  }

  /**
   * 🔄 Abertura automática de caixa diário
   * Executa todo dia às 06:00
   */
  async abrirCaixaAutomatico(): Promise<void> {
    try {
      this.logger.log('🌅 Iniciando abertura automática de caixa...');

      const barbearias = await this.prisma.barbearia.findMany({
        where: { ativo: true },
        include: {
          caixa: true,
          barbeiros: {
            take: 1, // Pegar o primeiro barbeiro como responsável
          }
        }
      });

      let caixasAbertos = 0;

      for (const barbearia of barbearias) {
        try {
          // Verificar se já existe caixa aberto hoje
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          const caixaJaAberto = await this.prisma.caixaSessao.findFirst({
            where: {
              barbeariaId: barbearia.id,
              openedAt: {
                gte: hoje,
              },
              closedAt: null,
            },
          });

          if (caixaJaAberto) {
            this.logger.log(`⚠️ Caixa já aberto hoje para ${barbearia.nome}`);
            continue;
          }

          // Buscar último fechamento para saldo inicial
          const ultimoFechamento = await this.prisma.fechamentoDiario.findFirst({
            where: { barbeariaId: barbearia.id },
            orderBy: { data: 'desc' },
          });

          const saldoInicial = ultimoFechamento?.saldoFinal || barbearia.caixa?.saldo || 0;

          // Criar nova sessão de caixa
          await this.prisma.caixaSessao.create({
            data: {
              barbeariaId: barbearia.id,
              barbeiroId: barbearia.barbeiros[0]?.id || 'system-default', // Primeiro barbeiro ativo ou padrão
              openedByUserId: 'system-cron', // ID do sistema para abertura automática
              valorAbertura: saldoInicial,
            },
          });

          caixasAbertos++;
          this.logger.log(`✅ Caixa aberto automaticamente para ${barbearia.nome} - Saldo inicial: R$ ${saldoInicial.toFixed(2)}`);

        } catch (error) {
          this.logger.error(`❌ Erro ao abrir caixa para ${barbearia.nome}:`, error);
        }
      }

      this.logger.log(`🎯 Abertura automática concluída: ${caixasAbertos} caixas abertos`);
    } catch (error) {
      this.logger.error('💥 Erro geral na abertura automática de caixa:', error);
    }
  }

  /**
   * 📊 Consolidação de dados do caixa
   * Executa todo dia às 01:00
   */
  async consolidarDadosCaixa(): Promise<void> {
    try {
      this.logger.log('📊 Iniciando consolidação de dados do caixa...');

      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      ontem.setHours(0, 0, 0, 0);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const barbearias = await this.prisma.barbearia.findMany({
        where: { ativo: true },
      });

      for (const barbearia of barbearias) {
        try {
          // Buscar movimentos do dia anterior
          const movimentos = await this.prisma.caixaMovimento.findMany({
            where: {
              barbeariaId: barbearia.id,
              createdAt: {
                gte: ontem,
                lt: hoje,
              },
            },
          });

          if (movimentos.length === 0) continue;

          const totalEntradas = movimentos
            .filter(m => m.tipo === 'ENTRADA')
            .reduce((sum, m) => sum + m.valor.toNumber(), 0);

          const totalSaidas = movimentos
            .filter(m => m.tipo === 'SAIDA')
            .reduce((sum, m) => sum + m.valor.toNumber(), 0);

          // Verificar se já existe consolidação para o dia
          const consolidacaoExistente = await this.prisma.fechamentoDiario.findFirst({
            where: {
              barbeariaId: barbearia.id,
              data: {
                gte: ontem,
                lt: hoje,
              },
            },
          });

          if (!consolidacaoExistente) {
            // Criar consolidação se não existir
            await this.prisma.fechamentoDiario.create({
              data: {
                data: ontem,
                barbeariaId: barbearia.id,
                saldoInicial: 0, // Será atualizado se necessário
                saldoFinal: totalEntradas - totalSaidas,
                totalVendas: totalEntradas,
                totalDinheiro: totalEntradas, // Simplificado
                totalCartao: 0,
                totalPix: 0,
                totalDespesas: totalSaidas,
                fechadoPorId: 'system-cron', // Sistema automático
              },
            });

            this.logger.log(`📈 Consolidação criada para ${barbearia.nome} - Entradas: R$ ${totalEntradas.toFixed(2)}, Saídas: R$ ${totalSaidas.toFixed(2)}`);
          }

        } catch (error) {
          this.logger.error(`❌ Erro na consolidação para ${barbearia.nome}:`, error);
        }
      }

      this.logger.log('🎯 Consolidação de dados concluída');
    } catch (error) {
      this.logger.error('💥 Erro geral na consolidação de dados:', error);
    }
  }
}