import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './core/auth/auth.module';
import { PrismaService } from './core/prisma/prisma.service';
import { SharedModule } from './shared/shared.module';
import { CronModule } from './core/cron/cron.module';

// Domínios (domains/) - Arquitetura Enterprise
import { AgendamentoModule } from './domains/agendamento/agendamento.module';
import { AtendimentoModule } from './domains/atendimento/atendimento.module';
import { CrmModule } from './domains/crm/crm.module';
import { VendasModule } from './domains/vendas/vendas.module';
import { PagamentosModule } from './domains/pagamentos/pagamentos.module';
import { CaixaModule } from './domains/caixa/caixa.module';
import { EstoqueModule } from './domains/estoque/estoque.module';
import { FinanceiroModule } from './domains/financeiro/financeiro.module';
import { SaasModule } from './domains/saas/saas.module';
import { NotificacoesModule } from './domains/notificacoes/notificacoes.module';
import { PacotesModule } from './domains/pacotes/pacotes.module';

@Module({
  imports: [
    // Core modules - EventEmitter DEVE ser o primeiro para instância global
    EventEmitterModule.forRoot(), // 🔥 Instância global do EventEmitter2
    AuthModule, 
    SharedModule,
    CronModule, // CRON jobs para automação
    ScheduleModule.forRoot(), // Para CRON jobs
    
    // Domain modules (domains/) - Enterprise Architecture
    AgendamentoModule,
    AtendimentoModule,
    CrmModule,
    VendasModule,
    PagamentosModule,
    CaixaModule,
    EstoqueModule,
    FinanceiroModule,
    SaasModule,
    NotificacoesModule,
    PacotesModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
