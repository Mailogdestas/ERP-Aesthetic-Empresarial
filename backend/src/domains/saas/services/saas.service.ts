import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateAssinaturaDto } from '../dto/create-assinatura.dto';
import { CreateFaturaDto } from '../dto/create-fatura.dto';
import { Assinatura, Fatura, TenantFeature } from '@prisma/client';

interface AssinaturaFilters {
  status?: string;
  plano?: string;
}

interface FaturaFilters {
  barbeariaId: string;
  status?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

@Injectable()
export class SaasService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createAssinatura(createAssinaturaDto: CreateAssinaturaDto): Promise<Assinatura> {
    const { barbeariaId, planoId, periodStart, periodEnd, valor } = createAssinaturaDto;

    return this.prisma.assinatura.create({
      data: {
        barbeariaId,
        planoId,
        status: 'ATIVA',
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        valor,
      },
      include: {
        barbearia: true,
        plano: true,
      },
    });
  }

  async findAssinaturas(filters: AssinaturaFilters = {}) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.plano) {
      where.plano = filters.plano;
    }

    return this.prisma.assinatura.findMany({
      where,
      include: {
        barbearia: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAssinaturaBarbearia(barbeariaId: string) {
    const assinatura = await this.prisma.assinatura.findFirst({
      where: {
        barbeariaId,
        status: 'ATIVA',
      },
      include: {
        barbearia: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!assinatura) {
      throw new NotFoundException('Assinatura ativa não encontrada para esta barbearia');
    }

    return assinatura;
  }

  async createFatura(createFaturaDto: CreateFaturaDto): Promise<Fatura> {
    // Gerar número único da fatura
    const numero = `FAT-${Date.now()}`;
    
    return this.prisma.fatura.create({
      data: {
        assinaturaId: createFaturaDto.assinaturaId,
        barbeariaId: (await this.prisma.assinatura.findUnique({ 
          where: { id: createFaturaDto.assinaturaId },
          select: { barbeariaId: true }
        })).barbeariaId,
        numero,
        valor: createFaturaDto.valor,
        vencimento: new Date(createFaturaDto.vencimento),
        status: 'PENDENTE' as any,
      },
    });
  }

  async findFaturas(filters: any) {
    const { barbeariaId, status, dataInicio, dataFim } = filters;

    return this.prisma.fatura.findMany({
      where: {
        barbeariaId,
        ...(status && { status }),
        ...(dataInicio && dataFim && {
          vencimento: {
            gte: dataInicio,
            lte: dataFim,
          },
        }),
      },
      include: {
        assinatura: {
          include: {
            barbearia: true,
            plano: true,
          },
        },
      },
      orderBy: {
        vencimento: 'desc',
      },
    });
  }

  async getDashboard() {
    const [
      totalAssinaturas,
      assinaturasAtivas,
      faturasVencidas,
      receitaMensal,
    ] = await Promise.all([
      this.prisma.assinatura.count(),
      this.prisma.assinatura.count({
        where: { status: 'ATIVA' },
      }),
      this.prisma.fatura.count({
        where: {
          status: 'PENDENTE',
          vencimento: {
            lt: new Date(),
          },
        },
      }),
      this.prisma.fatura.aggregate({
        where: {
          status: 'PAGA',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { valor: true },
      }),
    ]);

    return {
      totalAssinaturas,
      assinaturasAtivas,
      faturasVencidas,
      receitaMensal: receitaMensal._sum.valor || 0,
    };
  }

  async getFeaturesAtivas(barbeariaId: string) {
    const assinatura = await this.findAssinaturaBarbearia(barbeariaId);
    
    // Buscar features do tenant
    const features = await this.prisma.tenantFeature.findMany({
      where: {
        barbeariaId,
        enabled: true,
      },
    });

    return {
      assinatura,
      features,
    };
  }

  async suspenderAssinatura(id: string): Promise<Assinatura> {
    return this.prisma.assinatura.update({
      where: { id },
      data: { 
        status: 'SUSPENSA' as any,
      },
    });
  }

  async reativarAssinatura(id: string): Promise<Assinatura> {
    return this.prisma.assinatura.update({
      where: { id },
      data: { 
        status: 'ATIVA' as any,
      },
    });

    // Reativar features do tenant
    await this.prisma.tenantFeature.updateMany({
      where: { barbeariaId: (await this.prisma.assinatura.findUnique({ where: { id } })).barbeariaId },
      data: { enabled: true },
    });
  }
}