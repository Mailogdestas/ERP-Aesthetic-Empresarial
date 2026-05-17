import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EstoqueService } from '../services/estoque.service';
import { DomainEventType } from '../../../shared/events/domain-events';

@Injectable()
export class EstoqueEventHandler {
  constructor(private readonly estoqueService: EstoqueService) {}

  @OnEvent(DomainEventType.VENDA_PAGA)
  async handleVendaPaga(event: any) {
    const { vendaId, itens } = event;
    
    // Filtrar apenas itens que são produtos (não serviços)
    const produtos = itens.filter((item: any) => item.produtoId);
    
    if (produtos.length > 0) {
      await this.estoqueService.baixarEstoquePorVenda(vendaId, produtos);
    }
  }

  @OnEvent(DomainEventType.ESTOQUE_BAIXO)
  async handleEstoqueBaixo(event: any) {
    // Aqui poderia implementar notificações, emails, etc.
    console.log('Alerta de estoque baixo:', event);
    
    // TODO: Implementar notificação para administradores
    // TODO: Implementar sugestão automática de reposição
  }
}