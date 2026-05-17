import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventType } from '../domain-events';

/**
 * 🎯 VENDA_FINALIZADA → PAGAMENTO
 * 
 * Listener que conecta o domínio VENDAS ao domínio PAGAMENTOS
 * Quando uma venda é finalizada, habilita o pagamento
 */
@Injectable()
export class VendaFinalizadaListener {
  private readonly logger = new Logger(VendaFinalizadaListener.name);
  private readonly processedEvents = new Set<string>();

  constructor() {}

  @OnEvent(DomainEventType.VENDA_FINALIZADA)
  async handle(event: {
    vendaId: string;
    barbeariaId: string;
    clienteId?: string;
    barbeiroId?: string;
    valorTotal: number;
    itens: Array<{
      id: string;
      tipo: 'PRODUTO' | 'SERVICO';
      nome: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
    }>;
  }) {
    const eventKey = `VENDA_FINALIZADA:${event.vendaId}`;
    
    if (this.processedEvents.has(eventKey)) {
      this.logger.debug(`⏭️ Evento já processado: ${eventKey}`);
      return;
    }

    try {
      this.logger.log(`🎬 Processando VENDA_FINALIZADA para venda ${event.vendaId}`);

      // Por enquanto, apenas log - o domínio PAGAMENTO já está preparado
      // para receber vendaId nos endpoints de pagamento
      this.logger.log(`💰 Venda ${event.vendaId} finalizada - Valor: R$ ${event.valorTotal.toFixed(2)}`);
      this.logger.log(`📋 Itens: ${event.itens.length} item(ns)`);

      // Aqui poderia criar um pagamento pendente automaticamente
      // Mas por enquanto deixamos manual via endpoint

      this.processedEvents.add(eventKey);
      this.logger.log(`✅ Venda ${event.vendaId} pronta para pagamento`);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar VENDA_FINALIZADA: ${error.message}`, error.stack);
      throw error;
    }
  }
}
