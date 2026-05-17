import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventEmitterService } from './events/event-emitter.service';
import { 
  VendaFinalizadaListener
} from './events/listeners';

/**
 * 🌐 SHARED MODULE
 * 
 * Módulo global que fornece:
 * - Sistema de eventos entre domínios
 * - Utilitários compartilhados
 * - Serviços base (soft delete)
 */

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Configurações do EventEmitter
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [
    DomainEventEmitterService,
    // Event Listeners - Conectam os domínios
    // AtendimentoConcluidoListener movido para VendasModule para evitar dependência circular
    VendaFinalizadaListener,
    // PagamentoAprovadoListener removido - funcionalidade movida para CaixaEventHandlers
  ],
  exports: [
    DomainEventEmitterService,
  ],
})
export class SharedModule {}
