import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';

// Controllers
import { AgendamentoController } from './controllers/agendamento.controller';
import { BloqueioAgendaController } from './controllers/bloqueio-agenda.controller';

// Services
import { AgendamentoService } from './services/agendamento.service';
import { BloqueioAgendaService } from './services/bloqueio-agenda.service';
import { ConflitosService } from './services/conflitos.service';
import { SlotsService } from './services/slots.service';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [
    AgendamentoController,
    BloqueioAgendaController,
  ],
  providers: [
    AgendamentoService,
    BloqueioAgendaService,
    ConflitosService,
    SlotsService,
  ],
  exports: [
    AgendamentoService,
    BloqueioAgendaService,
    SlotsService,
  ],
})
export class AgendamentoModule {}
