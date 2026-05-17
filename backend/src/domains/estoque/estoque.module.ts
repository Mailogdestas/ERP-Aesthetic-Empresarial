import { Module } from '@nestjs/common';
import { EstoqueController } from './controllers/estoque.controller';
import { EstoqueService } from './services/estoque.service';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [EstoqueController],
  providers: [
    EstoqueService,
    PrismaService,
  ],
  exports: [EstoqueService],
})
export class EstoqueModule {}