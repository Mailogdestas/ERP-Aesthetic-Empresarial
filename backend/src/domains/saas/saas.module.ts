import { Module } from '@nestjs/common';
import { SaasController } from './controllers/saas.controller';
import { SaasService } from './services/saas.service';
import { SaasEventHandler } from './event-handlers/saas.event-handler';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaasController],
  providers: [SaasService, SaasEventHandler],
  exports: [SaasService],
})
export class SaasModule {}