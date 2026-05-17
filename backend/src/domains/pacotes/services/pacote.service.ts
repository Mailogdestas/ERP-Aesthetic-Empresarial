import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  CreatePacoteDto,
  UpdatePacoteDto,
  PacoteResponseDto,
  QueryPacoteDto,
  ItemPacoteDto,
} from '../dto/pacote.dto';

@Injectable()
export class PacoteService {
  constructor(private readonly prisma: PrismaService) {}

  async criarPacote(dto: CreatePacoteDto): Promise<PacoteResponseDto> {
    // Validar se os serviços existem
    const servicosIds = dto.itens.map(item => item.servicoId);
    const servicos = await this.prisma.servico.findMany({
      where: {
        id: { in: servicosIds },
        barbeariaId: dto.barbeariaId,
        deletedAt: null,
      },
    });

    if (servicos.length !== servicosIds.length) {
      throw new BadRequestException('Um ou mais serviços não foram encontrados');
    }

    // Validar se o valor do pacote é menor que a soma dos valores individuais
    const valorTotalServicos = dto.itens.reduce((total, item) => {
      return total + (item.valorUnitario * item.quantidade);
    }, 0);

    if (dto.valor >= valorTotalServicos) {
      throw new BadRequestException('O valor do pacote deve ser menor que a soma dos valores individuais dos serviços');
    }

    const pacote = await this.prisma.pacote.create({
      data: {
        nome: dto.nome,
        valor: dto.valor,
        itens: dto.itens as any,
        ativo: dto.ativo ?? true,
        barbeariaId: dto.barbeariaId,
        createdByUsuarioId: dto.createdByUsuarioId,
      },
      include: {
        barbearia: {
          select: { nome: true },
        },
        createdByUsuario: {
          select: { nome: true },
        },
        updatedByUsuario: {
          select: { nome: true },
        },
      },
    });

    return this.formatPacoteResponse(pacote);
  }

