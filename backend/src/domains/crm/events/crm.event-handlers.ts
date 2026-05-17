import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FidelidadeService } from '../services/fidelidade.service';
import { VendaPagaEvent, DomainEventType } from '../../../shared/events/domain-events';

/**
 * 🎧 CRM EVENT HANDLERS
 * 
 * Processa eventos de outros domínios que impactam o CRM:
 * - VENDA_PAGA → Gerar pontos de fidelidade
 */

@Injectable()
export class CrmEventHandlers {
  constructor(
    private readonly fidelidadeService: FidelidadeService,
  ) {}

  /**
   * Processa evento de venda paga para gerar pontos de fidelidade
   */
  @OnEvent(DomainEventType.VENDA_PAGA)
  async handleVendaPaga(event: VendaPagaEvent): Promise<void> {
    console.log('[CRM] Processando evento VENDA_PAGA para fidelidade');
    
    // O FidelidadeService já tem o @OnEvent, mas mantemos aqui
    // para centralizar todos os handlers do domínio CRM
    await this.fidelidadeService.gerarPontosFidelidade(event);
  }
}
