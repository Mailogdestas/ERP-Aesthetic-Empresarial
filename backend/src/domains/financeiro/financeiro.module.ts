import { Module } from '@nestjs/common';
import { FinanceiroController } from './controllers/financeiro.controller';
import { FinanceiroService } from './services/financeiro.service';
import { RelatorioAutomaticoService } from './services/relatorio-automatico.service';
import { FinanceiroEventHandler } from './event-handlers/financeiro.event-handler';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceiroController],
  providers: [
    FinanceiroService, 
    RelatorioAutomaticoService,
    FinanceiroEventHandler
  ],
  exports: [
    FinanceiroService,
    RelatorioAutomaticoService
  ],
})
export class FinanceiroModule {}