  async listarPacotes(
    barbeariaId: string,
    query: QueryPacoteDto
  ): Promise<{ pacotes: PacoteResponseDto[]; total: number }> {
    const { page = 1, limit = 20, ativo, nome } = query;
    const skip = (page - 1) * limit;

    const where = {
      barbeariaId,
      deletedAt: null,
      ...(ativo !== undefined && { ativo }),
      ...(nome && {
        nome: { contains: nome, mode: 'insensitive' as const }
      }),
    };

    const [pacotes, total] = await Promise.all([
      this.prisma.pacote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          barbearia: {
            select: { nome: true },
          },
          createdByUsuario: {
            select: { nome: true },
          },
          updatedByUsuario: {
            select: { nome: true },
          },
        },
      }),
      this.prisma.pacote.count({ where }),
    ]);

    return {
      pacotes: pacotes.map(pacote => this.formatPacoteResponse(pacote)),
      total,
    };
  }

  async buscarPacote(id: string, barbeariaId: string): Promise<PacoteResponseDto> {
    const pacote = await this.prisma.pacote.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null,
      },
      include: {
        barbearia: {
          select: { nome: true },
        },
        createdByUsuario: {
          select: { nome: true },
        },
        updatedByUsuario: {
          select: { nome: true },
        },
      },
    });

    if (!pacote) {
      throw new NotFoundException('Pacote não encontrado');
    }

    return this.formatPacoteResponse(pacote);
  }

  async atualizarPacote(
    id: string,
    barbeariaId: string,
    dto: UpdatePacoteDto
  ): Promise<PacoteResponseDto> {
    const pacoteExistente = await this.buscarPacote(id, barbeariaId);

    // Se estiver atualizando os itens, validar os serviços
    if (dto.itens) {
      const servicosIds = dto.itens.map(item => item.servicoId);
      const servicos = await this.prisma.servico.findMany({
        where: {
          id: { in: servicosIds },
          barbeariaId,
          deletedAt: null,
        },
      });

      if (servicos.length !== servicosIds.length) {
        throw new BadRequestException('Um ou mais serviços não foram encontrados');
      }

      // Validar valor do pacote
      if (dto.valor) {
        const valorTotalServicos = dto.itens.reduce((total, item) => {
          return total + (item.valorUnitario * item.quantidade);
        }, 0);

        if (dto.valor >= valorTotalServicos) {
          throw new BadRequestException('O valor do pacote deve ser menor que a soma dos valores individuais dos serviços');
        }
      }
    }

    const pacote = await this.prisma.pacote.update({
      where: { id },
      data: {
        ...(dto.nome && { nome: dto.nome }),
        ...(dto.valor && { valor: dto.valor }),
        ...(dto.itens && { itens: dto.itens as any }),
        ...(dto.ativo !== undefined && { ativo: dto.ativo }),
        updatedByUsuarioId: dto.updatedByUsuarioId,
      },
      include: {
        barbearia: {
          select: { nome: true },
        },
        createdByUsuario: {
          select: { nome: true },
        },
        updatedByUsuario: {
          select: { nome: true },
        },
      },
    });

    return this.formatPacoteResponse(pacote);
  }

  async removerPacote(id: string, barbeariaId: string): Promise<void> {
    const pacote = await this.buscarPacote(id, barbeariaId);

    // Verificar se há consumos ativos deste pacote
    const consumosAtivos = await this.prisma.pacoteConsumo.count({
      where: {
        pacoteId: id,
        deletedAt: null,
      },
    });

    if (consumosAtivos > 0) {
      throw new BadRequestException('Não é possível remover um pacote que possui consumos registrados');
    }

    await this.prisma.pacote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async ativarDesativarPacote(
    id: string,
    barbeariaId: string,
    ativo: boolean,
    usuarioId?: string
  ): Promise<PacoteResponseDto> {
    const pacote = await this.buscarPacote(id, barbeariaId);

    const pacoteAtualizado = await this.prisma.pacote.update({
      where: { id },
      data: {
        ativo,
        updatedByUsuarioId: usuarioId,
      },
      include: {
        barbearia: {
          select: { nome: true },
        },
        createdByUsuario: {
          select: { nome: true },
        },
        updatedByUsuario: {
          select: { nome: true },
        },
      },
    });

    return this.formatPacoteResponse(pacoteAtualizado);
  }

  async ativarPacote(id: string, barbeariaId: string, usuarioId?: string): Promise<PacoteResponseDto> {
    return this.ativarDesativarPacote(id, barbeariaId, true, usuarioId);
  }

  async desativarPacote(id: string, barbeariaId: string, usuarioId?: string): Promise<PacoteResponseDto> {
    return this.ativarDesativarPacote(id, barbeariaId, false, usuarioId);
  }

  async duplicarPacote(
    id: string,
    barbeariaId: string,
    usuarioId?: string
  ): Promise<PacoteResponseDto> {
    const pacoteOriginal = await this.buscarPacote(id, barbeariaId);

    const pacoteDuplicado = await this.prisma.pacote.create({
      data: {
        nome: `${pacoteOriginal.nome} (Cópia)`,
        valor: pacoteOriginal.valor,
        itens: pacoteOriginal.itens as any,
        ativo: false, // Duplicatas começam inativas
        barbeariaId,
        createdByUsuarioId: usuarioId,
      },
      include: {
        barbearia: {
          select: { nome: true },
        },
        createdByUsuario: {
          select: { nome: true },
        },
        updatedByUsuario: {
          select: { nome: true },
        },
      },
    });

    return this.formatPacoteResponse(pacoteDuplicado);
  }

  async obterEstatisticasPacotes(barbeariaId: string) {
    const [totalPacotes, pacotesAtivos, totalConsumos] = await Promise.all([
      this.prisma.pacote.count({
        where: { barbeariaId, deletedAt: null },
      }),
      this.prisma.pacote.count({
        where: { barbeariaId, deletedAt: null, ativo: true },
      }),
      this.prisma.pacoteConsumo.count({
        where: { barbeariaId, deletedAt: null },
      }),
    ]);

    return {
      totalPacotes,
      pacotesAtivos,
      pacotesInativos: totalPacotes - pacotesAtivos,
      totalConsumos,
    };
  }

  private formatPacoteResponse(pacote: any): PacoteResponseDto {
    return {
      id: pacote.id,
      nome: pacote.nome,
      valor: pacote.valor,
      itens: pacote.itens as ItemPacoteDto[],
      ativo: pacote.ativo,
      barbeariaId: pacote.barbeariaId,
      barbearia: pacote.barbearia,
      createdAt: pacote.createdAt,
      updatedAt: pacote.updatedAt,
      createdByUsuario: pacote.createdByUsuario,
      updatedByUsuario: pacote.updatedByUsuario,
    };
  }
}