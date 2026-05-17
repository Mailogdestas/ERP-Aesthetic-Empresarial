import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FinanceiroService } from '../services/financeiro.service';
import { DomainEventType } from '../../../shared/events/domain-events';

@Injectable()
export class FinanceiroEventHandler {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @OnEvent(DomainEventType.VENDA_PAGA)
  async handleVendaPaga(event: any) {
    const { vendaId, barbeariaId, barbeiroId, valorTotal } = event;
    
    if (barbeiroId) {
      // Calcular comissão automaticamente
      await this.financeiroService.createComissao({
        vendaId,
        barbeiroId,
        valorBase: valorTotal,
        percentual: 30, // Percentual padrão - pode ser configurável
      });
    }
  }

  @OnEvent(DomainEventType.CAIXA_FECHADO)
  async handleCaixaFechado(event: any) {
    // Consolidar dados financeiros do dia
    console.log('Consolidando dados financeiros do caixa fechado:', event);
    
    // TODO: Implementar consolidação de relatórios diários
    // TODO: Calcular métricas de performance
  }
}