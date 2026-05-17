import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';

// Controllers
import { PagamentoController } from './controllers/pagamento.controller';
import { ConfigJurosController } from './controllers/config-juros.controller';

// Services
import { PagamentoService } from './services/pagamento.service';
import { ConfigJurosService } from './services/config-juros.service';

// Event Handlers
import { PagamentoEventHandlers } from './events/pagamento.event-handlers';

/**
 * 💳 DOMÍNIO PAGAMENTOS
 * 
 * Responsabilidades:
 * - Simular pagamentos com cálculo de juros
 * - Criar pagamentos avançados com parcelamento
 * - Gerenciar parcelas e vencimentos
 * - Configurar taxas de juros por barbearia
 * - Integrar com outros domínios via eventos
 * 
 * Entidades: PagamentoAvancado, ParcelaAvancada, ConfigJuros
 * 
 * Fluxo:
 * VENDA_FINALIZADA → Simular/Criar Pagamento → PAGAMENTO_CRIADO
 * Pagar Parcela → PARCELA_PAGA → (se última) VENDA_PAGA
 */
@Module({
  imports: [
    PrismaModule, // Para acesso ao banco de dados
    SharedModule, // Para sistema de eventos
  ],
  controllers: [
    PagamentoController, // Endpoints REST para pagamentos
    ConfigJurosController, // Endpoints para configuração de juros
  ],
  providers: [
    PagamentoService, // Lógica de negócio de pagamentos
    ConfigJurosService, // Lógica de configuração de juros
    PagamentoEventHandlers, // Handlers de eventos entre domínios
  ],
  exports: [
    PagamentoService, // Exporta para outros módulos que precisem
    ConfigJurosService, // Exporta para outros módulos que precisem
  ],
})
export class PagamentosModule {}
