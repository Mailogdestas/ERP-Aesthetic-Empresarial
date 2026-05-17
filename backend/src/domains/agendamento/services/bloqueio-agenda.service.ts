import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { BloqueioAgenda, Prisma } from '@prisma/client';
import {
  CreateBloqueioAgendaDto,
  UpdateBloqueioAgendaDto,
  BloqueioAgendaResponseDto,
  BloqueioAgendaQueryDto,
} from '../dto/bloqueio-agenda.dto';

/**
 * 🚫 BLOQUEIO AGENDA SERVICE
 * 
 * Casos de Uso:
 * - Criar bloqueio de agenda (individual ou geral)
 * - Listar bloqueios com filtros
 * - Atualizar bloqueio existente
 * - Remover bloqueio
 * - Verificar conflitos com agendamentos
 */
@Injectable()
export class BloqueioAgendaService extends BaseService<BloqueioAgenda> {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'bloqueioAgenda');
  }

  private readonly include = {
    barbeiro: {
      select: {
        id: true,
        nome: true,
      },
    },
    barbearia: {
      select: {
        id: true,
        nome: true,
      },
    },
  };

  // ===== CASOS DE USO PRINCIPAIS =====

  /**
   * 🎯 UC - Criar Bloqueio de Agenda
   */
  async criarBloqueio(dto: CreateBloqueioAgendaDto): Promise<BloqueioAgendaResponseDto> {
    // Validar datas
    const dataInicio = new Date(dto.dataInicio);
    const dataFim = new Date(dto.dataFim);

    if (dataInicio >= dataFim) {
      throw new BadRequestException('Data de início deve ser anterior à data de fim');
    }

    if (dataInicio < new Date()) {
      throw new BadRequestException('Data de início não pode ser no passado');
    }

    // Validar se barbeiro existe (se informado)
    if (dto.barbeiroId) {
      const barbeiro = await this.prisma.barbeiro.findFirst({
        where: {
          id: dto.barbeiroId,
          barbeariaId: dto.barbeariaId,
          deletedAt: null,
        },
      });

      if (!barbeiro) {
        throw new NotFoundException('Barbeiro não encontrado');
      }
    }

    // Verificar conflitos com bloqueios existentes
    await this.verificarConflitoBloqueios(dto.barbeariaId, dto.barbeiroId, dataInicio, dataFim);

    // Verificar conflitos com agendamentos existentes
    await this.verificarConflitoAgendamentos(dto.barbeariaId, dto.barbeiroId, dataInicio, dataFim);

    // Criar bloqueio
    const bloqueio = await this.prisma.bloqueioAgenda.create({
      data: {
        barbeariaId: dto.barbeariaId,
        barbeiroId: dto.barbeiroId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        descricao: dto.descricao,
        dataInicio,
        dataFim,
        recorrente: dto.recorrente || false,
      },
      include: this.include,
    });

    return this.mapToResponse(bloqueio);
  }

  /**
   * 🔍 UC - Listar Bloqueios com Filtros
   */
  async listarBloqueios(
    barbeariaId: string,
    filters: BloqueioAgendaQueryDto = {},
  ): Promise<BloqueioAgendaResponseDto[]> {
    const where: Prisma.BloqueioAgendaWhereInput = {
      barbeariaId,
      deletedAt: null,
    };

    // Filtro por barbeiro
    if (filters.barbeiroId) {
      where.barbeiroId = filters.barbeiroId;
    }

    // Filtro por tipo
    if (filters.tipo) {
      where.tipo = filters.tipo;
    }

    // Filtro por período
    if (filters.dataInicio || filters.dataFim) {
      where.AND = [];

      if (filters.dataInicio) {
        where.AND.push({
          dataFim: {
            gte: new Date(filters.dataInicio),
          },
        });
      }

      if (filters.dataFim) {
        where.AND.push({
          dataInicio: {
            lte: new Date(filters.dataFim),
          },
        });
      }
    }

    // Filtro apenas ativos (padrão: true)
    if (filters.apenasAtivos !== false) {
      where.dataFim = {
        gte: new Date(),
      };
    }

    const bloqueios = await this.prisma.bloqueioAgenda.findMany({
      where,
      include: this.include,
      orderBy: [
        { dataInicio: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return bloqueios.map(this.mapToResponse);
  }

  /**
   * 📝 UC - Atualizar Bloqueio
   */
  async atualizarBloqueio(
    id: string,
    barbeariaId: string,
    dto: UpdateBloqueioAgendaDto,
  ): Promise<BloqueioAgendaResponseDto> {
    // Verificar se bloqueio existe
    const bloqueioExistente = await this.prisma.bloqueioAgenda.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null,
      },
    });

    if (!bloqueioExistente) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    // Validar datas se informadas
    let dataInicio = bloqueioExistente.dataInicio;
    let dataFim = bloqueioExistente.dataFim;

    if (dto.dataInicio) {
      dataInicio = new Date(dto.dataInicio);
    }

    if (dto.dataFim) {
      dataFim = new Date(dto.dataFim);
    }

    if (dataInicio >= dataFim) {
      throw new BadRequestException('Data de início deve ser anterior à data de fim');
    }

    // Verificar conflitos se as datas mudaram
    if (dto.dataInicio || dto.dataFim) {
      await this.verificarConflitoBloqueios(
        barbeariaId,
        bloqueioExistente.barbeiroId,
        dataInicio,
        dataFim,
        id, // Excluir o próprio bloqueio da verificação
      );

      await this.verificarConflitoAgendamentos(
        barbeariaId,
        bloqueioExistente.barbeiroId,
        dataInicio,
        dataFim,
      );
    }

    // Atualizar bloqueio
    const bloqueioAtualizado = await this.prisma.bloqueioAgenda.update({
      where: { id },
      data: {
        ...(dto.tipo && { tipo: dto.tipo }),
        ...(dto.titulo && { titulo: dto.titulo }),
        ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        ...(dto.dataInicio && { dataInicio }),
        ...(dto.dataFim && { dataFim }),
        ...(dto.recorrente !== undefined && { recorrente: dto.recorrente }),
      },
      include: this.include,
    });

    return this.mapToResponse(bloqueioAtualizado);
  }

  /**
   * 🗑️ UC - Remover Bloqueio
   */
  async removerBloqueio(id: string, barbeariaId: string): Promise<void> {
    const bloqueio = await this.prisma.bloqueioAgenda.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null,
      },
    });

    if (!bloqueio) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    await this.prisma.bloqueioAgenda.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 🔍 UC - Buscar Bloqueio por ID
   */
  async buscarPorId(id: string, barbeariaId: string): Promise<BloqueioAgendaResponseDto> {
    const bloqueio = await this.prisma.bloqueioAgenda.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null,
      },
      include: this.include,
    });

    if (!bloqueio) {
      throw new NotFoundException('Bloqueio não encontrado');
    }

    return this.mapToResponse(bloqueio);
  }

  /**
   * ⚡ UC - Verificar se Horário está Bloqueado
   * Usado pelo AgendamentoService para validar novos agendamentos
   */
  async verificarHorarioBloqueado(
    barbeariaId: string,
    barbeiroId: string,
    dataInicio: Date,
    dataFim: Date,
  ): Promise<boolean> {
    const bloqueios = await this.prisma.bloqueioAgenda.findMany({
      where: {
        barbeariaId,
        deletedAt: null,
        OR: [
          { barbeiroId: null }, // Bloqueios gerais
          { barbeiroId }, // Bloqueios específicos do barbeiro
        ],
        AND: [
          { dataInicio: { lte: dataFim } },
          { dataFim: { gte: dataInicio } },
        ],
      },
    });

    return bloqueios.length > 0;
  }

  // ===== MÉTODOS PRIVADOS =====

  private async verificarConflitoBloqueios(
    barbeariaId: string,
    barbeiroId: string | null,
    dataInicio: Date,
    dataFim: Date,
    excluirId?: string,
  ): Promise<void> {
    const where: Prisma.BloqueioAgendaWhereInput = {
      barbeariaId,
      deletedAt: null,
      ...(excluirId && { id: { not: excluirId } }),
      AND: [
        { dataInicio: { lte: dataFim } },
        { dataFim: { gte: dataInicio } },
      ],
    };

    // Verificar conflitos com bloqueios gerais ou do mesmo barbeiro
    if (barbeiroId) {
      where.OR = [
        { barbeiroId: null }, // Bloqueios gerais
        { barbeiroId }, // Bloqueios do mesmo barbeiro
      ];
    } else {
      // Se é um bloqueio geral, verificar todos os bloqueios
      where.OR = [
        { barbeiroId: null },
        { barbeiroId: { not: null } },
      ];
    }

    const conflitos = await this.prisma.bloqueioAgenda.findMany({ where });

    if (conflitos.length > 0) {
      throw new BadRequestException(
        `Conflito com bloqueio existente: ${conflitos[0].titulo}`,
      );
    }
  }

  private async verificarConflitoAgendamentos(
    barbeariaId: string,
    barbeiroId: string | null,
    dataInicio: Date,
    dataFim: Date,
  ): Promise<void> {
    const where: Prisma.AgendamentoWhereInput = {
      barbeariaId,
      deletedAt: null,
      status: {
        in: ['PENDENTE', 'CONFIRMADO', 'EM_ANDAMENTO'],
      },
      AND: [
        { inicio: { lte: dataFim } },
        { fim: { gte: dataInicio } },
      ],
    };

    if (barbeiroId) {
      where.barbeiroId = barbeiroId;
    }

    const agendamentos = await this.prisma.agendamento.findMany({
      where,
      select: { id: true, inicio: true, fim: true },
    });

    if (agendamentos.length > 0) {
      throw new BadRequestException(
        `Existem ${agendamentos.length} agendamento(s) conflitante(s) no período`,
      );
    }
  }

  private mapToResponse(bloqueio: any): BloqueioAgendaResponseDto {
    return {
      id: bloqueio.id,
      barbeariaId: bloqueio.barbeariaId,
      barbeiroId: bloqueio.barbeiroId,
      tipo: bloqueio.tipo,
      titulo: bloqueio.titulo,
      descricao: bloqueio.descricao,
      dataInicio: bloqueio.dataInicio,
      dataFim: bloqueio.dataFim,
      recorrente: bloqueio.recorrente,
      createdAt: bloqueio.createdAt,
      updatedAt: bloqueio.updatedAt,
      ...(bloqueio.barbeiro && { barbeiro: bloqueio.barbeiro }),
      ...(bloqueio.barbearia && { barbearia: bloqueio.barbearia }),
    };
  }
}