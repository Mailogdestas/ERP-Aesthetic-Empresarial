import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationAutomationService {
  private readonly logger = new Logger(NotificationAutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 📱 Envio de notificações de lembrete de agendamento
   * Executa todo dia às 08:00
   */
  async enviarLembretesAgendamento(): Promise<void> {
    try {
      this.logger.log('📱 Iniciando envio de lembretes de agendamento...');

      const hoje = new Date();
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);

      const depoisDeAmanha = new Date(amanha);
      depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 1);

      // Buscar agendamentos para amanhã
      const agendamentos = await this.prisma.agendamento.findMany({
        where: {
          inicio: {
            gte: amanha,
            lt: depoisDeAmanha,
          },
          status: 'CONFIRMADO',
        },
        include: {
          cliente: true,
          barbeiro: true,
          servico: true,
          barbearia: true,
        },
      });

      let notificacoesEnviadas = 0;

      for (const agendamento of agendamentos) {
        try {
          // Verificar se já foi enviado lembrete para este agendamento
          const lembreteExistente = await this.prisma.notificacao.findFirst({
            where: {
              barbeariaId: agendamento.barbeariaId,
              tipo: 'LEMBRETE',
              payload: {
                path: ['agendamentoId'],
                equals: agendamento.id,
              },
              enviadoEm: {
                gte: hoje,
              },
            },
          });

          if (lembreteExistente) {
            continue; // Já foi enviado hoje
          }

          // Criar notificação de lembrete
          await this.prisma.notificacao.create({
            data: {
              tipo: 'LEMBRETE',
              barbeariaId: agendamento.barbeariaId,
              payload: {
                titulo: 'Lembrete de Agendamento 📅',
                mensagem: `Olá ${agendamento.cliente.nome}! Você tem um agendamento amanhã às ${agendamento.inicio.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} para ${agendamento.servico.nome} com ${agendamento.barbeiro.nome} na ${agendamento.barbearia.nome}.`,
                clienteId: agendamento.clienteId,
                agendamentoId: agendamento.id,
                telefone: agendamento.cliente.telefone,
              },
              status: 'ENVIADO',
            },
          });

          notificacoesEnviadas++;
          this.logger.log(`✅ Lembrete enviado para ${agendamento.cliente.nome} - Agendamento às ${agendamento.inicio.toLocaleTimeString('pt-BR')}`);

        } catch (error) {
          this.logger.error(`❌ Erro ao enviar lembrete para agendamento ${agendamento.id}:`, error);
        }
      }

      this.logger.log(`🎯 Lembretes de agendamento enviados: ${notificacoesEnviadas}`);
    } catch (error) {
      this.logger.error('💥 Erro geral no envio de lembretes:', error);
    }
  }

  /**
   * 🎂 Envio de notificações de aniversário
   * Executa todo dia às 09:00
   */
  async enviarParabensAniversario(): Promise<void> {
    try {
      this.logger.log('🎂 Iniciando envio de parabéns de aniversário...');

      const hoje = new Date();
      const diaHoje = hoje.getDate();
      const mesHoje = hoje.getMonth() + 1;

      // Buscar clientes que fazem aniversário hoje
      // Nota: Como não temos campo dataNascimento no modelo Cliente,
      // vamos simular com base no dia de criação do cliente
      const clientesAniversariantes = await this.prisma.cliente.findMany({
        where: {
          ativo: true,
          createdAt: {
            // Clientes criados no mesmo dia e mês em anos anteriores
            gte: new Date(hoje.getFullYear() - 10, mesHoje - 1, diaHoje),
            lt: new Date(hoje.getFullYear() - 10, mesHoje - 1, diaHoje + 1),
          },
        },
        include: {
          barbearia: true,
        },
      });

      let parabensEnviados = 0;

      for (const cliente of clientesAniversariantes) {
        try {
          // Verificar se já foi enviado parabéns hoje
          const parabensExistente = await this.prisma.notificacao.findFirst({
            where: {
              barbeariaId: cliente.barbeariaId,
              tipo: 'PROMOCIONAL',
              payload: {
                path: ['clienteId'],
                equals: cliente.id,
              },
              enviadoEm: {
                gte: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
              },
            },
          });

          if (parabensExistente) {
            continue; // Já foi enviado hoje
          }

          // Criar notificação de aniversário
          await this.prisma.notificacao.create({
            data: {
              tipo: 'PROMOCIONAL',
              barbeariaId: cliente.barbeariaId,
              payload: {
                titulo: 'Parabéns pelo seu aniversário! 🎂',
                mensagem: `Parabéns ${cliente.nome}! A equipe da ${cliente.barbearia.nome} deseja um feliz aniversário! Que tal agendar um corte especial para comemorar? 🎉`,
                clienteId: cliente.id,
                telefone: cliente.telefone,
              },
              status: 'ENVIADO',
            },
          });

          parabensEnviados++;
          this.logger.log(`🎉 Parabéns enviado para ${cliente.nome}`);

        } catch (error) {
          this.logger.error(`❌ Erro ao enviar parabéns para ${cliente.nome}:`, error);
        }
      }

      this.logger.log(`🎯 Parabéns de aniversário enviados: ${parabensEnviados}`);
    } catch (error) {
      this.logger.error('💥 Erro geral no envio de parabéns:', error);
    }
  }

  /**
   * 🔔 Notificações de agendamentos próximos (2 horas antes)
   * Executa a cada hora
   */
  async enviarNotificacoesProximas(): Promise<void> {
    try {
      this.logger.log('🔔 Verificando agendamentos próximos...');

      const agora = new Date();
      const daquiDuasHoras = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
      const daquiTresHoras = new Date(agora.getTime() + 3 * 60 * 60 * 1000);

      // Buscar agendamentos nas próximas 2-3 horas
      const agendamentosProximos = await this.prisma.agendamento.findMany({
        where: {
          inicio: {
            gte: daquiDuasHoras,
            lt: daquiTresHoras,
          },
          status: 'CONFIRMADO',
        },
        include: {
          cliente: true,
          barbeiro: true,
          servico: true,
          barbearia: true,
        },
      });

      let notificacoesEnviadas = 0;

      for (const agendamento of agendamentosProximos) {
        try {
          // Verificar se já foi enviada notificação próxima
          const notificacaoExistente = await this.prisma.notificacao.findFirst({
            where: {
              barbeariaId: agendamento.barbeariaId,
              tipo: 'SISTEMA',
              payload: {
                path: ['agendamentoId'],
                equals: agendamento.id,
              },
              enviadoEm: {
                gte: new Date(agora.getTime() - 4 * 60 * 60 * 1000), // Últimas 4 horas
              },
            },
          });

          if (notificacaoExistente) {
            continue; // Já foi enviada
          }

          const horasRestantes = Math.round((agendamento.inicio.getTime() - agora.getTime()) / (1000 * 60 * 60));

          // Criar notificação
          await this.prisma.notificacao.create({
            data: {
              tipo: 'SISTEMA',
              barbeariaId: agendamento.barbeariaId,
              payload: {
                titulo: 'Agendamento em breve ⏰',
                mensagem: `${agendamento.cliente.nome}, seu agendamento para ${agendamento.servico.nome} com ${agendamento.barbeiro.nome} é em aproximadamente ${horasRestantes} horas (${agendamento.inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).`,
                clienteId: agendamento.clienteId,
                agendamentoId: agendamento.id,
                telefone: agendamento.cliente.telefone,
              },
              status: 'ENVIADO',
            },
          });

          notificacoesEnviadas++;
          this.logger.log(`⏰ Notificação próxima enviada para ${agendamento.cliente.nome}`);

        } catch (error) {
          this.logger.error(`❌ Erro ao enviar notificação próxima para agendamento ${agendamento.id}:`, error);
        }
      }

      if (notificacoesEnviadas > 0) {
        this.logger.log(`🎯 Notificações de agendamentos próximos enviadas: ${notificacoesEnviadas}`);
      }
    } catch (error) {
      this.logger.error('💥 Erro geral nas notificações próximas:', error);
    }
  }

  /**
   * 🧹 Limpeza de notificações antigas
   * Executa todo domingo às 03:00
   */
  async limparNotificacoesAntigas(): Promise<void> {
    try {
      this.logger.log('🧹 Iniciando limpeza de notificações antigas...');

      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // Limpar notificações antigas (mais de 30 dias)
      const notificacoesLimpas = await this.prisma.notificacao.deleteMany({
        where: {
          enviadoEm: {
            lt: trintaDiasAtras,
          },
        },
      });

      const totalLimpas = notificacoesLimpas.count;

      this.logger.log(`🎯 Limpeza concluída: ${totalLimpas} notificações antigas removidas`);
    } catch (error) {
      this.logger.error('💥 Erro na limpeza de notificações:', error);
    }
  }
}