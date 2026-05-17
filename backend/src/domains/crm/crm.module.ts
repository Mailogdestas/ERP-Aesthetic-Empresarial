import { Module } from '@nestjs/common';
import { ClienteController } from './controllers/cliente.controller';
import { FidelidadeController } from './controllers/fidelidade.controller';
import { CampanhaController } from './controllers/campanha.controller';
import { ClienteService } from './services/cliente.service';
import { FidelidadeService } from './services/fidelidade.service';
import { CampanhaService } from './services/campanha.service';
import { ClienteTransformerService } from './services/cliente-transformer.service';
import { CrmEventHandlers } from './events/crm.event-handlers';

/**
 * 👥 DOMÍNIO CRM
 * 
 * Responsabilidades:
 * - Gerenciar cadastro e relacionamento com clientes
 * - Controlar programa de fidelidade
 * - Executar campanhas de marketing
 * 
 * Entidades: Cliente, Fidelidade, Campanha
 */

@Module({
  controllers: [
    ClienteController,
    FidelidadeController,
    CampanhaController,
  ],
  providers: [
    ClienteService,
    FidelidadeService,
    CampanhaService,
    ClienteTransformerService,
    CrmEventHandlers,
  ],
  exports: [
    ClienteService,
    FidelidadeService,
    CampanhaService,
    ClienteTransformerService,
  ],
})
export class CrmModule {}
