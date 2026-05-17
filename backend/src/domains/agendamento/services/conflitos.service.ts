import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AgendamentoStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface VerificarConflitosParams {
  barbeiroId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  barbeariaId: string;
  agendamentoIdExcluir?: string; // Para updates
}

export interface ConflitosResult {
  temConflito: boolean;
  conflitos: Array<{
    tipo: 'AGENDAMENTO' | 'BLOQUEIO' | 'TURNO';
    descricao: string;
    dataHora: Date;
    agendamentoId?: string;
  }>;
  sugestoes: Array<{
    horaInicio: string;
    horaFim: string;
    duracaoMinutos: number;
    disponivel: boolean;
    motivo?: string;
  }>;
}

@Injectable()
export class ConflitosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 🎯 PREMIUM: Detecção automática de conflitos de horário
   * Verifica:
   * 1. Conflitos com outros agendamentos
   * 2. Conflitos com bloqueios de agenda
   * 3. Conflitos com turnos do barbeiro
   */
  async verificarConflitos(
    params: VerificarConflitosParams, 
    tx?: Prisma.TransactionClient
  ): Promise<ConflitosResult> {
    const prismaClient = tx || this.prisma;
    const conflitos: ConflitosResult['conflitos'] = [];

    // 1. Verificar conflitos com agendamentos existentes
    const agendamentosConflitantes = await this.verificarConflitosAgendamentos(params, prismaClient);
    conflitos.push(...agendamentosConflitantes);

    // 2. Verificar conflitos com bloqueios de agenda
    const bloqueiosConflitantes = await this.verificarConflitosBloqueios(params, prismaClient);
    conflitos.push(...bloqueiosConflitantes);

    // 3. Verificar se está dentro do turno do barbeiro
    const conflitosTurno = await this.verificarConflitosTurno(params, prismaClient);
    conflitos.push(...conflitosTurno);

    // 4. Gerar sugestões se houver conflitos
    const sugestoes = conflitos.length > 0 
      ? await this.gerarSugestoes(params, prismaClient)
      : [];

    return {
      temConflito: conflitos.length > 0,
      conflitos,
      sugestoes,
    };
  }

  /**
   * Verificar conflitos com outros agendamentos
   */
  private async verificarConflitosAgendamentos(
    params: VerificarConflitosParams,
    prismaClient: PrismaService | Prisma.TransactionClient
  ): Promise<ConflitosResult['conflitos']> {
    const { barbeiroId, dataHoraInicio, dataHoraFim, barbeariaId, agendamentoIdExcluir } = params;

    const agendamentosConflitantes = await prismaClient.agendamento.findMany({
      where: {
        barbeiroId,
        barbeariaId,
        deletedAt: null,
        ...(agendamentoIdExcluir && { id: { not: agendamentoIdExcluir } }),
        status: {
          in: [
            AgendamentoStatus.PENDENTE,
            AgendamentoStatus.CONFIRMADO,
            AgendamentoStatus.EM_ANDAMENTO,
          ]
        },
        OR: [
          // Novo agendamento inicia durante um existente
          {
            AND: [
              { inicio: { lte: dataHoraInicio } },
              { fim: { gte: dataHoraInicio } }
            ]
          },
          // Novo agendamento termina durante um existente
          {
            AND: [
              { inicio: { lte: dataHoraFim } },
              { fim: { gte: dataHoraFim } }
            ]
          },
          // Novo agendamento engloba um existente
          {
            AND: [
              { inicio: { gte: dataHoraInicio } },
              { fim: { lte: dataHoraFim } }
            ]
          }
        ]
      },
      include: {
        cliente: { select: { nome: true } }
      }
    });

    return agendamentosConflitantes
      .filter(agendamento => {
        // Verificar sobreposição real
        return !(
          dataHoraFim <= agendamento.inicio || 
          dataHoraInicio >= agendamento.fim
        );
      })
      .map(agendamento => ({
        tipo: 'AGENDAMENTO' as const,
        descricao: `Conflito com agendamento de ${agendamento.cliente.nome} às ${this.formatarHora(agendamento.inicio)}`,
        dataHora: agendamento.inicio,
        agendamentoId: agendamento.id,
      }));
  }

  /**
   * Verificar conflitos com bloqueios de agenda
   */
  private async verificarConflitosBloqueios(
    params: VerificarConflitosParams,
    prismaClient: PrismaService | Prisma.TransactionClient
  ): Promise<ConflitosResult['conflitos']> {
    const { barbeiroId, dataHoraInicio, dataHoraFim, barbeariaId } = params;

    const bloqueiosConflitantes = await prismaClient.bloqueioAgenda.findMany({
      where: {
        barbeariaId,
        deletedAt: null,
        // Verificar bloqueios gerais (barbeiroId null) ou específicos do barbeiro
        OR: [
          { barbeiroId: null }, // Bloqueios gerais
          { barbeiroId }, // Bloqueios específicos do barbeiro
        ],
        AND: [
          // Verificar sobreposição de horários
          { dataInicio: { lte: dataHoraFim } },
          { dataFim: { gte: dataHoraInicio } },
        ],
      },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        dataInicio: true,
        dataFim: true,
        tipo: true,
        barbeiroId: true,
      },
    });

    return bloqueiosConflitantes.map(bloqueio => ({
      tipo: 'BLOQUEIO' as const,
      descricao: `Conflito com bloqueio: ${bloqueio.titulo} ${bloqueio.barbeiroId ? '(Barbeiro específico)' : '(Geral)'} (${this.formatarHora(bloqueio.dataInicio)} - ${this.formatarHora(bloqueio.dataFim)})`,
      dataHora: bloqueio.dataInicio,
    }));
  }

  /**
   * Verificar se está dentro do turno do barbeiro
   */
  private async verificarConflitosTurno(
    params: VerificarConflitosParams,
    prismaClient: PrismaService | Prisma.TransactionClient
  ): Promise<ConflitosResult['conflitos']> {
    const { barbeiroId, dataHoraInicio, dataHoraFim, barbeariaId } = params;

    const diaSemana = dataHoraInicio.getDay();
    
    const turno = await prismaClient.turno.findFirst({
      where: {
        barbeiroId,
        barbeariaId,
        diaSemana,
        ativo: true,
        deletedAt: null,
      }
    });

    if (!turno) {
      return [{
        tipo: 'TURNO',
        descricao: `Barbeiro não trabalha neste dia da semana`,
        dataHora: dataHoraInicio,
      }];
    }

    // Converter horários do turno para Date do mesmo dia
    const [horaInicioTurno, minutoInicioTurno] = turno.horaInicio.split(':').map(Number);
    const [horaFimTurno, minutoFimTurno] = turno.horaFim.split(':').map(Number);

    const inicioTurno = new Date(dataHoraInicio);
    inicioTurno.setHours(horaInicioTurno, minutoInicioTurno, 0, 0);

    const fimTurno = new Date(dataHoraInicio);
    fimTurno.setHours(horaFimTurno, minutoFimTurno, 0, 0);

    const conflitos: ConflitosResult['conflitos'] = [];

    if (dataHoraInicio < inicioTurno) {
      conflitos.push({
        tipo: 'TURNO',
        descricao: `Agendamento inicia antes do turno do barbeiro (${turno.horaInicio})`,
        dataHora: dataHoraInicio,
      });
    }

    if (dataHoraFim > fimTurno) {
      conflitos.push({
        tipo: 'TURNO',
        descricao: `Agendamento termina após o turno do barbeiro (${turno.horaFim})`,
        dataHora: dataHoraInicio,
      });
    }

    return conflitos;
  }

  /**
   * 🎯 PREMIUM: Gerar sugestões de horários alternativos
   */
  private async gerarSugestoes(
    params: VerificarConflitosParams,
    prismaClient: PrismaService | Prisma.TransactionClient
  ): Promise<ConflitosResult['sugestoes']> {
    const { barbeiroId, dataHoraInicio, barbeariaId } = params;
    const duracaoMinutos = Math.floor((params.dataHoraFim.getTime() - params.dataHoraInicio.getTime()) / 60000);

    // Buscar slots livres no mesmo dia
    const iniciodia = new Date(dataHoraInicio);
    iniciodia.setHours(0, 0, 0, 0);

    const fimDia = new Date(dataHoraInicio);
    fimDia.setHours(23, 59, 59, 999);

    // Buscar turno do barbeiro para o dia
    const diaSemana = dataHoraInicio.getDay();
    const turno = await this.prisma.turno.findFirst({
      where: {
        barbeiroId,
        barbeariaId,
        diaSemana,
        ativo: true,
        deletedAt: null,
      }
    });

    if (!turno) {
      return [];
    }

    // Gerar slots de 30 em 30 minutos dentro do turno
    const sugestoes: ConflitosResult['sugestoes'] = [];
    const [horaInicio, minutoInicio] = turno.horaInicio.split(':').map(Number);
    const [horaFim, minutoFim] = turno.horaFim.split(':').map(Number);

    let horaAtual = new Date(dataHoraInicio);
    horaAtual.setHours(horaInicio, minutoInicio, 0, 0);

    const fimTurno = new Date(dataHoraInicio);
    fimTurno.setHours(horaFim, minutoFim, 0, 0);

    while (horaAtual.getTime() + duracaoMinutos * 60000 <= fimTurno.getTime()) {
      const fimSlot = new Date(horaAtual.getTime() + duracaoMinutos * 60000);

      // Verificar se este slot está livre
      const conflitosSlot = await this.verificarConflitos({
        barbeiroId,
        dataHoraInicio: horaAtual,
        dataHoraFim: fimSlot,
        barbeariaId,
        agendamentoIdExcluir: params.agendamentoIdExcluir,
      });

      sugestoes.push({
        horaInicio: this.formatarHora(horaAtual),
        horaFim: this.formatarHora(fimSlot),
        duracaoMinutos,
        disponivel: !conflitosSlot.temConflito,
        motivo: conflitosSlot.temConflito ? conflitosSlot.conflitos[0]?.descricao : undefined,
      });

      // Próximo slot (30 minutos)
      horaAtual = new Date(horaAtual.getTime() + 30 * 60000);
    }

    // Retornar apenas os 5 primeiros slots livres
    return sugestoes.filter(s => s.disponivel).slice(0, 5);
  }

  /**
   * Buscar duração máxima de serviços para otimizar queries
   */
  private getMaxDuracaoMinutos(): number {
    return 240; // 4 horas - assumindo que nenhum serviço dura mais que isso
  }

  /**
   * Formatar hora para exibição
   */
  private formatarHora(data: Date): string {
    return data.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  }
}
