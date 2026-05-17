import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventType } from '../../../shared/events/domain-events';

/**
 * 🎬 PAGAMENTO EVENT HANDLERS
 * 
 * Eventos Consumidos:
 * - VENDA_FINALIZADA → Habilita criação de pagamento
 * 
 * Eventos Emitidos:
 * - PAGAMENTO_CRIADO → Notifica criação de pagamento
 * - PARCELA_PAGA → Notifica pagamento de parcela
 * - VENDA_PAGA → Dispara baixa de estoque, caixa, fidelidade
 */

@Injectable()
export class PagamentoEventHandlers {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 📋 EVENTO: VENDA_FINALIZADA
   * Quando uma venda é finalizada, ela fica disponível para pagamento
   */
  @OnEvent(DomainEventType.VENDA_FINALIZADA)
  async handleVendaFinalizada(payload: {
    vendaId: string;
    valorTotal: number;
    barbeariaId: string;
    clienteId?: string;
    barbeiroId?: string;
  }) {
    console.log(`[PAGAMENTO] Venda ${payload.vendaId} finalizada - Disponível para pagamento`);
    
    // Aqui podemos implementar lógicas como:
    // - Notificar que a venda está pronta para pagamento
    // - Criar pagamento automático se configurado
    // - Enviar notificação para o cliente sobre formas de pagamento
    
    // Por enquanto, apenas logamos o evento
    // Em implementações futuras, pode disparar notificações ou workflows
  }

  /**
   * 💰 EVENTO: PAGAMENTO_CRIADO
   * Quando um pagamento é criado, notifica outros domínios
   */
  @OnEvent(DomainEventType.PAGAMENTO_CRIADO)
  async handlePagamentoCriado(payload: {
    pagamentoId: string;
    vendaId: string;
    valorTotal: number;
    numeroParcelas: number;
    barbeariaId: string;
  }) {
    console.log(`[PAGAMENTO] Pagamento ${payload.pagamentoId} criado para venda ${payload.vendaId}`);
    
    try {
      // Atualizar status da venda para indicar que tem pagamento criado
      await this.prisma.venda.update({
        where: { id: payload.vendaId },
        data: { 
          updatedAt: new Date() // Apenas atualiza timestamp para indicar mudança
        }
      });

      // Aqui podemos implementar:
      // - Notificação para o cliente sobre as parcelas
      // - Integração com sistemas de cobrança
      // - Criação de lembretes de vencimento
      
    } catch (error) {
      console.error(`[PAGAMENTO] Erro ao processar pagamento criado:`, error);
    }
  }

  /**
   * 💸 EVENTO: PARCELA_PAGA
   * Quando uma parcela é paga, atualiza controles internos
   */
  @OnEvent(DomainEventType.PARCELA_PAGA)
  async handleParcelaPaga(payload: {
    parcelaId: string;
    pagamentoId: string;
    vendaId: string;
    valor: number;
    numeroParcela: number;
    barbeariaId: string;
  }) {
    console.log(`[PAGAMENTO] Parcela ${payload.numeroParcela} paga - Valor: R$ ${payload.valor}`);
    
    try {
      // Aqui podemos implementar:
      // - Atualização de relatórios financeiros
      // - Notificação de parcela paga
      // - Integração com sistemas de contabilidade
      
      // Por enquanto, apenas registramos o evento
      console.log(`[PAGAMENTO] Parcela ${payload.parcelaId} processada com sucesso`);
      
    } catch (error) {
      console.error(`[PAGAMENTO] Erro ao processar parcela paga:`, error);
    }
  }

  /**
   * ⚠️ EVENTO: PAGAMENTO_CANCELADO
   * Quando um pagamento é cancelado, reverte operações se necessário
   */
  @OnEvent(DomainEventType.PAGAMENTO_CANCELADO)
  async handlePagamentoCancelado(payload: {
    pagamentoId: string;
    vendaId: string;
    motivo?: string;
    barbeariaId: string;
  }) {
    console.log(`[PAGAMENTO] Pagamento ${payload.pagamentoId} cancelado - Motivo: ${payload.motivo || 'Não informado'}`);
    
    try {
      // Reverter status da venda para FINALIZADA
      await this.prisma.venda.update({
        where: { id: payload.vendaId },
        data: { 
          status: 'FINALIZADA' as any,
          updatedAt: new Date()
        }
      });

      // Aqui podemos implementar:
      // - Estorno de valores no caixa
      // - Reversão de baixas de estoque
      // - Cancelamento de pontos de fidelidade
      // - Notificação para o cliente
      
    } catch (error) {
      console.error(`[PAGAMENTO] Erro ao processar cancelamento de pagamento:`, error);
    }
  }

  /**
   * 📅 EVENTO: PARCELA_VENCIDA
   * Quando uma parcela vence sem pagamento
   */
  @OnEvent(DomainEventType.PARCELA_VENCIDA)
  async handleParcelaVencida(payload: {
    parcelaId: string;
    pagamentoId: string;
    vendaId: string;
    valor: number;
    diasAtraso: number;
    barbeariaId: string;
    clienteId?: string;
  }) {
    console.log(`[PAGAMENTO] Parcela ${payload.parcelaId} vencida - ${payload.diasAtraso} dias de atraso`);
    
    try {
      // Marcar parcela como atrasada
      await this.prisma.parcelaAvancada.update({
        where: { id: payload.parcelaId },
        data: {
          status: 'ATRASADA' as any,
          updatedAt: new Date()
        }
      });

      // Implementar:
      // - Cobrança automática
      // - Notificação para o cliente
      // - Aplicação de juros de mora
      // - Relatório de inadimplência
      
    } catch (error) {
      console.error(`[PAGAMENTO] Erro ao processar parcela vencida:`, error);
    }
  }
}
