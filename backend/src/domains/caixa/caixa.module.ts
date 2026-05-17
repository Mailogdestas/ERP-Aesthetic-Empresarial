import { Module } from '@nestjs/common';
import { CaixaController } from './controllers/caixa.controller';
import { FechamentoDiarioController } from './controllers/fechamento-diario.controller';
import { FechamentoAutomaticoController } from './controllers/fechamento-automatico.controller';
import { CaixaService } from './services/caixa.service';
import { FechamentoDiarioService } from './services/fechamento-diario.service';
import { FechamentoAutomaticoService } from './services/fechamento-automatico.service';
import { CaixaEventHandlers } from './events/caixa.event-handlers';
import { PrismaModule } from '../../core/prisma/prisma.module';

/**
 * 💰 CAIXA MODULE
 * 
 * Módulo responsável pelo domínio de CAIXA no sistema ERP.
 * 
 * Funcionalidades:
 * - Abrir e fechar sessões de caixa
 * - Registrar movimentos manuais (sangria, suprimento, despesas)
 * - Processar entradas automáticas de vendas pagas
 * - Gerar relatórios de fechamento
 * - Controlar fluxo de caixa por barbearia/barbeiro
 * - Processar fechamentos diários automáticos
 * - Conferir e ajustar fechamentos
 * - Automação via CRON jobs (23:30 diariamente)
 * 
 * Eventos:
 * - Consome: VENDA_PAGA → Registra entrada automática
 * - Emite: CAIXA_FECHADO → Para consolidação financeira
 * 
 * Fluxo:
 * VENDA_PAGA → Entrada Automática → Fechamento → CAIXA_FECHADO → FINANCEIRO
 */
@Module({
  imports: [
    PrismaModule, // Para acesso ao banco de dados
  ],
  controllers: [
    CaixaController, // Endpoints REST para caixa
    FechamentoDiarioController, // Endpoints REST para fechamento diário
    FechamentoAutomaticoController, // Endpoints REST para automação
  ],
  providers: [
    CaixaService, // Lógica de negócio do caixa
    FechamentoDiarioService, // Lógica de negócio do fechamento diário
    FechamentoAutomaticoService, // Lógica de automação via CRON
    CaixaEventHandlers, // Handlers de eventos entre domínios
  ],
  exports: [
    CaixaService, // Exporta para outros módulos que precisem
    FechamentoDiarioService, // Exporta para outros módulos que precisem
    FechamentoAutomaticoService, // Exporta para outros módulos que precisem
  ],
})
export class CaixaModule {}