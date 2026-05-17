import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { CaixaAutomationService } from './jobs/caixa-automation.service';
import { NotificationAutomationService } from './jobs/notification-automation.service';
import { ReportsAutomationService } from './jobs/reports-automation.service';
import { PrismaService } from '../prisma/prisma.service';
import { CaixaModule } from '../../domains/caixa/caixa.module';
import { FinanceiroModule } from '../../domains/financeiro/financeiro.module';
import { NotificacoesModule } from '../../domains/notificacoes/notificacoes.module';

@Module({
  imports: [
    CaixaModule,
    FinanceiroModule,
    NotificacoesModule,
  ],
  controllers: [CronController],
  providers: [
    CronService,
    CaixaAutomationService,
    NotificationAutomationService,
    ReportsAutomationService,
    PrismaService,
  ],
  exports: [CronService],
})
export class CronModule {}