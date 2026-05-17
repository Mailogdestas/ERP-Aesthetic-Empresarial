import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { CaixaAutomationService } from './jobs/caixa-automation.service';
import { NotificationAutomationService } from './jobs/notification-automation.service';
import { ReportsAutomationService } from './jobs/reports-automation.service';

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly caixaAutomation: CaixaAutomationService,
    private readonly notificationAutomation: NotificationAutomationService,
    private readonly reportsAutomation: ReportsAutomationService,
  ) {}

  onModuleInit() {
    this.setupCronJobs();
  }

  private setupCronJobs() {
    this.logger.log('🚀 Configurando CRON jobs...');

    // ===== CAIXA =====
    // Fechamento automático de caixa - Todo dia às 23:59
    cron.schedule('59 23 * * *', () => {
      this.caixaAutomation.fecharCaixaAutomatico();
    });

    // Abertura automática de caixa - Todo dia às 07:00
    cron.schedule('0 7 * * 1-6', () => { // Segunda a sábado
      this.caixaAutomation.abrirCaixaAutomatico();
    });

    // Consolidação de dados de caixa - Todo dia às 01:00
    cron.schedule('0 1 * * *', () => {
      this.caixaAutomation.consolidarDadosCaixa();
    });

    // ===== RELATÓRIOS =====
    // Geração de relatórios diários - Todo dia às 00:30
    cron.schedule('30 0 * * *', () => {
      this.reportsAutomation.gerarRelatoriosDiarios();
    });

    // Geração de relatórios semanais - Toda segunda-feira às 01:00
    cron.schedule('0 1 * * 1', () => {
      this.reportsAutomation.gerarRelatoriosSemanais();
    });

    // Geração de relatórios mensais - Primeiro dia do mês às 02:00
    cron.schedule('0 2 1 * *', () => {
      this.reportsAutomation.gerarRelatoriosMensais();
    });

    // Limpeza de relatórios antigos - Primeiro domingo do mês às 04:00
    cron.schedule('0 4 1-7 * 0', () => {
      this.reportsAutomation.limparRelatoriosAntigos();
    });

    // ===== NOTIFICAÇÕES =====
    // Envio de lembretes de agendamento - A cada 30 minutos das 8h às 20h
    cron.schedule('*/30 8-20 * * *', () => {
      this.notificationAutomation.enviarLembretesAgendamento();
    });

    // Envio de parabéns de aniversário - Todo dia às 09:00
    cron.schedule('0 9 * * *', () => {
      this.notificationAutomation.enviarParabensAniversario();
    });

    // Notificações de agendamentos próximos - A cada 2 horas das 8h às 18h
    cron.schedule('0 8-18/2 * * *', () => {
      this.notificationAutomation.enviarNotificacoesProximas();
    });

    // Limpeza de notificações antigas - Todo domingo às 03:00
    cron.schedule('0 3 * * 0', () => {
      this.notificationAutomation.limparNotificacoesAntigas();
    });

    this.logger.log('✅ CRON jobs configurados com sucesso');
    this.logger.log('📋 Jobs ativos:');
    this.logger.log('  💰 Caixa: Fechamento (23:59), Abertura (07:00), Consolidação (01:00)');
    this.logger.log('  📊 Relatórios: Diários (00:30), Semanais (SEG 01:00), Mensais (1º 02:00)');
    this.logger.log('  🔔 Notificações: Lembretes (*/30 8-20h), Aniversários (09:00), Próximos (8-18h/2h)');
    this.logger.log('  🧹 Limpeza: Notificações (DOM 03:00), Relatórios (1º DOM 04:00)');
  }

  /**
   * 🔧 Método para executar job manualmente (para testes)
   */
  async executarJobManual(jobName: string): Promise<void> {
    this.logger.log(`🔧 Executando job manual: ${jobName}`);

    switch (jobName) {
      case 'fechar-caixa':
        await this.caixaAutomation.fecharCaixaAutomatico();
        break;
      case 'abrir-caixa':
        await this.caixaAutomation.abrirCaixaAutomatico();
        break;
      case 'consolidar-caixa':
        await this.caixaAutomation.consolidarDadosCaixa();
        break;
      case 'relatorio-diario':
        await this.reportsAutomation.gerarRelatoriosDiarios();
        break;
      case 'relatorio-semanal':
        await this.reportsAutomation.gerarRelatoriosSemanais();
        break;
      case 'relatorio-mensal':
        await this.reportsAutomation.gerarRelatoriosMensais();
        break;
      case 'lembretes':
        await this.notificationAutomation.enviarLembretesAgendamento();
        break;
      case 'aniversarios':
        await this.notificationAutomation.enviarParabensAniversario();
        break;
      case 'limpar-notificacoes':
        await this.notificationAutomation.limparNotificacoesAntigas();
        break;
      case 'limpar-relatorios':
        await this.reportsAutomation.limparRelatoriosAntigos();
        break;
      default:
        this.logger.warn(`⚠️ Job não encontrado: ${jobName}`);
    }
  }

  /**
   * 📊 Status dos CRON jobs
   */
  getJobsStatus(): any {
    return {
      caixa: {
        fechamento: '23:59 diário',
        abertura: '07:00 seg-sáb',
        consolidacao: '01:00 diário',
      },
      relatorios: {
        diarios: '00:30 diário',
        semanais: '01:00 segunda-feira',
        mensais: '02:00 primeiro dia do mês',
        limpeza: '04:00 primeiro domingo do mês',
      },
      notificacoes: {
        lembretes: '*/30 8-20h',
        aniversarios: '09:00 diário',
        proximos: '8-18h a cada 2h',
        limpeza: '03:00 domingo',
      },
      status: 'ativo',
      ultimaExecucao: new Date().toISOString(),
    };
  }
}