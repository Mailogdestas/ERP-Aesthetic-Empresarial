import { Module } from '@nestjs/common';
import { VendasController } from './controllers/vendas.controller';
import { VendasService } from './services/vendas.service';
import { ComissaoService } from './services/comissao.service';
import { VendasEventHandlers } from './events/vendas.event-handlers';
import { PrismaModule } from '../../core/prisma/prisma.module';

/**
 * 🏪 VENDAS MODULE
 * 
 * Módulo responsável pelo domínio de VENDAS no sistema ERP.
 * 
 * Funcionalidades:
 * - Criar e gerenciar vendas
 * - Adicionar itens (produtos/serviços) às vendas
 * - Finalizar vendas para pagamento
 * - Integração com domínio ATENDIMENTO via eventos
 * - Emissão de eventos para domínio PAGAMENTO
 * 
 * Fluxo:
 * ATENDIMENTO_CONCLUIDO → Cria Venda → VENDA_FINALIZADA → PAGAMENTO
 */
@Module({
  imports: [
    PrismaModule, // Para acesso ao banco de dados
  ],
  controllers: [
    VendasController, // Endpoints REST para vendas
  ],
  providers: [
    VendasService, // Lógica de negócio de vendas
    ComissaoService, // Lógica de cálculo de comissões
    VendasEventHandlers, // Handlers de eventos entre domínios
    // AtendimentoConcluidoListener removido - VendasEventHandlers já faz o mesmo trabalho
  ],
  exports: [
    VendasService, // Exporta para outros módulos que precisem
    ComissaoService, // Exporta para outros módulos que precisem
  ],
})
export class VendasModule {}
