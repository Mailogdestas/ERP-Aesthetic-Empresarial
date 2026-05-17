import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsAutomationService {
  private readonly logger = new Logger(ReportsAutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 📊 Geração de relatórios diários
   * Executa todo dia às 00:30
   */
  async gerarRelatoriosDiarios(): Promise<void> {
    try {
      this.logger.log('📊 Iniciando geração de relatórios diários...');

      const barbearias = await this.prisma.barbearia.findMany({
        where: { ativo: true },
      });

      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      ontem.setHours(0, 0, 0, 0);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      for (const barbearia of barbearias) {
        try {
          await this.gerarRelatorioDiario(barbearia.id, ontem, hoje);
          this.logger.log(`✅ Relatório diário gerado para ${barbearia.nome}`);
        } catch (error) {
          this.logger.error(`❌ Erro ao gerar relatório para ${barbearia.nome}:`, error);
        }
      }

      this.logger.log('🎯 Geração de relatórios diários concluída');
    } catch (error) {
      this.logger.error('💥 Erro geral na geração de relatórios diários:', error);
    }
  }

  /**
   * 📈 Geração de relatórios semanais
   * Executa toda segunda-feira às 01:00
   */
  async gerarRelatoriosSemanais(): Promise<void> {
    try {
      this.logger.log('📈 Iniciando geração de relatórios semanais...');

      const barbearias = await this.prisma.barbearia.findMany({
        where: { ativo: true },
      });

      // Semana passada (segunda a domingo)
      const hoje = new Date();
      const diasParaSegunda = (hoje.getDay() + 6) % 7; // Dias até a última segunda
      const inicioSemanaPassada = new Date(hoje);
      inicioSemanaPassada.setDate(hoje.getDate() - diasParaSegunda - 7);
      inicioSemanaPassada.setHours(0, 0, 0, 0);

      const fimSemanaPassada = new Date(inicioSemanaPassada);
      fimSemanaPassada.setDate(inicioSemanaPassada.getDate() + 7);

      for (const barbearia of barbearias) {
        try {
          await this.gerarRelatorioSemanal(barbearia.id, inicioSemanaPassada, fimSemanaPassada);
          this.logger.log(`✅ Relatório semanal gerado para ${barbearia.nome}`);
        } catch (error) {
          this.logger.error(`❌ Erro ao gerar relatório semanal para ${barbearia.nome}:`, error);
        }
      }

      this.logger.log('🎯 Geração de relatórios semanais concluída');
    } catch (error) {
      this.logger.error('💥 Erro geral na geração de relatórios semanais:', error);
    }
  }

  /**
   * 📅 Geração de relatórios mensais
   * Executa no primeiro dia de cada mês às 02:00
   */
  async gerarRelatoriosMensais(): Promise<void> {
    try {
      this.logger.log('📅 Iniciando geração de relatórios mensais...');

      const barbearias = await this.prisma.barbearia.findMany({
        where: { ativo: true },
      });

      // Mês passado
      const hoje = new Date();
      const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      fimMesPassado.setHours(23, 59, 59, 999);

      for (const barbearia of barbearias) {
        try {
          await this.gerarRelatorioMensal(barbearia.id, inicioMesPassado, fimMesPassado);
          this.logger.log(`✅ Relatório mensal gerado para ${barbearia.nome}`);
        } catch (error) {
          this.logger.error(`❌ Erro ao gerar relatório mensal para ${barbearia.nome}:`, error);
        }
      }

      this.logger.log('🎯 Geração de relatórios mensais concluída');
    } catch (error) {
      this.logger.error('💥 Erro geral na geração de relatórios mensais:', error);
    }
  }

  private async gerarRelatorioDiario(barbeariaId: string, inicio: Date, fim: Date): Promise<void> {
    // Vendas do dia
    const vendas = await this.prisma.venda.findMany({
      where: {
        barbeariaId,
        createdAt: { gte: inicio, lt: fim },
        status: 'FINALIZADA',
      },
      include: {
        itens: true,
        pagamentos: true,
      },
    });

    const totalVendas = vendas.reduce((sum, v) => sum + v.valorTotal, 0);
    const quantidadeVendas = vendas.length;

    // Agendamentos do dia
    const agendamentos = await this.prisma.agendamento.count({
      where: {
        barbeariaId,
        createdAt: { gte: inicio, lt: fim },
      },
    });

    // Novos clientes
    const novosClientes = await this.prisma.cliente.count({
      where: {
        barbeariaId,
        createdAt: { gte: inicio, lt: fim },
      },
    });

    // Comissões pagas
    const comissoes = await this.prisma.comissao.findMany({
      where: {
        barbeariaId,
        calculadoEm: { gte: inicio, lt: fim },
      },
    });

    const totalComissoes = comissoes.reduce((sum, c) => sum + c.valor, 0);

    // Produtos mais vendidos
    const produtosMaisVendidos = await this.prisma.itemVenda.groupBy({
      by: ['produtoId'],
      where: {
        venda: {
          barbeariaId,
          createdAt: { gte: inicio, lt: fim },
          status: 'FINALIZADA',
        },
        produtoId: { not: null },
      },
      _sum: { quantidade: true },
      _count: true,
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 5,
    });

    // Serviços mais realizados
    const servicosMaisRealizados = await this.prisma.itemVenda.groupBy({
      by: ['servicoId'],
      where: {
        venda: {
          barbeariaId,
          createdAt: { gte: inicio, lt: fim },
          status: 'FINALIZADA',
        },
        servicoId: { not: null },
      },
      _sum: { quantidade: true },
      _count: true,
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 5,
    });

    this.logger.log(`📊 Relatório diário - Vendas: ${quantidadeVendas} (R$ ${totalVendas.toFixed(2)}), Agendamentos: ${agendamentos}, Novos clientes: ${novosClientes}, Comissões: R$ ${totalComissoes.toFixed(2)}`);
  }

  private async gerarRelatorioSemanal(barbeariaId: string, inicio: Date, fim: Date): Promise<void> {
    // Métricas da semana
    const vendas = await this.prisma.venda.findMany({
      where: {
        barbeariaId,
        createdAt: { gte: inicio, lt: fim },
        status: 'FINALIZADA',
      },
    });

    const totalVendas = vendas.reduce((sum, v) => sum + v.valorTotal, 0);
    const mediaVendasDiarias = totalVendas / 7;

    // Comparação com semana anterior
    const inicioSemanaAnterior = new Date(inicio);
    inicioSemanaAnterior.setDate(inicio.getDate() - 7);
    const fimSemanaAnterior = new Date(inicio);

    const vendasSemanaAnterior = await this.prisma.venda.findMany({
      where: {
        barbeariaId,
        createdAt: { gte: inicioSemanaAnterior, lt: fimSemanaAnterior },
        status: 'FINALIZADA',
      },
    });

    const totalSemanaAnterior = vendasSemanaAnterior.reduce((sum, v) => sum + v.valorTotal, 0);
    const crescimento = totalSemanaAnterior > 0 ? ((totalVendas - totalSemanaAnterior) / totalSemanaAnterior) * 100 : 0;

    // Barbeiros mais produtivos
    const barbeirosRanking = await this.prisma.venda.groupBy({
      by: ['barbeiroId'],
      where: {
        barbeariaId,
        createdAt: { gte: inicio, lt: fim },
        status: 'FINALIZADA',
        barbeiroId: { not: null },
      },
      _sum: { valorTotal: true },
      _count: true,
      orderBy: { _sum: { valorTotal: 'desc' } },
      take: 10,
    });

    this.logger.log(`📈 Relatório semanal - Total: R$ ${totalVendas.toFixed(2)}, Média diária: R$ ${mediaVendasDiarias.toFixed(2)}, Crescimento: ${crescimento.toFixed(1)}%`);
  }

  private async gerarRelatorioMensal(barbeariaId: string, inicio: Date, fim: Date): Promise<void> {
    // Métricas do mês
    const vendas = await this.prisma.venda.findMany({
      where: {
        barbeariaId,
        createdAt: { gte: inicio, lte: fim },
        status: 'FINALIZADA',
      },
      include: {
        itens: true,
        pagamentos: true,
      },
    });

    const totalVendas = vendas.reduce((sum, v) => sum + v.valorTotal, 0);
    const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;

    // Análise de crescimento mensal
    const inicioMesAnterior = new Date(inicio);
    inicioMesAnterior.setMonth(inicio.getMonth() - 1);
    const fimMesAnterior = new Date(fim);
    fimMesAnterior.setMonth(fim.getMonth() - 1);

    const vendasMesAnterior = await this.prisma.venda.findMany({
      where: {
        barbeariaId,
        createdAt: { gte: inicioMesAnterior, lte: fimMesAnterior },
        status: 'FINALIZADA',
      },
    });

    const totalMesAnterior = vendasMesAnterior.reduce((sum, v) => sum + v.valorTotal, 0);
    const crescimentoMensal = totalMesAnterior > 0 ? ((totalVendas - totalMesAnterior) / totalMesAnterior) * 100 : 0;

    // Análise de retenção de clientes
    const clientesAtivos = await this.prisma.cliente.count({
      where: {
        barbeariaId,
        vendas: {
          some: {
            createdAt: { gte: inicio, lte: fim },
            status: 'FINALIZADA',
          },
        },
      },
    });

    const clientesRecorrentes = await this.prisma.cliente.count({
      where: {
        barbeariaId,
        vendas: {
          some: {
            createdAt: { gte: inicio, lte: fim },
            status: 'FINALIZADA',
          },
        },
        AND: {
          vendas: {
            some: {
              createdAt: { lt: inicio },
              status: 'FINALIZADA',
            },
          },
        },
      },
    });

    const taxaRetencao = clientesAtivos > 0 ? (clientesRecorrentes / clientesAtivos) * 100 : 0;

    // Análise de produtos e serviços (simplificada)
    const itensVendidos = await this.prisma.itemVenda.findMany({
      where: {
        venda: {
          barbeariaId,
          createdAt: { gte: inicio, lte: fim },
          status: 'FINALIZADA',
        },
        servicoId: { not: null },
      },
      include: {
        servico: true
      },
      take: 100
    });

    this.logger.log(`📅 Relatório mensal - Total: R$ ${totalVendas.toFixed(2)}, Ticket médio: R$ ${ticketMedio.toFixed(2)}, Crescimento: ${crescimentoMensal.toFixed(1)}%, Retenção: ${taxaRetencao.toFixed(1)}%`);
  }

  /**
   * 🧹 Limpeza de relatórios antigos
   * Executa no primeiro domingo de cada mês às 04:00
   */
  async limparRelatoriosAntigos(): Promise<void> {
    try {
      this.logger.log('🧹 Iniciando limpeza de relatórios antigos...');

      // Manter apenas relatórios dos últimos 12 meses
      const umAnoAtras = new Date();
      umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

      // Limpar fechamentos diários antigos (manter apenas 1 ano)
      const fechamentosLimpos = await this.prisma.fechamentoDiario.deleteMany({
        where: {
          data: {
            lt: umAnoAtras,
          },
        },
      });

      // Limpar logs de integração antigos (manter apenas 3 meses)
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

      const logsLimpos = await this.prisma.logIntegracao.deleteMany({
        where: {
          criadoEm: {
            lt: tresMesesAtras,
          },
        },
      });

      this.logger.log(`🎯 Limpeza concluída: ${fechamentosLimpos.count} fechamentos diários e ${logsLimpos.count} logs removidos`);
    } catch (error) {
      this.logger.error('💥 Erro na limpeza de relatórios antigos:', error);
    }
  }
}