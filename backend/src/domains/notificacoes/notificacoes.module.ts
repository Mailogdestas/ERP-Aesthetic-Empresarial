import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { 
  NotificacaoController, 
  MensagemTemplateController 
} from './controllers';
import { 
  NotificacaoService, 
  MensagemTemplateService 
} from './services';
import { NotificacaoAutomaticaService } from './services/notificacao-automatica.service';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot()
  ],
  controllers: [
    NotificacaoController,
    MensagemTemplateController
  ],
  providers: [
    NotificacaoService,
    MensagemTemplateService,
    NotificacaoAutomaticaService
  ],
  exports: [
    NotificacaoService,
    MensagemTemplateService,
    NotificacaoAutomaticaService
  ]
})
export class NotificacoesModule {}