import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  CreatePacoteConsumoDto,
  UpdatePacoteConsumoDto,
  PacoteConsumoResponseDto,
  QueryPacoteConsumoDto,
  ConsumirPacoteDto,
} from '../dto/pacote-consumo.dto';

@Injectable()
export class PacoteConsumoService {
  constructor(private readonly prisma: PrismaService) {}

  async consumirPacote(dto: ConsumirPacoteDto, barbeariaId: string): Promise<PacoteConsumoResponseDto> {
    // Validar se o pacote existe e está ativo
    const pacote = await this.prisma.pacote.findFirst({
      where: {
        id: dto.pacoteId,
        barbeariaId,
        ativo: true,
        deletedAt: null,
      },
    });

    if (!pacote) {
      throw new NotFoundException('Pacote não encontrado ou inativo');
    }

    // Validar se o cliente existe
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: dto.clienteId,
        barbeariaId,
        deletedAt: null,
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Validar se o serviço existe e está incluído no pacote
    const servico = await this.prisma.servico.findFirst({
      where: {
        id: dto.servicoId,
        barbeariaId,
        deletedAt: null,
      },
    });

    if (!servico) {
      throw new NotFoundException('Serviço não encontrado');
    }

    // Verificar se o serviço está incluído no pacote
    const itens = pacote.itens as any[];
    const itemPacote = itens.find(item => item.servicoId === dto.servicoId);

    if (!itemPacote) {
      throw new BadRequestException('Serviço não está incluído neste pacote');
    }

    // Verificar quantos serviços já foram consumidos
    const consumosExistentes = await this.prisma.pacoteConsumo.aggregate({
      where: {
        pacoteId: dto.pacoteId,
        clienteId: dto.clienteId,
        servicoId: dto.servicoId,
        deletedAt: null,
      },
      _sum: {
        quantidade: true,
      },
    });

    const quantidadeJaConsumida = consumosExistentes._sum.quantidade || 0;
    const quantidadeDisponivel = itemPacote.quantidade - quantidadeJaConsumida;
    const quantidadeAConsumir = dto.quantidade || 1;

    if (quantidadeAConsumir > quantidadeDisponivel) {
      throw new BadRequestException(
        `Quantidade insuficiente. Disponível: ${quantidadeDisponivel}, Solicitado: ${quantidadeAConsumir}`
      );
    }

    // Criar o consumo
    const consumo = await this.prisma.pacoteConsumo.create({
      data: {
        pacoteId: dto.pacoteId,
        clienteId: dto.clienteId,
        servicoId: dto.servicoId,
        barbeariaId,
        vendaId: dto.vendaId,
        quantidade: quantidadeAConsumir,
        valorUnit: itemPacote.valorUnitario,
      },
      include: {
        pacote: {
          select: { id: true, nome: true, valor: true },
        },
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        servico: {
          select: { id: true, nome: true, preco: true },
        },
        venda: {
          select: { id: true, valorTotal: true, status: true },
        },
      },
    });

    return this.formatPacoteConsumoResponse(consumo);
  }

  async criarConsumo(dto: CreatePacoteConsumoDto): Promise<PacoteConsumoResponseDto> {
    const consumo = await this.prisma.pacoteConsumo.create({
      data: {
        pacoteId: dto.pacoteId,
        clienteId: dto.clienteId,
        servicoId: dto.servicoId,
        barbeariaId: dto.barbeariaId,
        vendaId: dto.vendaId,
        quantidade: dto.quantidade || 1,
        valorUnit: dto.valorUnit,
      },
      include: {
        pacote: {
          select: { id: true, nome: true, valor: true },
        },
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        servico: {
          select: { id: true, nome: true, preco: true },
        },
        venda: {
          select: { id: true, valorTotal: true, status: true },
        },
      },
    });

    return this.formatPacoteConsumoResponse(consumo);
  }

