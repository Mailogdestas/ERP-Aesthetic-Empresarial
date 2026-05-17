import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  CaixaSessao: any;
  async onModuleInit() {
    console.log('Prisma connecting to:', process.env.DATABASE_URL);
    try {
      await this.$connect();
    } catch (e) {
      console.warn('Prisma connection failed. Continuing in degraded mode. Error:', (e as any)?.message ?? e);
    }
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
