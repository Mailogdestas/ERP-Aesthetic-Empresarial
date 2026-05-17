import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';

// Controllers
import { AtendimentoController } from './controllers/atendimento.controller';

// Services
import { HistoricoAtendimentoService } from './services/historico-atendimento.service';

// Event Handlers
import { AtendimentoEventHandlers } from './events/atendimento.event-handlers';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [AtendimentoController],
  providers: [
    HistoricoAtendimentoService,
    AtendimentoEventHandlers,
  ],
  exports: [HistoricoAtendimentoService],
})
export class AtendimentoModule {}