  async listarConsumos(
    barbeariaId: string,
    query: QueryPacoteConsumoDto
  ): Promise<{ consumos: PacoteConsumoResponseDto[]; total: number }> {
    const { page = 1, limit = 20, pacoteId, clienteId, servicoId, vendaId, dataInicio, dataFim } = query;
    const skip = (page - 1) * limit;

    const where = {
      barbeariaId,
      deletedAt: null,
      ...(pacoteId && { pacoteId }),
      ...(clienteId && { clienteId }),
      ...(servicoId && { servicoId }),
      ...(vendaId && { vendaId }),
      ...(dataInicio || dataFim) && {
        createdAt: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      },
    };

    const [consumos, total] = await Promise.all([
      this.prisma.pacoteConsumo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pacote: {
            select: { id: true, nome: true, valor: true },
          },
          cliente: {
            select: { id: true, nome: true, telefone: true },
          },
          servico: {
            select: { id: true, nome: true, preco: true },
          },
          venda: {
            select: { id: true, valorTotal: true, status: true },
          },
        },
      }),
      this.prisma.pacoteConsumo.count({ where }),
    ]);

    return {
      consumos: consumos.map(consumo => this.formatPacoteConsumoResponse(consumo)),
      total,
    };
  }

  async buscarConsumo(id: string, barbeariaId: string): Promise<PacoteConsumoResponseDto> {
    const consumo = await this.prisma.pacoteConsumo.findFirst({
      where: {
        id,
        barbeariaId,
        deletedAt: null,
      },
      include: {
        pacote: {
          select: { id: true, nome: true, valor: true },
        },
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        servico: {
          select: { id: true, nome: true, preco: true },
        },
        venda: {
          select: { id: true, valorTotal: true, status: true },
        },
      },
    });

    if (!consumo) {
      throw new NotFoundException('Consumo não encontrado');
    }

    return this.formatPacoteConsumoResponse(consumo);
  }

  async atualizarConsumo(
    id: string,
    barbeariaId: string,
    dto: UpdatePacoteConsumoDto
  ): Promise<PacoteConsumoResponseDto> {
    const consumoExistente = await this.buscarConsumo(id, barbeariaId);

    const consumo = await this.prisma.pacoteConsumo.update({
      where: { id },
      data: {
        ...(dto.quantidade && { quantidade: dto.quantidade }),
        ...(dto.valorUnit && { valorUnit: dto.valorUnit }),
        ...(dto.vendaId && { vendaId: dto.vendaId }),
      },
      include: {
        pacote: {
          select: { id: true, nome: true, valor: true },
        },
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        servico: {
          select: { id: true, nome: true, preco: true },
        },
        venda: {
          select: { id: true, valorTotal: true, status: true },
        },
      },
    });

    return this.formatPacoteConsumoResponse(consumo);
  }

  async removerConsumo(id: string, barbeariaId: string): Promise<void> {
    const consumo = await this.buscarConsumo(id, barbeariaId);

    await this.prisma.pacoteConsumo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async obterSaldoPacoteCliente(pacoteId: string, clienteId: string, barbeariaId: string) {
    // Buscar o pacote
    const pacote = await this.prisma.pacote.findFirst({
      where: {
        id: pacoteId,
        barbeariaId,
        deletedAt: null,
      },
    });

    if (!pacote) {
      throw new NotFoundException('Pacote não encontrado');
    }

    const itens = pacote.itens as any[];
    const saldos = [];

    for (const item of itens) {
      // Calcular quanto já foi consumido
      const consumido = await this.prisma.pacoteConsumo.aggregate({
        where: {
          pacoteId,
          clienteId,
          servicoId: item.servicoId,
          deletedAt: null,
        },
        _sum: {
          quantidade: true,
        },
      });

      const quantidadeConsumida = consumido._sum.quantidade || 0;
      const saldoDisponivel = item.quantidade - quantidadeConsumida;

      // Buscar dados do serviço
      const servico = await this.prisma.servico.findUnique({
        where: { id: item.servicoId },
        select: { nome: true, preco: true },
      });

      saldos.push({
        servicoId: item.servicoId,
        servicoNome: servico?.nome || 'Serviço não encontrado',
        quantidadeTotal: item.quantidade,
        quantidadeConsumida,
        saldoDisponivel,
        valorUnitario: item.valorUnitario,
      });
    }

    return {
      pacoteId,
      pacoteNome: pacote.nome,
      clienteId,
      saldos,
    };
  }

  async obterEstatisticasConsumo(barbeariaId: string) {
    const [totalConsumos, valorTotalConsumido, consumosHoje] = await Promise.all([
      this.prisma.pacoteConsumo.count({
        where: { barbeariaId, deletedAt: null },
      }),
      this.prisma.pacoteConsumo.aggregate({
        where: { barbeariaId, deletedAt: null },
        _sum: {
          valorUnit: true,
        },
      }),
      this.prisma.pacoteConsumo.count({
        where: {
          barbeariaId,
          deletedAt: null,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      totalConsumos,
      valorTotalConsumido: valorTotalConsumido._sum.valorUnit || 0,
      consumosHoje,
    };
  }

  private formatPacoteConsumoResponse(consumo: any): PacoteConsumoResponseDto {
    return {
      id: consumo.id,
      pacoteId: consumo.pacoteId,
      pacote: consumo.pacote,
      clienteId: consumo.clienteId,
      cliente: consumo.cliente,
      servicoId: consumo.servicoId,
      servico: consumo.servico,
      vendaId: consumo.vendaId,
      venda: consumo.venda,
      barbeariaId: consumo.barbeariaId,
      quantidade: consumo.quantidade,
      valorUnit: Number(consumo.valorUnit),
      createdAt: consumo.createdAt,
      updatedAt: consumo.updatedAt,
    };
  }

  async obterSaldoPacotesCliente(clienteId: string, barbeariaId: string) {
    // Buscar todos os pacotes ativos da barbearia
    const pacotes = await this.prisma.pacote.findMany({
      where: {
        barbeariaId,
        ativo: true,
        deletedAt: null,
      },
    });

    // Para cada pacote, calcular o saldo do cliente
    const saldos = await Promise.all(
      pacotes.map(async (pacote) => {
        const saldo = await this.obterSaldoPacoteCliente(pacote.id, clienteId, barbeariaId);
        return saldo;
      })
    );

    // Filtrar apenas pacotes que têm saldo disponível
    return saldos.filter(saldo => 
      saldo.saldos.some(item => item.saldoDisponivel > 0)
    );
  }
}