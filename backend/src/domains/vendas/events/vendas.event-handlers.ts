import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VendasService } from '../services/vendas.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DomainEventType } from '../../../shared/events/domain-events';

/**
 * 🎬 VendasEventHandlers - Manipula eventos do domínio VENDAS
 * 
 * Escuta eventos de outros domínios e executa ações correspondentes:
 * - ATENDIMENTO_CONCLUIDO: Cria venda pré-preenchida com serviços realizados
 */
@Injectable()
export class VendasEventHandlers {
  private readonly logger = new Logger(VendasEventHandlers.name);
  private readonly processedEvents = new Set<string>(); // Cache simples para idempotência

  constructor(
    private readonly vendasService: VendasService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * 🎯 Handler: ATENDIMENTO_CONCLUIDO
   * Disparado quando um atendimento é finalizado no domínio ATENDIMENTO
   * Cria uma venda pré-preenchida com os serviços realizados
   */
  @OnEvent(DomainEventType.ATENDIMENTO_CONCLUIDO)
  async handleAtendimentoConcluido(event: {
    agendamentoId: string;
    barbeariaId: string;
    clienteId: string;
    barbeiroId: string;
    servicoIds: string[];
    dataHoraInicio: Date;
    dataHoraFim: Date;
    observacoes?: string;
  }) {
    console.log('🎬 EVENTO RECEBIDO - ATENDIMENTO_CONCLUIDO:', event);
    console.log('🔍 Tipo do evento:', typeof event);
    console.log('🔍 Propriedades do evento:', Object.keys(event));
    
    const eventKey = `ATENDIMENTO_CONCLUIDO:${event.agendamentoId}:VendasEventHandlers`;
    
    // Verificação simples de idempotência
    if (this.processedEvents.has(eventKey)) {
      this.logger.debug(`⏭️ Evento já processado: ${eventKey}`);
      return;
    }

    try {
      console.log('🔍 Verificando venda existente para agendamento:', event.agendamentoId);
      
      // Verificar se já existe venda para este agendamento
      const vendaExistente = await this.prisma.venda.findFirst({
        where: { 
          agendamentoId: event.agendamentoId,
          deletedAt: null
        }
      });

      console.log('🔍 Venda existente encontrada:', vendaExistente ? 'SIM' : 'NÃO');

      if (vendaExistente) {
        this.logger.debug(`ℹ️ Venda já existe para agendamento: ${event.agendamentoId}`);
        this.processedEvents.add(eventKey);
        return;
      }

      console.log('🔍 Buscando serviços com IDs:', event.servicoIds);

      // Buscar informações dos serviços realizados
      const servicos = await this.prisma.servico.findMany({
        where: {
          id: { in: event.servicoIds },
          deletedAt: null
        }
      });

      console.log('🔍 Serviços encontrados:', servicos.length);

      if (servicos.length === 0) {
        this.logger.warn(`⚠️ Nenhum serviço encontrado para IDs: ${event.servicoIds.join(', ')}`);
        this.processedEvents.add(eventKey);
        return;
      }

      console.log('🔍 Criando venda com dados:', {
        barbeariaId: event.barbeariaId,
        clienteId: event.clienteId,
        barbeiroId: event.barbeiroId,
        agendamentoId: event.agendamentoId
      });

      // Criar venda pré-preenchida
      const venda = await this.vendasService.create({
        barbeariaId: event.barbeariaId,
        clienteId: event.clienteId,
        barbeiroId: event.barbeiroId,
        agendamentoId: event.agendamentoId
      }, event.barbeiroId); // Usar barbeiroId como usuarioId para o sistema

      console.log('✅ Venda criada com ID:', venda.id);

      // Adicionar serviços à venda
      for (const servico of servicos) {
        console.log('🔍 Adicionando serviço à venda:', servico.id);
        await this.vendasService.addItemToVenda(venda.id, {
          servicoId: servico.id,
          quantidade: 1,
          precoUnit: servico.preco
        });
      }

      this.logger.log(`✅ Venda criada automaticamente para agendamento: ${event.agendamentoId} - Venda ID: ${venda.id}`);

      // Marcar como processado
      this.processedEvents.add(eventKey);
      
      // Limpar cache após 1 hora (evitar memory leak)
      setTimeout(() => {
        this.processedEvents.delete(eventKey);
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('❌ ERRO DETALHADO:', error);
      this.logger.error(`❌ Erro ao processar ATENDIMENTO_CONCLUIDO: ${error.message}`, error.stack);
      throw error;
    }
  }
}
