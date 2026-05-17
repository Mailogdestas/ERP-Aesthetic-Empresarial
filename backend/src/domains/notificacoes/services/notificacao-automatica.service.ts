import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NotificacaoService } from './notificacao.service';

@Injectable()
export class NotificacaoAutomaticaService {
  private readonly logger = new Logger(NotificacaoAutomaticaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacaoService: NotificacaoService
  ) {}

  /**
   * Envia notificações pendentes a cada 15 minutos
   */
  @Cron('*/15 * * * *', {
    name: 'envio-notificacoes-pendentes',
    timeZone: 'America/Sao_Paulo'
  })
  async enviarNotificacoesPendentes() {
    this.logger.log('Iniciando envio de notificações pendentes...');

    try {
      // Busca notificações pendentes
      const notificacoesPendentes = await this.prisma.notificacao.findMany({
        where: {
          status: 'PENDENTE'
        },
        take: 50 // Processa até 50 por vez
      });

      this.logger.log(`Encontradas ${notificacoesPendentes.length} notificações pendentes`);

      let sucessos = 0;
      let erros = 0;

      for (const notificacao of notificacoesPendentes) {
        try {
          await this.processarNotificacao(notificacao);
          sucessos++;
        } catch (error) {
          this.logger.error(`Erro ao processar notificação ${notificacao.id}:`, error);
          erros++;
          
          // Atualiza status para erro
          await this.prisma.notificacao.update({
            where: { id: notificacao.id },
            data: {
              status: 'ERRO'
            }
          });
        }
      }

      this.logger.log(`Processamento concluído. Sucessos: ${sucessos}, Erros: ${erros}`);

    } catch (error) {
      this.logger.error('Erro geral no envio de notificações:', error);
    }
  }

  /**
   * Processa uma notificação individual
   */
  private async processarNotificacao(notificacao: any) {
    const { tipo, payload } = notificacao;
    const { telefone, mensagem } = payload;

    // Simula envio baseado no tipo
    switch (tipo) {
      case 'SMS':
        await this.enviarSMS(telefone, mensagem);
        break;
      case 'EMAIL':
        await this.enviarEmail(telefone, mensagem);
        break;
      case 'LEMBRETE':
      case 'PROMOCIONAL':
      case 'SISTEMA':
        await this.enviarWhatsApp(telefone, mensagem);
        break;
      case 'PUSH':
        await this.enviarPushNotification(telefone, mensagem);
        break;
      default:
        throw new Error(`Tipo de notificação não suportado: ${tipo}`);
    }

    // Atualiza status para enviado
    await this.prisma.notificacao.update({
      where: { id: notificacao.id },
      data: {
        status: 'ENVIADO',
        enviadoEm: new Date()
      }
    });

    this.logger.log(`Notificação ${notificacao.id} enviada com sucesso`);
  }

  /**
   * Simula envio de SMS
   */
  private async enviarSMS(telefone: string, mensagem: string) {
    // Aqui seria integração com provedor de SMS (Twilio, etc.)
    this.logger.log(`SMS enviado para ${telefone}: ${mensagem.substring(0, 50)}...`);
    
    // Simula delay de envio
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Simula envio de Email
   */
  private async enviarEmail(email: string, conteudo: string) {
    // Aqui seria integração com provedor de email (SendGrid, etc.)
    this.logger.log(`Email enviado para ${email}: ${conteudo.substring(0, 50)}...`);
    
    // Simula delay de envio
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Simula envio de WhatsApp
   */
  private async enviarWhatsApp(telefone: string, mensagem: string) {
    // Aqui seria integração com WhatsApp Business API
    this.logger.log(`WhatsApp enviado para ${telefone}: ${mensagem.substring(0, 50)}...`);
    
    // Simula delay de envio
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Simula envio de Push Notification
   */
  private async enviarPushNotification(deviceToken: string, conteudo: string) {
    // Aqui seria integração com Firebase Cloud Messaging
    this.logger.log(`Push notification enviada para ${deviceToken}: ${conteudo.substring(0, 50)}...`);
    
    // Simula delay de envio
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  /**
   * Cria notificações automáticas para lembretes de agendamento
   * Executa a cada hora
   */
  @Cron('0 * * * *', {
    name: 'criar-lembretes-agendamento',
    timeZone: 'America/Sao_Paulo'
  })
  async criarLembretesAgendamento() {
    this.logger.log('Criando lembretes de agendamento...');

    try {
      // Busca agendamentos para amanhã que ainda não têm lembrete
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);

      const depoisDeAmanha = new Date(amanha);
      depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 1);

      const agendamentos = await this.prisma.agendamento.findMany({
        where: {
          inicio: {
            gte: amanha,
            lt: depoisDeAmanha
          },
          status: 'CONFIRMADO'
        },
        include: {
          cliente: true,
          barbeiro: true,
          servico: true,
          barbearia: true
        }
      });

      this.logger.log(`Encontrados ${agendamentos.length} agendamentos para criar lembretes`);

      for (const agendamento of agendamentos) {
        try {
          const dataFormatada = agendamento.inicio.toLocaleDateString('pt-BR');
          const horaFormatada = agendamento.inicio.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          });

          const mensagem = `Olá ${agendamento.cliente.nome}! 👋\n\n` +
            `Lembrete do seu agendamento na ${agendamento.barbearia.nome}:\n` +
            `📅 Data: ${dataFormatada}\n` +
            `⏰ Horário: ${horaFormatada}\n` +
            `✂️ Serviço: ${agendamento.servico.nome}\n` +
            `👨‍💼 Barbeiro: ${agendamento.barbeiro.nome}\n\n` +
            `Nos vemos em breve! 😊`;

          // Agenda lembrete para 2 horas antes do agendamento
          const agendadaPara = new Date(agendamento.inicio);
          agendadaPara.setHours(agendadaPara.getHours() - 2);

          await this.prisma.notificacao.create({
            data: {
              barbeariaId: agendamento.barbeariaId,
              tipo: 'LEMBRETE',
              payload: {
                titulo: 'Lembrete de Agendamento',
                mensagem: mensagem,
                clienteId: agendamento.clienteId,
                agendamentoId: agendamento.id,
                telefone: agendamento.cliente.telefone,
              },
              status: 'ENVIADO'
            }
          });

          this.logger.log(`Lembrete criado para agendamento ${agendamento.id}`);

        } catch (error) {
          this.logger.error(`Erro ao criar lembrete para agendamento ${agendamento.id}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('Erro geral na criação de lembretes:', error);
    }
  }

  /**
   * Limpa notificações antigas (mais de 30 dias)
   * Executa diariamente às 02:00
   */
  @Cron('0 2 * * *', {
    name: 'limpeza-notificacoes-antigas',
    timeZone: 'America/Sao_Paulo'
  })
  async limparNotificacoes() {
    this.logger.log('Iniciando limpeza de notificações antigas...');

    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const resultado = await this.prisma.notificacao.deleteMany({
        where: {
          enviadoEm: {
            lt: dataLimite
          },
          status: {
            in: ['ENVIADO', 'ERRO']
          }
        }
      });

      this.logger.log(`${resultado.count} notificações antigas removidas`);

    } catch (error) {
      this.logger.error('Erro na limpeza de notificações:', error);
    }
  }
}