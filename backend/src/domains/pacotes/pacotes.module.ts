import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PacoteController, PacoteConsumoController } from './controllers';
import { PacoteService, PacoteConsumoService } from './services';
import { PacoteAutomaticoService } from './services/pacote-automatico.service';

@Module({
  imports: [PrismaModule],
  controllers: [PacoteController, PacoteConsumoController],
  providers: [
    PacoteService, 
    PacoteConsumoService,
    PacoteAutomaticoService
  ],
  exports: [
    PacoteService, 
    PacoteConsumoService,
    PacoteAutomaticoService
  ],
})
export class PacotesModule {}