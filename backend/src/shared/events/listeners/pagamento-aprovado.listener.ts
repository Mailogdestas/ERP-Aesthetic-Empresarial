import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { VendaPagaEvent } from '../domain-events';
import { TipoMovimento } from '@prisma/client';
import { DomainEventType } from '../domain-events';

/**
 * 🎯 PAGAMENTO_APROVADO → CAIXA
 * 
 * Listener que conecta o domínio PAGAMENTOS ao domínio CAIXA
 * Quando um pagamento é aprovado, registra automaticamente no caixa
 */
@Injectable()
export class PagamentoAprovadoListener {
  private readonly logger = new Logger(PagamentoAprovadoListener.name);
  private readonly processedEvents = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(DomainEventType.VENDA_PAGA)
  async handle(event: {
    vendaId: string;
    pagamentoId: string;
    barbeariaId: string;
    clienteId?: string;
    barbeiroId?: string;
    valorPago: number;
    metodoPagamento: string;
    dataHoraPagamento: Date;
  }) {
    const eventKey = `VENDA_PAGA:${event.pagamentoId}`;
    
    if (this.processedEvents.has(eventKey)) {
      this.logger.debug(`⏭️ Evento já processado: ${eventKey}`);
      return;
    }

    try {
      this.logger.log(`🎬 Processando VENDA_PAGA para pagamento ${event.pagamentoId}`);

      // Buscar sessão de caixa ativa
      let caixaSessao = await this.prisma.caixaSessao.findFirst({
        where: {
          barbeariaId: event.barbeariaId,
          closedAt: null, // Sessão ainda aberta
        },
      });

      // Se não existe caixa aberto, criar um
      if (!caixaSessao) {
        caixaSessao = await this.prisma.caixaSessao.create({
          data: {
            barbeariaId: event.barbeariaId,
            openedByUserId: event.barbeiroId || 'system',
            valorAbertura: 0,
          },
        });
        this.logger.log(`📦 Nova sessão de caixa criada: ${caixaSessao.id}`);
      }

      // Registrar lançamento de entrada no caixa
      const lancamento = await this.prisma.caixaMovimento.create({
        data: {
          sessaoId: caixaSessao.id,
          barbeariaId: event.barbeariaId,
          tipo: TipoMovimento.ENTRADA,
          origem: 'VENDA',
          valor: event.valorPago,
          descricao: `Venda ${event.vendaId} - ${event.metodoPagamento}`,
          vendaId: event.vendaId,
          pagamentoId: event.pagamentoId,
        },
      });

      // Como não temos saldoAtual no modelo, vamos apenas registrar o movimento
      // O saldo será calculado dinamicamente quando necessário
      
      this.processedEvents.add(eventKey);
      this.logger.log(`✅ Lançamento ${lancamento.id} registrado no caixa - Valor: R$ ${event.valorPago.toFixed(2)}`);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar VENDA_PAGA: ${error.message}`, error.stack);
      throw error;
    }
  }
}
