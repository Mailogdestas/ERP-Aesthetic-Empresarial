import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ConflitosService } from './conflitos.service';
import { SlotLivreDto } from '../dto/agendamento.dto';

export interface SlotsLivresParams {
  data: Date;
  barbeiroId: string;
  servicoIds: string[];
  barbeariaId: string;
  intervaloMinutos?: number; // Default: 30 minutos
}

export interface SlotsLivresResult {
  data: string;
  barbeiroId: string;
  barbeiro: {
    id: string;
    nome: string;
  };
  duracaoTotalMinutos: number;
  slots: SlotLivreDto[];
  resumo: {
    totalSlots: number;
    slotsLivres: number;
    slotsOcupados: number;
    primeiroSlotLivre?: string;
    ultimoSlotLivre?: string;
  };
}

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflitosService: ConflitosService,
  ) {}

  /**
   * 🎯 PREMIUM: Buscar slots livres otimizado para calendário
   * - Calcula duração automática por serviços
   * - Gera slots inteligentes
   * - Otimizado para frontend (query única)
   */
  async buscarSlotsLivres(params: SlotsLivresParams): Promise<SlotsLivresResult> {
    const { data, barbeiroId, servicoIds, barbeariaId, intervaloMinutos = 30 } = params;

    // 1. Buscar informações do barbeiro
    const barbeiro = await this.prisma.barbeiro.findFirst({
      where: { 
        id: barbeiroId, 
        barbeariaId,
        deletedAt: null 
      },
      select: {
        id: true,
        nome: true,
      }
    });

    if (!barbeiro) {
      throw new Error('Barbeiro não encontrado');
    }

    // 2. Calcular duração total dos serviços
    const servicos = await this.prisma.servico.findMany({
      where: { 
        id: { in: servicoIds },
        barbeariaId,
        deletedAt: null 
      },
      select: {
        id: true,
        nome: true,
        duracaoMinutos: true,
      }
    });

    if (servicos.length !== servicoIds.length) {
      throw new Error('Um ou mais serviços não foram encontrados');
    }

    const duracaoTotalMinutos = servicos.reduce((total, servico) => total + servico.duracaoMinutos, 0);

    // 3. Buscar turno do barbeiro para o dia
    const diaSemana = data.getDay();
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
      return this.criarResultadoVazio(data, barbeiro, duracaoTotalMinutos, 'Barbeiro não trabalha neste dia');
    }

    // 4. Gerar slots dentro do turno
    const slots = await this.gerarSlots({
      data,
      barbeiroId,
      barbeariaId,
      turno,
      duracaoTotalMinutos,
      intervaloMinutos,
    });

    // 5. Calcular resumo
    const resumo = this.calcularResumo(slots);

    return {
      data: data.toISOString().split('T')[0],
      barbeiroId,
      barbeiro,
      duracaoTotalMinutos,
      slots,
      resumo,
    };
  }

  /**
   * 🎯 PREMIUM: Buscar slots para múltiplos barbeiros (visão geral)
   */
  async buscarSlotsMultiplosBarbeiros(
    data: Date,
    servicoIds: string[],
    barbeariaId: string,
    barbeiroIds?: string[]
  ): Promise<SlotsLivresResult[]> {
    // Buscar barbeiros ativos
    const whereClause: any = {
      barbeariaId,
      ativo: true,
      deletedAt: null,
    };

    if (barbeiroIds && barbeiroIds.length > 0) {
      whereClause.id = { in: barbeiroIds };
    }

    const barbeiros = await this.prisma.barbeiro.findMany({
      where: whereClause,
      select: {
        id: true,
        nome: true,
      },
      orderBy: { nome: 'asc' }
    });

    // Buscar slots para cada barbeiro em paralelo
    const resultados = await Promise.all(
      barbeiros.map(barbeiro =>
        this.buscarSlotsLivres({
          data,
          barbeiroId: barbeiro.id,
          servicoIds,
          barbeariaId,
        }).catch(error => {
          console.error(`Erro ao buscar slots para barbeiro ${barbeiro.id}:`, error);
          return this.criarResultadoVazio(data, barbeiro, 0, 'Erro ao carregar slots');
        })
      )
    );

    return resultados;
  }

  /**
   * 🎯 PREMIUM: Buscar próximos slots livres (para sugestões rápidas)
   */
  async buscarProximosSlotsLivres(
    servicoIds: string[],
    barbeariaId: string,
    barbeiroId?: string,
    diasAFrente = 7
  ): Promise<Array<{
    data: string;
    barbeiroId: string;
    barbeiro: string;
    primeiroSlot?: string;
    totalSlotsLivres: number;
  }>> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const resultados = [];

    for (let i = 0; i < diasAFrente; i++) {
      const dataAtual = new Date(hoje);
      dataAtual.setDate(hoje.getDate() + i);

      if (barbeiroId) {
        // Buscar para barbeiro específico
        try {
          const slots = await this.buscarSlotsLivres({
            data: dataAtual,
            barbeiroId,
            servicoIds,
            barbeariaId,
          });

          const primeiroSlotLivre = slots.slots.find(s => s.disponivel);

          resultados.push({
            data: slots.data,
            barbeiroId: slots.barbeiroId,
            barbeiro: slots.barbeiro.nome,
            primeiroSlot: primeiroSlotLivre?.horaInicio,
            totalSlotsLivres: slots.resumo.slotsLivres,
          });
        } catch (error) {
          // Ignorar erros e continuar
        }
      } else {
        // Buscar para todos os barbeiros
        try {
          const slotsMultiplos = await this.buscarSlotsMultiplosBarbeiros(
            dataAtual,
            servicoIds,
            barbeariaId
          );

          slotsMultiplos.forEach(slots => {
            const primeiroSlotLivre = slots.slots.find(s => s.disponivel);

            resultados.push({
              data: slots.data,
              barbeiroId: slots.barbeiroId,
              barbeiro: slots.barbeiro.nome,
              primeiroSlot: primeiroSlotLivre?.horaInicio,
              totalSlotsLivres: slots.resumo.slotsLivres,
            });
          });
        } catch (error) {
          // Ignorar erros e continuar
        }
      }
    }

    return resultados.filter(r => r.totalSlotsLivres > 0);
  }

  // ===== MÉTODOS AUXILIARES =====

  private async gerarSlots(params: {
    data: Date;
    barbeiroId: string;
    barbeariaId: string;
    turno: any;
    duracaoTotalMinutos: number;
    intervaloMinutos: number;
  }): Promise<SlotLivreDto[]> {
    const { data, barbeiroId, barbeariaId, turno, duracaoTotalMinutos, intervaloMinutos } = params;

    const slots: SlotLivreDto[] = [];

    // Converter horários do turno
    const [horaInicio, minutoInicio] = turno.horaInicio.split(':').map(Number);
    const [horaFim, minutoFim] = turno.horaFim.split(':').map(Number);

    let horaAtual = new Date(data);
    horaAtual.setHours(horaInicio, minutoInicio, 0, 0);

    const fimTurno = new Date(data);
    fimTurno.setHours(horaFim, minutoFim, 0, 0);

    // Se a data é hoje, começar do horário atual se for posterior
    const agora = new Date();
    if (data.toDateString() === agora.toDateString() && agora > horaAtual) {
      // Arredondar para o próximo intervalo
      const minutosAtual = agora.getMinutes();
      const proximoIntervalo = Math.ceil(minutosAtual / intervaloMinutos) * intervaloMinutos;
      
      horaAtual = new Date(agora);
      horaAtual.setMinutes(proximoIntervalo, 0, 0);
      
      // Se passou da hora, ir para a próxima hora
      if (proximoIntervalo >= 60) {
        horaAtual.setHours(horaAtual.getHours() + 1, 0, 0, 0);
      }
    }

    // Gerar slots
    while (horaAtual.getTime() + duracaoTotalMinutos * 60000 <= fimTurno.getTime()) {
      const fimSlot = new Date(horaAtual.getTime() + duracaoTotalMinutos * 60000);

      // Verificar disponibilidade
      const conflitos = await this.conflitosService.verificarConflitos({
        barbeiroId,
        dataHoraInicio: horaAtual,
        dataHoraFim: fimSlot,
        barbeariaId,
      });

      slots.push({
        horaInicio: this.formatarHora(horaAtual),
        horaFim: this.formatarHora(fimSlot),
        duracaoMinutos: duracaoTotalMinutos,
        disponivel: !conflitos.temConflito,
        motivo: conflitos.temConflito ? conflitos.conflitos[0]?.descricao : undefined,
      });

      // Próximo slot
      horaAtual = new Date(horaAtual.getTime() + intervaloMinutos * 60000);
    }

    return slots;
  }

  private calcularResumo(slots: SlotLivreDto[]) {
    const slotsLivres = slots.filter(s => s.disponivel);
    const slotsOcupados = slots.filter(s => !s.disponivel);

    return {
      totalSlots: slots.length,
      slotsLivres: slotsLivres.length,
      slotsOcupados: slotsOcupados.length,
      primeiroSlotLivre: slotsLivres[0]?.horaInicio,
      ultimoSlotLivre: slotsLivres[slotsLivres.length - 1]?.horaInicio,
    };
  }

  private criarResultadoVazio(
    data: Date,
    barbeiro: { id: string; nome: string },
    duracaoTotalMinutos: number,
    motivo: string
  ): SlotsLivresResult {
    return {
      data: data.toISOString().split('T')[0],
      barbeiroId: barbeiro.id,
      barbeiro,
      duracaoTotalMinutos,
      slots: [{
        horaInicio: '00:00',
        horaFim: '00:00',
        duracaoMinutos: 0,
        disponivel: false,
        motivo,
      }],
      resumo: {
        totalSlots: 0,
        slotsLivres: 0,
        slotsOcupados: 0,
      },
    };
  }

  private formatarHora(data: Date): string {
    return data.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  }
}
