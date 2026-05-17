import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventType, VendaPagaEvent, CaixaFechadoEvent, DespesaPagaEvent } from '../../../shared/events/domain-events';
import { TipoMovimento, TipoPagamento } from '@prisma/client';

/**
 * 🎬 CAIXA EVENT HANDLERS
 * 
 * Eventos Consumidos:
 * - VENDA_FINALIZADA → Registra entrada automática no caixa quando venda é finalizada
 * - VENDA_PAGA → Registra entrada automática no caixa
 * - DESPESA_PAGA → Registra saída automática no caixa quando despesa é paga
 * 
 * Eventos Emitidos:
 * - CAIXA_FECHADO → Notifica fechamento para consolidação financeira
 */

@Injectable()
export class CaixaEventHandlers {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 💰 EVENTO: VENDA_PAGA
   * Quando uma venda é paga, registra automaticamente a entrada no caixa
   */
  @OnEvent(DomainEventType.VENDA_PAGA)
  async handleVendaPaga(event: VendaPagaEvent) {
    // Verificar se o evento tem payload válido
    if (!event.payload) {
      console.warn(`[CAIXA] Evento VENDA_PAGA sem payload`);
      return;
    }

    console.log(`[CAIXA] Processando VENDA_PAGA para venda ${event.payload.vendaId}`);
    
    try {
      // Buscar sessão de caixa ativa da barbearia
      let sessaoAtiva = await this.prisma.caixaSessao.findFirst({
        where: {
          barbeariaId: event.payload.barbeariaId,
          closedAt: null, // Sessão ainda não foi fechada
        },
      });

      // Se não existe sessão ativa, criar uma nova
      if (!sessaoAtiva) {
        console.log(`[CAIXA] Nenhuma sessão ativa encontrada. Criando nova sessão para barbearia ${event.payload.barbeariaId}`);
        
        sessaoAtiva = await this.prisma.caixaSessao.create({
          data: {
            barbeariaId: event.payload.barbeariaId,
            openedByUserId: event.payload.barbeiroId || 'system',
            valorAbertura: 0,
          },
        });
        
        console.log(`[CAIXA] Nova sessão criada: ${sessaoAtiva.id}`);
      }

      // Mapear método de pagamento
      const metodoPagamento = this.mapearMetodoPagamento(event.payload.metodoPagamento);

      // Registrar movimento de entrada no caixa
      const movimento = await this.prisma.caixaMovimento.create({
        data: {
          sessaoId: sessaoAtiva.id,
          barbeariaId: event.payload.barbeariaId,
          vendaId: event.payload.vendaId,
          tipo: TipoMovimento.ENTRADA,
          metodo: metodoPagamento,
          valor: event.payload.total,
          descricao: `Venda #${event.payload.vendaId} - Cliente: ${event.payload.clienteId || 'Não informado'}`,
          origem: 'VENDA',
        },
      });

      console.log(`[CAIXA] Movimento de entrada registrado: ${movimento.id} - R$ ${event.payload.total}`);
      console.log(`[CAIXA] Saldo da sessão ${sessaoAtiva.id} atualizado`);

    } catch (error) {
      console.error(`[CAIXA] Erro ao processar VENDA_PAGA:`, error);
      throw error;
    }
  }

  /**
   * 🧾 EVENTO: VENDA_FINALIZADA
   * Quando uma venda é finalizada, registra automaticamente a entrada no caixa
   */
  @OnEvent(DomainEventType.VENDA_FINALIZADA)
  async handleVendaFinalizada(event: any) {
    console.log('🧾 Evento VENDA_FINALIZADA recebido:', event);
    
    try {
      // Buscar sessão de caixa ativa da barbearia
      let sessaoAtiva = await this.prisma.caixaSessao.findFirst({
        where: {
          barbeariaId: event.barbeariaId,
          closedAt: null, // Sessão ainda não foi fechada
        },
      });

      // Se não existe sessão ativa, criar uma nova
      if (!sessaoAtiva) {
        console.log(`[CAIXA] Nenhuma sessão ativa encontrada. Criando nova sessão para barbearia ${event.barbeariaId}`);
        sessaoAtiva = await this.prisma.caixaSessao.create({
          data: {
            barbeariaId: event.barbeariaId,
            openedByUserId: event.barbeiroId || 'system',
            valorAbertura: 0,
          },
        });
      }

      // Registrar movimento de entrada no caixa
      const movimento = await this.prisma.caixaMovimento.create({
        data: {
          sessaoId: sessaoAtiva.id,
          barbeariaId: event.barbeariaId,
          tipo: TipoMovimento.ENTRADA,
          valor: event.valorTotal,
          origem: 'VENDA',
          vendaId: event.vendaId, // Campo correto é vendaId, não referenciaId
          descricao: `Venda #${event.vendaId.slice(-8)} finalizada`,
        },
      });

      console.log(`[CAIXA] Movimento de entrada registrado: ${movimento.id} - R$ ${event.valorTotal}`);
      console.log(`[CAIXA] Saldo da sessão ${sessaoAtiva.id} atualizado`);

    } catch (error) {
      console.error(`[CAIXA] Erro ao processar VENDA_FINALIZADA:`, error);
      throw error;
    }
  }

