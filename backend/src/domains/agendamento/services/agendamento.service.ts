import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import {
  AgendamentoStatus,
  TipoRecorrencia,
  Prisma,
  Agendamento
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventType } from '../../../shared/events/domain-events';
import { CreateAgendamentoDto, UpdateAgendamentoDto } from '../dto/agendamento.dto';

@Injectable()
export class AgendamentoService extends BaseService<Agendamento> {
  constructor(
    protected prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {
    super(prisma, 'agendamento');
  }

  private include = {
    cliente: { select: { id: true, nome: true, telefone: true } },
    barbeiro: { select: { id: true, nome: true } },
    servico: { select: { id: true, nome: true, duracaoMin: true, preco: true } }, // Corrigido: duracaoMin em vez de duracaoMinutos
  };

  // ============================================================
  // 📌 Sobrescrever método create do BaseService
  // ============================================================
  async create(data: CreateAgendamentoDto, usuarioId?: string) {
    // Mapear dataHora para inicio e calcular fim baseado na duração dos serviços
    const servicos = await this.prisma.servico.findMany({
      where: { id: { in: data.servicoIds } }
    });

    if (servicos.length !== data.servicoIds.length) {
      throw new BadRequestException('Serviços inválidos');
    }

    const duracaoMinTotal = servicos.reduce((sum, s) => sum + (s.duracaoMin ?? 0), 0);
    const inicio = new Date(data.dataHora);
    const fim = new Date(inicio.getTime() + duracaoMinTotal * 60000);

    // Obter barbeariaId do usuário
    let barbeariaId: string;
    if (usuarioId) {
      barbeariaId = await this.getBarbeariaIdFromUser(usuarioId);
    } else {
      throw new BadRequestException('Usuário não identificado');
    }

    const agendamentoData = {
      clienteId: data.clienteId,
      barbeiroId: data.barbeiroId,
      servicoId: data.servicoIds[0], // Usar o primeiro serviço como principal
      barbeariaId,
      inicio,
      fim,
      observacoes: data.observacoes,
      recorrencia: data.recorrencia,
      status: AgendamentoStatus.PENDENTE,
      createdByUsuarioId: usuarioId,
      updatedByUsuarioId: usuarioId,
    };

    return this.prisma.agendamento.create({
      data: agendamentoData,
      include: this.include,
    });
  }

  // Helper para obter barbeariaId do usuário
  private async getBarbeariaIdFromUser(usuarioId: string): Promise<string> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { barbeariaId: true }
    });
    
    if (!usuario?.barbeariaId) {
      throw new BadRequestException('Usuário não possui barbearia associada');
    }
    
    return usuario.barbeariaId;
  }

  // ============================================================
  // 📌 Sobrescrever método findMany do BaseService
  // ============================================================
  async findMany(where: any = {}, includeParam?: any): Promise<Agendamento[]> {
    return this.prisma.agendamento.findMany({
      where: {
        ...where,
        deletedAt: null, // Soft delete check
      },
      include: includeParam || this.include,
    });
  }

  // ============================================================
  // 📌 Criar Agendamento
  // ============================================================
  async criarAgendamento(data: CreateAgendamentoDto, barbeariaId: string) {
    return this.prisma.$transaction(async (tx) => {
      const servicos = await tx.servico.findMany({
        where: { id: { in: data.servicoIds }, barbeariaId }
      });

      if (servicos.length !== data.servicoIds.length) {
        throw new BadRequestException('Serviço inválido para esta barbearia');
      }

      const duracaoMinTotal = servicos.reduce((sum, s) => sum + (s.duracaoMin ?? 0), 0);
      const inicio = new Date(data.dataHora);
      const fim = new Date(inicio.getTime() + duracaoMinTotal * 60000);

      const agendamento = await tx.agendamento.create({
        data: {
          clienteId: data.clienteId,
          barbeiroId: data.barbeiroId,
          barbeariaId,
          servicoId: data.servicoIds[0],
          inicio,
          fim,
          status: AgendamentoStatus.PENDENTE,
        },
        include: this.include,
      });

      // Se tiver recorrência → gerar clones
      if (data.recorrencia && data.quantidadeRecorrencias && data.quantidadeRecorrencias > 0) {
        await this.criarRecorrencias(agendamento, data.recorrencia, data.quantidadeRecorrencias, tx);
      }

      return this.formatResponse(agendamento);
    });
  }

  // ============================================================
  // 🔁 Criar Recorrências
  // ============================================================
  private async criarRecorrencias(
    base: any,
    tipo: TipoRecorrencia,
    quantidade: number,
    tx: Prisma.TransactionClient
  ) {
    const eventos = [];
    const duracao = base.fim.getTime() - base.inicio.getTime();
    let inicio = new Date(base.inicio);

    for (let i = 1; i <= quantidade; i++) {
      switch (tipo) {
        case 'SEMANAL': inicio.setDate(inicio.getDate() + 7); break;
        case 'QUINZENAL': inicio.setDate(inicio.getDate() + 14); break;
        case 'MENSAL': inicio.setMonth(inicio.getMonth() + 1); break;
      }

      eventos.push({
        clienteId: base.clienteId,
        barbeiroId: base.barbeiroId,
        barbeariaId: base.barbeariaId,
        servicoId: base.servicoId,
        inicio: new Date(inicio),
        fim: new Date(inicio.getTime() + duracao),
        status: AgendamentoStatus.PENDENTE,
        observacoes: `${base.observacoes || ''} [RECORRÊNCIA]`.trim(),
        recorrencia: tipo,
      });
    }

    if (eventos.length > 0) {
      await tx.agendamento.createMany({ data: eventos });
    }
  }

  // ============================================================
  // ✅ Confirmar / Iniciar / Finalizar / Cancelar
  // ============================================================
  async confirmar(id: string) {
    const ag = await this.updateStatus(id, AgendamentoStatus.CONFIRMADO);

    this.eventEmitter.emit(DomainEventType.AGENDAMENTO_CONFIRMADO, {
      agendamentoId: id,
      clienteId: ag.clienteId,
      barbeiroId: ag.barbeiroId,
      dataHora: ag.inicio,
    });

    return this.formatResponse(ag);
  }

  async iniciar(id: string) {
    const ag = await this.findOrFail(id);

    if (ag.status !== AgendamentoStatus.CONFIRMADO) {
      throw new BadRequestException('Só é possível iniciar agendamentos confirmados');
    }

    const atualizado = await this.updateStatus(id, AgendamentoStatus.EM_ANDAMENTO);

    this.eventEmitter.emit(DomainEventType.AGENDAMENTO_INICIADO, {
      agendamentoId: id,
      clienteId: atualizado.clienteId,
      barbeiroId: atualizado.barbeiroId,
      servicoIds: [atualizado.servicoId],
      dataHoraInicio: atualizado.inicio,
    });

    return this.formatResponse(atualizado);
  }

  async finalizar(id: string) {
    const ag = await this.findOrFail(id);

    if (ag.status !== AgendamentoStatus.EM_ANDAMENTO) {
      throw new BadRequestException('Só é possível finalizar atendimentos em andamento');
    }

    const atualizado = await this.updateStatus(id, AgendamentoStatus.CONCLUIDO);

    this.eventEmitter.emit(DomainEventType.ATENDIMENTO_CONCLUIDO, {
      agendamentoId: id,
      clienteId: atualizado.clienteId,
      barbeiroId: atualizado.barbeiroId,
      servicoIds: [atualizado.servicoId],
      dataHoraInicio: atualizado.inicio,
      dataHoraFim: atualizado.fim,
      observacoes: atualizado.observacoes,
    });

    return this.formatResponse(atualizado);
  }

  async cancelar(id: string, motivo?: string, noShow = false) {
    const status = noShow ? AgendamentoStatus.NO_SHOW : AgendamentoStatus.CANCELADO;
    const atualizado = await this.updateStatus(id, status, motivo);

    this.eventEmitter.emit(DomainEventType.AGENDAMENTO_CANCELADO, {
      agendamentoId: id,
      motivo,
      isNoShow: noShow,
    });

    return this.formatResponse(atualizado);
  }

  // ============================================================
  // 🔍 Helpers
  // ============================================================
  private async findOrFail(id: string) {
    const ag = await this.prisma.agendamento.findUnique({ where: { id }, include: this.include });
    if (!ag) throw new NotFoundException('Agendamento não encontrado');
    return ag;
  }

  private updateStatus(id: string, status: AgendamentoStatus, motivo?: string) {
    return this.prisma.agendamento.update({
      where: { id },
      data: { status, observacoes: motivo ? `${motivo}` : undefined },
      include: this.include,
    });
  }

  private formatResponse(ag: any) {
    const duracao = Math.round((ag.fim.getTime() - ag.inicio.getTime()) / 60000);
    return {
      id: ag.id,
      clienteId: ag.clienteId,
      barbeiroId: ag.barbeiroId,
      servicoId: ag.servicoId,
      dataHora: ag.inicio,
      duracaoMinutos: duracao,
      status: ag.status,
      observacoes: ag.observacoes ?? '',
      recorrencia: ag.recorrencia ?? null,
      cliente: ag.cliente,
      barbeiro: ag.barbeiro,
      servicos: ag.servico ? [ag.servico] : [],
      createdAt: ag.createdAt,
      updatedAt: ag.updatedAt,
    };
  }

  // ============================================================
  // 📌 Métodos adicionais para o Controller
  // ============================================================
  async confirmarAgendamento(id: string, barbeariaId: string) {
    const ag = await this.findOrFail(id);
    
    if (ag.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return this.confirmar(id);
  }

  async iniciarAtendimento(id: string, barbeariaId: string) {
    const ag = await this.findOrFail(id);
    
    if (ag.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return this.iniciar(id);
  }

  async finalizarAtendimento(id: string, barbeariaId: string) {
    const ag = await this.findOrFail(id);
    
    if (ag.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return this.finalizar(id);
  }

  async cancelarAgendamento(id: string, barbeariaId: string, motivo?: string, isNoShow = false) {
    const ag = await this.findOrFail(id);
    
    if (ag.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return this.cancelar(id, motivo, isNoShow);
  }

  async listarAgendamentos(barbeariaId: string, filtros: any = {}) {
    const where: any = {
      barbeariaId,
      deletedAt: null,
    };

    if (filtros.dataInicio && filtros.dataFim) {
      where.inicio = {
        gte: filtros.dataInicio,
        lte: filtros.dataFim,
      };
    }

    if (filtros.barbeiroId) {
      where.barbeiroId = filtros.barbeiroId;
    }

    if (filtros.clienteId) {
      where.clienteId = filtros.clienteId;
    }

    if (filtros.status) {
      where.status = filtros.status;
    }

    const agendamentos = await this.prisma.agendamento.findMany({
      where,
      include: this.include,
      orderBy: { inicio: 'asc' },
    });

    return agendamentos.map(ag => this.formatResponse(ag));
  }

  async buscarPorId(id: string, barbeariaId: string) {
    const ag = await this.prisma.agendamento.findFirst({
      where: { 
        id, 
        barbeariaId,
        deletedAt: null 
      },
      include: this.include,
    });

    if (!ag) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return this.formatResponse(ag);
  }

  async update(id: string, data: UpdateAgendamentoDto, usuarioId?: string): Promise<Agendamento> {
    const updateData: any = {};

    if (data.dataHora) {
      updateData.dataHora = new Date(data.dataHora);
    }

    if (data.observacoes !== undefined) {
      updateData.observacoes = data.observacoes;
    }

    if (data.servicoIds && data.servicoIds.length > 0) {
      updateData.servicoId = data.servicoIds[0];
    }

    // Usar o método update da classe base que retorna Promise<T>
    return super.update(id, updateData, usuarioId);
  }
}
