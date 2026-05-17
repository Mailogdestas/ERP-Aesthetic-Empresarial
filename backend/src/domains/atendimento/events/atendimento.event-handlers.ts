import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { HistoricoAtendimentoService } from '../services/historico-atendimento.service';
import { 
  CreateHistoricoAtendimentoDto, 
  StatusAtendimento 
} from '../dto/atendimento.dto';

/**
 * 🎬 AtendimentoEventHandlers - Manipula eventos do domínio ATENDIMENTO
 * 
 * Escuta eventos de outros domínios e executa ações correspondentes:
 * - ATENDIMENTO_CONCLUIDO: Registra histórico de atendimento finalizado
 * - AGENDAMENTO_INICIADO: Registra início do atendimento
 * - AGENDAMENTO_CANCELADO: Marca atendimento como cancelado
 */
@Injectable()
export class AtendimentoEventHandlers {
  private readonly logger = new Logger(AtendimentoEventHandlers.name);
  private readonly processedEvents = new Set<string>(); // Cache simples para idempotência

  constructor(
    private readonly historicoAtendimentoService: HistoricoAtendimentoService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * 🎯 Handler: ATENDIMENTO_CONCLUIDO
   * Disparado quando um agendamento é finalizado no domínio AGENDAMENTO
   */
  @OnEvent('ATENDIMENTO_CONCLUIDO')
  async handleAtendimentoConcluido(event: {
    agendamentoId: string;
    clienteId: string;
    barbeiroId: string;
    servicoIds: string[];
    dataHoraInicio: Date;
    dataHoraFim: Date;
    observacoes?: string;
  }) {
    const eventKey = `ATENDIMENTO_CONCLUIDO:${event.agendamentoId}:AtendimentoEventHandlers`;
    
    // Verificação simples de idempotência
    if (this.processedEvents.has(eventKey)) {
      this.logger.debug(`⏭️ Evento já processado: ${eventKey}`);
      return;
    }

    try {
      // Verificar se já existe histórico para este agendamento
      const historicoExistente = await this.prisma.historicoAtendimento.findFirst({
        where: { agendamentoId: event.agendamentoId }
      });

      if (historicoExistente) {
        // Se já existe, apenas finalizar
        await this.historicoAtendimentoService.finalizarAtendimento(
          event.agendamentoId,
          {
            dataHoraFim: event.dataHoraFim.toISOString(),
            observacoes: event.observacoes
          }
        );

        this.logger.log(`✅ Histórico finalizado para agendamento: ${event.agendamentoId}`);
      } else {
        // Se não existe, criar e finalizar
        const createDto: CreateHistoricoAtendimentoDto = {
          agendamentoId: event.agendamentoId,
          clienteId: event.clienteId,
          barbeiroId: event.barbeiroId,
          servicoIds: event.servicoIds,
          dataHoraInicio: event.dataHoraInicio.toISOString(),
          dataHoraFim: event.dataHoraFim.toISOString(),
          observacoes: event.observacoes
        };

        await this.historicoAtendimentoService.registrarInicioAtendimento(createDto);
        
        this.logger.log(`✅ Histórico criado e finalizado para agendamento: ${event.agendamentoId}`);
      }

      // Marcar como processado
      this.processedEvents.add(eventKey);
      
      // Limpar cache após 1 hora (evitar memory leak)
      setTimeout(() => {
        this.processedEvents.delete(eventKey);
      }, 60 * 60 * 1000);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar ATENDIMENTO_CONCLUIDO: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🎯 Handler: AGENDAMENTO_INICIADO
   * Disparado quando um agendamento é iniciado no domínio AGENDAMENTO
   */
  @OnEvent('AGENDAMENTO_INICIADO')
  async handleAgendamentoIniciado(event: {
    agendamentoId: string;
    clienteId: string;
    barbeiroId: string;
    servicoIds: string[];
    dataHoraInicio: Date;
  }) {
    const eventKey = `AGENDAMENTO_INICIADO:${event.agendamentoId}:AtendimentoEventHandlers`;
    
    // Verificação simples de idempotência
    if (this.processedEvents.has(eventKey)) {
      this.logger.debug(`⏭️ Evento já processado: ${eventKey}`);
      return;
    }

    try {
      // Verificar se já existe histórico
      const historicoExistente = await this.prisma.historicoAtendimento.findFirst({
        where: { agendamentoId: event.agendamentoId }
      });

      if (!historicoExistente) {
        // Criar histórico de início
        const createDto: CreateHistoricoAtendimentoDto = {
          agendamentoId: event.agendamentoId,
          clienteId: event.clienteId,
          barbeiroId: event.barbeiroId,
          servicoIds: event.servicoIds,
          dataHoraInicio: event.dataHoraInicio.toISOString()
        };

        await this.historicoAtendimentoService.registrarInicioAtendimento(createDto);
        
        this.logger.log(`✅ Histórico de início criado para agendamento: ${event.agendamentoId}`);
      } else {
        this.logger.debug(`ℹ️ Histórico já existe para agendamento: ${event.agendamentoId}`);
      }

      // Marcar como processado
      this.processedEvents.add(eventKey);
      
      // Limpar cache após 1 hora
      setTimeout(() => {
        this.processedEvents.delete(eventKey);
      }, 60 * 60 * 1000);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar AGENDAMENTO_INICIADO: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🎯 Handler: AGENDAMENTO_CANCELADO
   * Disparado quando um agendamento é cancelado no domínio AGENDAMENTO
   */
  @OnEvent('AGENDAMENTO_CANCELADO')
  async handleAgendamentoCancelado(event: {
    agendamentoId: string;
    motivoCancelamento?: string;
  }) {
    const eventKey = `AGENDAMENTO_CANCELADO:${event.agendamentoId}:AtendimentoEventHandlers`;
    
    // Verificação simples de idempotência
    if (this.processedEvents.has(eventKey)) {
      this.logger.debug(`⏭️ Evento já processado: ${eventKey}`);
      return;
    }

    try {
      // Buscar histórico existente
      const historico = await this.prisma.historicoAtendimento.findFirst({
        where: { agendamentoId: event.agendamentoId }
      });

      if (historico) {
        // Atualizar observações para indicar cancelamento
        await this.prisma.historicoAtendimento.update({
          where: { id: historico.id },
          data: {
            observacoes: event.motivoCancelamento || 'Agendamento cancelado'
          }
        });

        this.logger.log(`✅ Histórico atualizado para cancelamento: ${historico.id}`);
      }

      // Marcar como processado
      this.processedEvents.add(eventKey);
      
      // Limpar cache após 1 hora
      setTimeout(() => {
        this.processedEvents.delete(eventKey);
      }, 60 * 60 * 1000);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar AGENDAMENTO_CANCELADO: ${error.message}`, error.stack);
      throw error;
    }
  }
}
