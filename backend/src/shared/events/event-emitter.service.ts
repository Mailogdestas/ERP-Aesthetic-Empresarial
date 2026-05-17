import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent, DomainEventType } from './domain-events';

/**
 * 🎯 EVENT EMITTER SERVICE
 * 
 * Centraliza a emissão e escuta de eventos entre domínios
 * Garante que os eventos sejam processados de forma assíncrona e confiável
 */

@Injectable()
export class DomainEventEmitterService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emite um evento de domínio
   */
  async emit(event: DomainEvent): Promise<void> {
    try {
      // Verifica quantos listeners estão registrados para este evento
      const listenersCount = this.eventEmitter.listenerCount(event.type);
      const globalListenersCount = this.eventEmitter.listenerCount('domain.event');
      
      // Log estruturado para auditoria
      console.log(`[DOMAIN_EVENT] Emitindo evento ${event.type}`, {
        aggregateId: event.aggregateId,
        barbeariaId: event.barbeariaId,
        occurredAt: event.occurredAt,
        version: event.version,
        listenersCount,
        globalListenersCount,
        totalListeners: listenersCount + globalListenersCount
      });

      // Emite o evento específico
      const emitResult1 = this.eventEmitter.emit(event.type, event);
      console.log(`[DOMAIN_EVENT] Evento ${event.type} emitido para listeners específicos: ${emitResult1}`);
      
      // Emite evento genérico para listeners globais
      const emitResult2 = this.eventEmitter.emit('domain.event', event);
      console.log(`[DOMAIN_EVENT] Evento ${event.type} emitido para listeners globais: ${emitResult2}`);
      
      // Log de confirmação
      console.log(`[DOMAIN_EVENT] ✅ Evento ${event.type} processado com sucesso`);
      
    } catch (error) {
      console.error(`[DOMAIN_EVENT_ERROR] ❌ Falha ao emitir evento ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Registra um listener para um tipo específico de evento
   */
  on(eventType: DomainEventType, listener: (event: DomainEvent) => Promise<void>): void {
    this.eventEmitter.on(eventType, listener);
  }

  /**
   * Registra um listener para todos os eventos de domínio
   */
  onAny(listener: (event: DomainEvent) => Promise<void>): void {
    this.eventEmitter.on('domain.event', listener);
  }

  /**
   * Remove um listener
   */
  off(eventType: DomainEventType, listener: (event: DomainEvent) => Promise<void>): void {
    this.eventEmitter.off(eventType, listener);
  }

  /**
   * Emite múltiplos eventos em sequência
   */
  async emitMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * Método de compatibilidade para emitir eventos de domínio
   * @deprecated Use emit() instead
   */
  async emitDomainEvent(eventType: DomainEventType, payload: any): Promise<void> {
    const event: DomainEvent = {
      type: eventType,
      aggregateId: payload.id || payload.agendamentoId || payload.clienteId,
      barbeariaId: payload.barbeariaId,
      payload,
      occurredAt: new Date(),
      version: 1,
    };
    
    await this.emit(event);
  }
}