  /**
   * 📊 EMITIR EVENTO: CAIXA_FECHADO
   * Quando uma sessão de caixa é fechada, emite evento para consolidação financeira
   */
  async emitirCaixaFechado(sessaoId: string, fechamentoDiarioId: string) {
    try {
      // Buscar dados da sessão fechada
      const sessao = await this.prisma.caixaSessao.findUnique({
        where: { id: sessaoId },
        include: {
          movimentos: true,
          fechamentoDiario: true,
        },
      });

      if (!sessao || !sessao.fechamentoDiario) {
        throw new Error(`Sessão ${sessaoId} não encontrada ou não possui fechamento`);
      }

      // Calcular totais
      const totalEntradas = sessao.movimentos
        .filter(m => m.tipo === TipoMovimento.ENTRADA)
        .reduce((sum, m) => sum + m.valor.toNumber(), 0);

      const totalSaidas = sessao.movimentos
        .filter(m => m.tipo === TipoMovimento.SAIDA)
        .reduce((sum, m) => sum + m.valor.toNumber(), 0);

      const totalVendas = sessao.movimentos
        .filter(m => m.origem === 'VENDA')
        .reduce((sum, m) => sum + m.valor.toNumber(), 0);

      const totalDespesas = sessao.movimentos
        .filter(m => m.origem === 'DESPESA')
        .reduce((sum, m) => sum + m.valor.toNumber(), 0);

      // Emitir evento CAIXA_FECHADO
      const caixaFechadoEvent: CaixaFechadoEvent = {
        type: DomainEventType.CAIXA_FECHADO,
        aggregateId: sessaoId,
        barbeariaId: sessao.barbeariaId,
        payload: {
          caixaSessaoId: sessaoId,
          fechamentoDiarioId: fechamentoDiarioId,
          data: sessao.fechamentoDiario.data,
          saldoInicial: sessao.valorAbertura.toNumber(),
          saldoFinal: sessao.valorFechamento?.toNumber() || 0,
          totalEntradas,
          totalSaidas,
          totalVendas,
          totalDespesas,
        },
        occurredAt: new Date(),
        version: 1,
      };

      this.eventEmitter.emit(DomainEventType.CAIXA_FECHADO, caixaFechadoEvent);
      
      console.log(`[CAIXA] Evento CAIXA_FECHADO emitido para sessão ${sessaoId}`);

    } catch (error) {
      console.error(`[CAIXA] Erro ao emitir CAIXA_FECHADO:`, error);
      throw error;
    }
  }

  /**
   * 🔄 Mapear método de pagamento do evento para enum do Prisma
   */
  private mapearMetodoPagamento(metodo: string): TipoPagamento {
    const mapeamento: Record<string, TipoPagamento> = {
      'DINHEIRO': TipoPagamento.DINHEIRO,
      'CARTAO': TipoPagamento.DEBITO,
      'CARTAO_CREDITO': TipoPagamento.CREDITO,
      'CARTAO_DEBITO': TipoPagamento.DEBITO,
      'PIX': TipoPagamento.PIX,
    };

    return mapeamento[metodo] || TipoPagamento.DINHEIRO;
  }

  /**
   * 💸 EVENTO: DESPESA_PAGA
   * Quando uma despesa é paga, registra automaticamente a saída no caixa
   */
  @OnEvent('despesa.paga')
  async handleDespesaPaga(event: DespesaPagaEvent) {
    // Verificar se o evento tem payload válido
    if (!event.payload) {
      console.warn(`[CAIXA] Evento DESPESA_PAGA sem payload`);
      return;
    }

    console.log(`[CAIXA] Processando DESPESA_PAGA para despesa ${event.payload.despesaId}`);
    
    try {
      // Buscar sessão de caixa ativa da barbearia
      let sessaoAtiva = await this.prisma.caixaSessao.findFirst({
        where: {
          barbeariaId: event.payload.barbeariaId,
          closedAt: null, // Sessão ainda não foi fechada
        },
      });

      // Se não existe sessão ativa, criar uma nova
      if (!sessaoAtiva) {
        console.log(`[CAIXA] Nenhuma sessão ativa encontrada. Criando nova sessão para barbearia ${event.payload.barbeariaId}`);
        
        sessaoAtiva = await this.prisma.caixaSessao.create({
          data: {
            barbeariaId: event.payload.barbeariaId,
            openedByUserId: event.payload.usuarioId || 'system',
            valorAbertura: 0,
          },
        });
        
        console.log(`[CAIXA] Nova sessão criada: ${sessaoAtiva.id}`);
      }

      // Mapear método de pagamento
      const metodoPagamento = this.mapearMetodoPagamento(event.payload.metodoPagamento);

      // Registrar movimento de saída no caixa
      const movimento = await this.prisma.caixaMovimento.create({
        data: {
          sessaoId: sessaoAtiva.id,
          barbeariaId: event.payload.barbeariaId,
          tipo: TipoMovimento.SAIDA,
          metodo: metodoPagamento,
          valor: event.payload.valor,
          descricao: `Despesa: ${event.payload.descricao}`,
          origem: 'DESPESA',
        },
      });

      console.log(`[CAIXA] Movimento de saída registrado: ${movimento.id} - R$ ${event.payload.valor}`);
      console.log(`[CAIXA] Saldo da sessão ${sessaoAtiva.id} atualizado`);

    } catch (error) {
      console.error(`[CAIXA] Erro ao processar DESPESA_PAGA:`, error);
      throw error;
    }
  }
}