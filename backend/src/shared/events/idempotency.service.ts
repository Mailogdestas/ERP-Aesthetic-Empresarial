import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * 🔄 IdempotencyService - Gerencia idempotência de eventos
 * 
 * Garante que eventos não sejam processados múltiplas vezes,
 * usando uma tabela de controle para rastrear eventos já processados.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica se um evento já foi processado por um handler específico
   */
  async isEventProcessed(
    eventId: string,
    handlerName: string
  ): Promise<boolean> {
    try {
      const existingEvent = await this.prisma.$queryRaw`
        SELECT id FROM domain_events 
        WHERE event_id = ${eventId} 
        AND handler_name = ${handlerName}
        LIMIT 1
      `;

      return Array.isArray(existingEvent) && existingEvent.length > 0;
    } catch (error) {
      this.logger.error(`Erro ao verificar idempotência: ${error.message}`, error.stack);
      return false; // Em caso de erro, permite processamento (fail-safe)
    }
  }

  /**
   * Marca um evento como processado
   */
  async markEventAsProcessed(
    eventId: string,
    eventType: string,
    handlerName: string,
    aggregateId: string,
    payload?: any
  ): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO domain_events (event_id, event_type, handler_name, aggregate_id, payload, processed_at, created_at)
        VALUES (${eventId}, ${eventType}, ${handlerName}, ${aggregateId}, ${JSON.stringify(payload)}, NOW(), NOW())
        ON CONFLICT (event_id, handler_name) DO NOTHING
      `;

      this.logger.debug(`✅ Evento marcado como processado: ${eventType} por ${handlerName}`);
    } catch (error) {
      this.logger.error(`Erro ao marcar evento como processado: ${error.message}`, error.stack);
      // Não relança o erro para não quebrar o fluxo principal
    }
  }

  /**
   * Executa uma função apenas se o evento não foi processado
   */
  async executeIfNotProcessed<T>(
    eventId: string,
    eventType: string,
    handlerName: string,
    aggregateId: string,
    payload: any,
    executeFn: () => Promise<T>
  ): Promise<T | null> {
    // Verificar se já foi processado
    const alreadyProcessed = await this.isEventProcessed(eventId, handlerName);
    
    if (alreadyProcessed) {
      this.logger.debug(`⏭️ Evento já processado, pulando: ${eventType} por ${handlerName}`);
      return null;
    }

    try {
      // Executar a função
      const result = await executeFn();

      // Marcar como processado apenas se a execução foi bem-sucedida
      await this.markEventAsProcessed(eventId, eventType, handlerName, aggregateId, payload);

      return result;
    } catch (error) {
      this.logger.error(`Erro ao executar função idempotente: ${error.message}`, error.stack);
      throw error; // Relança o erro para que o handler possa tratar
    }
  }

  /**
   * Remove eventos antigos para limpeza (executar via cron job)
   */
  async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM domain_events 
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `;

      this.logger.log(`🧹 Limpeza concluída: ${result} eventos antigos removidos`);
      return Number(result);
    } catch (error) {
      this.logger.error(`Erro na limpeza de eventos: ${error.message}`, error.stack);
      return 0;
    }
  }
}
