import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VendasService } from '../../../domains/vendas/services/vendas.service';
import { DomainEventType } from '../domain-events';

/**
 * 🎯 ATENDIMENTO_CONCLUIDO → VENDA
 * 
 * Listener que conecta o domínio ATENDIMENTO ao domínio VENDAS
 * Quando um atendimento é concluído, automaticamente cria uma venda
 */
@Injectable()
export class AtendimentoConcluidoListener {
  private readonly logger = new Logger(AtendimentoConcluidoListener.name);
  private readonly processedEvents = new Set<string>();

  constructor(private readonly vendasService: VendasService) {}

  @OnEvent(DomainEventType.ATENDIMENTO_CONCLUIDO)
  async handle(event: {
    agendamentoId: string;
    barbeariaId: string;
    clienteId: string;
    barbeiroId: string;
    servicoIds: string[];
    dataHoraInicio: Date;
    dataHoraFim: Date;
    observacoes?: string;
  }) {
    const eventKey = `ATENDIMENTO_CONCLUIDO:${event.agendamentoId}`;
    
    if (this.processedEvents.has(eventKey)) {
      this.logger.debug(`⏭️ Evento já processado: ${eventKey}`);
      return;
    }

    try {
      this.logger.log(`🎬 Processando ATENDIMENTO_CONCLUIDO para agendamento ${event.agendamentoId}`);

      // Criar venda automaticamente
      const venda = await this.vendasService.criarVenda(
        {
          barbeariaId: event.barbeariaId,
          clienteId: event.clienteId,
          barbeiroId: event.barbeiroId,
          agendamentoId: event.agendamentoId,
        },
        event.barbeariaId,
        event.barbeiroId // usuarioId = barbeiroId
      );

      // Adicionar serviços à venda
      for (const servicoId of event.servicoIds) {
        await this.vendasService.addItemToVenda(venda.id, {
          servicoId,
          quantidade: 1,
        });
      }

      this.processedEvents.add(eventKey);
      this.logger.log(`✅ Venda ${venda.id} criada automaticamente para atendimento ${event.agendamentoId}`);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar ATENDIMENTO_CONCLUIDO: ${error.message}`, error.stack);
      throw error;
    }
  }
}
