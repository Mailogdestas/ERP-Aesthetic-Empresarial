import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { VendaStatus } from '@prisma/client';
import { Role } from '../../../core/auth/role.enum';

export interface ComissaoCalculadaDto {
  barbeiroId: string;
  barbeiroNome: string;
  periodo: {
    inicio: Date;
    fim: Date;
  };
  vendas: Array<{
    vendaId: string;
    dataVenda: Date;
    valorTotal: number;
    itens: Array<{
      itemId: string;
      tipo: 'PRODUTO' | 'SERVICO';
      nome: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
      comissaoTipo: string | null;
      comissaoValor: number | null;
      comissaoCalculada: number | null;
    }>;
  }>;
  resumo: {
    totalVendas: number;
    valorTotalVendas: number;
    totalComissao: number;
    comissaoPorTipo: {
      servicos: number;
      produtos: number;
    };
  };
}

/**
 * 💰 COMISSAO SERVICE
 * 
 * Responsável por calcular comissões dos barbeiros
 * baseado nas vendas realizadas em um período
 */
@Injectable()
export class ComissaoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula comissão do barbeiro por período
   */
  async calcularComissaoPorPeriodo(
    barbeiroId: string,
    barbeariaId: string,
    dataInicio: Date,
    dataFim: Date,
  ): Promise<ComissaoCalculadaDto> {
    // Validar período
    if (dataInicio >= dataFim) {
      throw new BadRequestException('Data de início deve ser anterior à data de fim');
    }

    // Buscar barbeiro
    const barbeiro = await this.prisma.usuario.findFirst({
      where: {
        id: barbeiroId,
        barbeariaId,
        deletedAt: null,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!barbeiro) {
      throw new BadRequestException('Barbeiro não encontrado');
    }

    // Buscar vendas do barbeiro no período (apenas vendas pagas)
    const vendas = await this.prisma.venda.findMany({
      where: {
        barbeiroId,
        barbeariaId,
        status: VendaStatus.PAGA,
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
        deletedAt: null,
      },
      include: {
        itens: {
          include: {
            produto: {
              select: { nome: true },
            },
            servico: {
              select: { nome: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Processar vendas e calcular comissões
    const vendasProcessadas = vendas.map((venda) => {
      const itensProcessados = venda.itens.map((item) => {
        const nome = item.produtoNome || item.servicoNome || 
                    item.produto?.nome || item.servico?.nome || 'Item sem nome';
        
        const tipo = item.produtoId ? 'PRODUTO' : 'SERVICO';
        
        return {
          itemId: item.id,
          tipo: tipo as 'PRODUTO' | 'SERVICO',
          nome,
          quantidade: item.quantidade,
          valorUnitario: Number(item.precoUnit),
          valorTotal: Number(item.total),
          comissaoTipo: item.comissaoTipo,
          comissaoValor: item.comissaoValor ? Number(item.comissaoValor) : null,
          comissaoCalculada: item.comissaoCalculada ? Number(item.comissaoCalculada) : null,
        };
      });

      return {
        vendaId: venda.id,
        dataVenda: venda.createdAt,
        valorTotal: Number(venda.valorTotal),
        itens: itensProcessados,
      };
    });

    // Calcular resumo
    const totalVendas = vendas.length;
    const valorTotalVendas = vendas.reduce((sum, venda) => sum + Number(venda.valorTotal), 0);
    
    let totalComissao = 0;
    let comissaoServicos = 0;
    let comissaoProdutos = 0;

    vendasProcessadas.forEach((venda) => {
      venda.itens.forEach((item) => {
        const comissao = item.comissaoCalculada || 0;
        totalComissao += comissao;
        
        if (item.tipo === 'SERVICO') {
          comissaoServicos += comissao;
        } else {
          comissaoProdutos += comissao;
        }
      });
    });

    return {
      barbeiroId: barbeiro.id,
      barbeiroNome: barbeiro.nome,
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
      vendas: vendasProcessadas,
      resumo: {
        totalVendas,
        valorTotalVendas,
        totalComissao,
        comissaoPorTipo: {
          servicos: comissaoServicos,
          produtos: comissaoProdutos,
        },
      },
    };
  }

  /**
   * Lista barbeiros com comissões em um período
   */
  async listarComissoesPorPeriodo(
    barbeariaId: string,
    dataInicio: Date,
    dataFim: Date,
  ): Promise<Array<{
    barbeiroId: string;
    barbeiroNome: string;
    totalComissao: number;
    totalVendas: number;
  }>> {
    // Buscar todos os barbeiros da barbearia
    const barbeiros = await this.prisma.usuario.findMany({
      where: {
        barbeariaId,
        role: Role.BARBER,
        deletedAt: null,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    // Calcular comissão para cada barbeiro
    const resultados = await Promise.all(
      barbeiros.map(async (barbeiro) => {
        const comissao = await this.calcularComissaoPorPeriodo(
          barbeiro.id,
          barbeariaId,
          dataInicio,
          dataFim,
        );

        return {
          barbeiroId: barbeiro.id,
          barbeiroNome: barbeiro.nome,
          totalComissao: comissao.resumo.totalComissao,
          totalVendas: comissao.resumo.totalVendas,
        };
      }),
    );

    // Filtrar apenas barbeiros com vendas no período
    return resultados.filter((resultado) => resultado.totalVendas > 0);
  }
}
