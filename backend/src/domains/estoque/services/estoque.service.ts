import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateEstoqueDto, UpdateEstoqueDto, AjustarEstoqueDto } from '../dto';
import { DomainEventType } from '../../../shared/events/domain-events';

interface EstoqueFilters {
  barbeariaId?: string;
  produtoId?: string;
  quantidadeMin?: number;
  quantidadeMax?: number;
  alertaEstoqueBaixo?: boolean;
  includeDeleted?: boolean;
}

@Injectable()
export class EstoqueService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private readonly includeRelations = {
    produto: {
      select: {
        id: true,
        nome: true,
        preco: true,
      },
    },
    barbearia: {
      select: {
        id: true,
        nome: true,
      },
    },
  };

  async create(createEstoqueDto: CreateEstoqueDto) {
    // Verificar se produto existe
    const produto = await this.prisma.produto.findUnique({
      where: { id: createEstoqueDto.produtoId },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Verificar se barbearia existe
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id: createEstoqueDto.barbeariaId },
    });
    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada');
    }

    // Verificar se já existe estoque para este produto nesta barbearia
    const estoqueExistente = await this.prisma.estoque.findFirst({
      where: {
        produtoId: createEstoqueDto.produtoId,
        barbeariaId: createEstoqueDto.barbeariaId,
      },
    });

    if (estoqueExistente) {
      throw new BadRequestException('Já existe estoque para este produto nesta barbearia');
    }

    const estoque = await this.prisma.estoque.create({
      data: {
        produtoId: createEstoqueDto.produtoId,
        barbeariaId: createEstoqueDto.barbeariaId,
        quantidade: createEstoqueDto.quantidade,
        alertaMin: createEstoqueDto.alertaMin,
      },
      include: this.includeRelations,
    });

    // Registrar movimento de entrada
    await this.prisma.estoqueMovimento.create({
      data: {
        barbeariaId: estoque.barbeariaId,
        produtoId: estoque.produtoId,
        tipo: 'ENTRADA',
        quantidade: createEstoqueDto.quantidade,
        custoUnit: 0,
        custoTotal: 0,
        saldoAntes: 0,
        saldoDepois: createEstoqueDto.quantidade,
        motivo: 'Estoque inicial',
        usuarioId: createEstoqueDto.createdByUsuarioId,
      },
    });

    return estoque;
  }

  async findAll(filters: EstoqueFilters = {}) {
    const where: any = {};

    if (filters.barbeariaId) {
      where.barbeariaId = filters.barbeariaId;
    }

    if (filters.produtoId) {
      where.produtoId = filters.produtoId;
    }

    if (filters.alertaEstoqueBaixo) {
      where.quantidade = {
        lte: this.prisma.estoque.fields.alertaMin,
      };
    }

    return this.prisma.estoque.findMany({
      where,
      include: this.includeRelations,
      orderBy: [
        { produto: { nome: 'asc' } },
      ],
    });
  }

  async findOne(id: string) {
    const estoque = await this.prisma.estoque.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!estoque) {
      throw new NotFoundException('Estoque não encontrado');
    }

    return estoque;
  }

  async update(id: string, updateEstoqueDto: UpdateEstoqueDto) {
    const estoque = await this.prisma.estoque.findUnique({
      where: { id },
    });

    if (!estoque) {
      throw new NotFoundException('Estoque não encontrado');
    }

    return this.prisma.estoque.update({
      where: { id },
      data: {
        quantidade: updateEstoqueDto.quantidade,
        alertaMin: updateEstoqueDto.alertaMin,
      },
      include: this.includeRelations,
    });
  }

  async remove(id: string) {
    const estoque = await this.prisma.estoque.findUnique({
      where: { id },
    });

    if (!estoque) {
      throw new NotFoundException('Estoque não encontrado');
    }

    return this.prisma.estoque.delete({
      where: { id },
    });
  }

  async ajustarQuantidade(ajustarEstoqueDto: AjustarEstoqueDto) {
    const { produtoId, barbeariaId, quantidadeDelta, motivo, usuarioId } = ajustarEstoqueDto;

    const estoque = await this.prisma.estoque.findFirst({
      where: { 
        produtoId, 
        barbeariaId,
      },
    });

    if (!estoque) {
      // Se não existe estoque e a quantidade é positiva, criar novo
      if (quantidadeDelta > 0) {
        const novoEstoque = await this.prisma.estoque.create({
          data: {
            produtoId,
            barbeariaId,
            quantidade: quantidadeDelta,
          },
          include: this.includeRelations,
        });

        // Registrar movimento
        await this.prisma.estoqueMovimento.create({
          data: {
            barbeariaId: novoEstoque.barbeariaId,
            produtoId: novoEstoque.produtoId,
            tipo: 'ENTRADA',
            quantidade: quantidadeDelta,
            custoUnit: 0,
            custoTotal: 0,
            saldoAntes: novoEstoque.quantidade - quantidadeDelta,
            saldoDepois: novoEstoque.quantidade,
            motivo: motivo || 'Ajuste de estoque',
            usuarioId,
          },
        });

        return novoEstoque;
      } else {
        throw new BadRequestException('Não é possível reduzir estoque inexistente');
      }
    }

    const novaQuantidade = Math.max(0, estoque.quantidade + quantidadeDelta);

    const estoqueAtualizado = await this.prisma.estoque.update({
      where: { id: estoque.id },
      data: {
        quantidade: novaQuantidade,
      },
      include: this.includeRelations,
    });

    // Registrar movimento
    await this.prisma.estoqueMovimento.create({
      data: {
        barbeariaId: estoque.barbeariaId,
        produtoId: estoque.produtoId,
        tipo: quantidadeDelta > 0 ? 'ENTRADA' : 'SAIDA',
        quantidade: Math.abs(quantidadeDelta),
        custoUnit: 0,
        custoTotal: 0,
        saldoAntes: estoque.quantidade,
        saldoDepois: novaQuantidade,
        motivo: motivo || 'Ajuste de estoque',
        usuarioId,
      },
    });

    // Emitir evento se estoque baixo
    if (novaQuantidade <= (estoque.alertaMin || 0)) {
      this.eventEmitter.emit(DomainEventType.ESTOQUE_BAIXO, {
        estoqueId: estoque.id,
        produtoId,
        barbeariaId,
        quantidadeAtual: novaQuantidade,
        alertaMin: estoque.alertaMin,
      });
    }

    return estoqueAtualizado;
  }

  async baixarEstoquePorVenda(vendaId: string, itens: Array<{ produtoId: string; quantidade: number }>) {
    const venda = await this.prisma.venda.findUnique({
      where: { id: vendaId },
      select: { barbeariaId: true },
    });

    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    for (const item of itens) {
      if (item.produtoId) {
        await this.ajustarQuantidade({
          produtoId: item.produtoId,
          barbeariaId: venda.barbeariaId,
          quantidadeDelta: -item.quantidade,
          motivo: `Baixa por venda ${vendaId}`,
          usuarioId: 'system', // TODO: pegar do contexto
        });
      }
    }
  }

  async getEstoqueBaixo(barbeariaId: string) {
    return this.prisma.estoque.findMany({
      where: {
        barbeariaId,
        quantidade: {
          lte: this.prisma.estoque.fields.alertaMin,
        },
      },
      include: this.includeRelations,
      orderBy: [
        { quantidade: 'asc' },
      ],
    });
  }

  async getResumoEstoque(barbeariaId: string) {
    const [totalProdutos, produtosBaixoEstoque, quantidadeTotalItens] = await Promise.all([
      this.prisma.estoque.count({
        where: { barbeariaId },
      }),
      this.prisma.estoque.count({
        where: {
          barbeariaId,
          quantidade: {
            lte: this.prisma.estoque.fields.alertaMin,
          },
        },
      }),
      this.prisma.estoque.aggregate({
        where: { barbeariaId },
        _sum: { quantidade: true },
      }),
    ]);

    return {
      totalProdutos,
      produtosBaixoEstoque,
      quantidadeTotalItens: quantidadeTotalItens._sum.quantidade || 0,
    };
  }
}