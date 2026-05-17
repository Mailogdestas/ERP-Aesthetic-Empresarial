import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CaixaSessao,
  CaixaMovimento,
  FechamentoDiario,
  TipoMovimento,
  ModoCaixa,
  Prisma,
} from '@prisma/client';
import { 
  AbrirCaixaDto, 
  FecharCaixaDto, 
  MovimentoManualDto, 
  FiltroCaixaDto,
  MovimentosSessaoResponseDto 
} from '../dto';

/**
 * 💰 CAIXA SERVICE
 * 
 * Casos de Uso:
 * - Abrir Caixa (criar sessão)
 * - Fechar Caixa (finalizar sessão + conferência)
 * - Registrar Movimento Manual
 * - Registrar Entrada por Venda (automático)
 * - Consultar Sessões e Movimentos
 * - Calcular Saldos e Totais
 */

@Injectable()
export class CaixaService extends BaseService<CaixaSessao> {
  constructor(
    protected prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    super(prisma, 'caixaSessao');
  }

  private includeCompleto = {
    barbeiro: { select: { id: true, nome: true } },
    operador: { select: { id: true, nome: true, email: true } },
    openedByUser: { select: { id: true, nome: true } },
    closedByUser: { select: { id: true, nome: true } },
    movimentos: {
      include: {
        venda: { select: { id: true, valorTotal: true } },
        pagamento: { select: { id: true, valor: true, metodo: true } },
      },
    },
  };

  private includeParaCriacao = {
    barbeiro: { select: { id: true, nome: true } },
    operador: { select: { id: true, nome: true, email: true } },
    openedByUser: { select: { id: true, nome: true } },
    movimentos: {
      include: {
        venda: { select: { id: true, valorTotal: true } },
        pagamento: { select: { id: true, valor: true, metodo: true } },
      },
    },
  };

  /**
   * Abre uma nova sessão de caixa
   */
  async abrirCaixa(dto: AbrirCaixaDto, usuarioId: string): Promise<CaixaSessao> {
    // Debug log para investigar o problema
    console.log('🔍 DEBUG abrirCaixa - DTO recebido:', JSON.stringify(dto, null, 2));
    console.log('🔍 DEBUG abrirCaixa - usuarioId:', usuarioId);

    // Garantir que barbeariaId está presente (controller já validou)
    if (!dto.barbeariaId) {
      throw new BadRequestException('ID da barbearia é obrigatório');
    }

    // Verificar se já existe sessão aberta
    await this.verificarSessaoAberta(dto.barbeariaId, dto.barbeiroId, dto.operadorId);

    // Buscar configuração da barbearia
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id: dto.barbeariaId },
      select: { modoCaixa: true }
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada');
    }

    // Validar campos obrigatórios conforme modo do caixa
    this.validarModoAbertura(barbearia.modoCaixa, dto);

    const sessao = await this.prisma.caixaSessao.create({
      data: {
        barbeariaId: dto.barbeariaId,
        barbeiroId: dto.barbeiroId,
        operadorId: dto.operadorId,
        openedByUserId: usuarioId,
        valorAbertura: dto.valorAbertura || 0,
      },
      include: this.includeParaCriacao,
    });

    // Emitir evento de abertura
    this.eventEmitter.emit('caixa.sessao.aberta', {
      sessaoId: sessao.id,
      barbeariaId: sessao.barbeariaId,
      barbeiroId: sessao.barbeiroId,
      operadorId: sessao.operadorId,
      valorAbertura: sessao.valorAbertura,
    });

    return sessao;
  }

  /**
   * Registra movimento manual no caixa
   */
  async registrarMovimentoManual(dto: MovimentoManualDto, usuarioId: string): Promise<CaixaMovimento> {
    const sessao = await this.prisma.caixaSessao.findUnique({
      where: { id: dto.sessaoId },
    });

    if (!sessao) {
      throw new NotFoundException('Sessão de caixa não encontrada');
    }

    if (sessao.closedAt !== null) {
      throw new BadRequestException('Não é possível registrar movimento em sessão fechada');
    }

    // Validação de saldo negativo para saídas
    if (dto.tipo === TipoMovimento.SAIDA) {
      const totais = await this.calcularTotaisSessao(dto.sessaoId);
      const saldoAposSaida = totais.saldoAtual.minus(dto.valor);
      
      if (saldoAposSaida.lt(0)) {
        throw new BadRequestException(
          `Operação resultaria em saldo negativo. Saldo atual: R$ ${totais.saldoAtual.toFixed(2)}, Valor da saída: R$ ${dto.valor}`
        );
      }
    }

    // Validação de valor mínimo
    if (Number(dto.valor) <= 0) {
      throw new BadRequestException('Valor do movimento deve ser maior que zero');
    }

    // Validação de valor máximo para movimentos manuais
    if (Number(dto.valor) > 10000) {
      throw new BadRequestException('Valor do movimento excede o limite máximo de R$ 10.000,00');
    }

    const movimento = await this.prisma.caixaMovimento.create({
      data: {
        sessaoId: dto.sessaoId,
        barbeariaId: sessao.barbeariaId,
        tipo: dto.tipo,
        valor: dto.valor,
        descricao: dto.descricao,
        metodo: dto.metodo,
        origem: dto.origem || 'MANUAL',
      },
      include: {
        sessao: { select: { id: true } },
        venda: { select: { id: true, valorTotal: true } },
        pagamento: { select: { id: true, valor: true } },
      },
    });

    // Emitir evento de movimento
    this.eventEmitter.emit('caixa.movimento.registrado', {
      movimentoId: movimento.id,
      sessaoId: movimento.sessaoId,
      tipo: movimento.tipo,
      valor: movimento.valor,
      origem: movimento.origem,
    });

    return movimento;
  }

  /**
   * Registra entrada automática por venda paga
   */
  async registrarEntradaVenda(vendaId: string, pagamentoId: string, valor: any, metodo: any): Promise<CaixaMovimento> {
    // Buscar sessão ativa para a venda
    const venda = await this.prisma.venda.findUnique({
      where: { id: vendaId },
      include: { barbearia: { select: { modoCaixa: true } } },
    });

    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    const sessaoAtiva = await this.buscarSessaoAtiva(venda.barbeariaId, venda.barbeiroId);

    if (!sessaoAtiva) {
      // Se não há sessão ativa, não registra movimento
      return null;
    }

    const movimento = await this.prisma.caixaMovimento.create({
      data: {
        sessaoId: sessaoAtiva.id,
        barbeariaId: venda.barbeariaId,
        vendaId: vendaId,
        pagamentoId: pagamentoId,
        tipo: TipoMovimento.ENTRADA,
        valor: valor,
        metodo: metodo,
        descricao: `Venda #${venda.id.slice(-8)}`,
        origem: 'AUTOMATICO',
      },
    });

    return movimento;
  }

  /**
   * Lista sessões com filtros
   */
  async listarSessoes(filtro: FiltroCaixaDto): Promise<CaixaSessao[]> {
    const where: Prisma.CaixaSessaoWhereInput = {
      barbeariaId: filtro.barbeariaId,
    };

    if (filtro.barbeiroId) {
      where.barbeiroId = filtro.barbeiroId;
    }

    if (filtro.operadorId) {
      where.operadorId = filtro.operadorId;
    }

    if (filtro.status) {
      if (filtro.status === 'ABERTA') {
        where.closedAt = null;
      } else if (filtro.status === 'FECHADA') {
        where.closedAt = { not: null };
      }
    }

    if (filtro.dataInicial || filtro.dataFinal) {
      where.openedAt = {};
      if (filtro.dataInicial) {
        where.openedAt.gte = new Date(filtro.dataInicial);
      }
      if (filtro.dataFinal) {
        where.openedAt.lte = new Date(filtro.dataFinal);
      }
    }

    return this.prisma.caixaSessao.findMany({
      where,
      include: this.includeCompleto,
      orderBy: { openedAt: 'desc' },
    });
  }

  /**
   * Lista movimentos com filtros
   */
  async listarMovimentos(filtro: FiltroCaixaDto): Promise<CaixaMovimento[]> {
    const where: Prisma.CaixaMovimentoWhereInput = {
      barbeariaId: filtro.barbeariaId,
    };

    if (filtro.tipoMovimento) {
      where.tipo = filtro.tipoMovimento;
    }

    if (filtro.metodoPagamento) {
      where.metodo = filtro.metodoPagamento;
    }

    if (filtro.termoBusca) {
      where.descricao = {
        contains: filtro.termoBusca,
        mode: 'insensitive',
      };
    }

    if (filtro.dataInicial || filtro.dataFinal) {
      where.createdAt = {};
      if (filtro.dataInicial) {
        where.createdAt.gte = new Date(filtro.dataInicial);
      }
      if (filtro.dataFinal) {
        where.createdAt.lte = new Date(filtro.dataFinal);
      }
    }

    return this.prisma.caixaMovimento.findMany({
      where,
      include: {
        sessao: { select: { id: true } },
        venda: { select: { id: true, valorTotal: true } },
        pagamento: { select: { id: true, valor: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista movimentos de uma sessão específica
   */
  async listarMovimentosPorSessao(sessaoId: string): Promise<MovimentosSessaoResponseDto> {
    // Verificar se a sessão existe
    const sessao = await this.prisma.caixaSessao.findUnique({
      where: { id: sessaoId },
      select: { 
        id: true, 
        barbeariaId: true,
        openedAt: true,
        closedAt: true,
        valorAbertura: true
      }
    });

    if (!sessao) {
      throw new NotFoundException('Sessão de caixa não encontrada');
    }

    const movimentos = await this.prisma.caixaMovimento.findMany({
      where: {
        sessaoId: sessaoId,
      },
      include: {
        venda: { 
          select: { 
            id: true, 
            valorTotal: true,
            status: true 
          } 
        },
        pagamento: { 
          select: { 
            id: true, 
            valor: true,
            metodo: true 
          } 
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular resumo financeiro
    const totalEntradas = movimentos
      .filter(m => m.tipo === TipoMovimento.ENTRADA)
      .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

    const totalSaidas = movimentos
      .filter(m => m.tipo === TipoMovimento.SAIDA)
      .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

    const saldoAtual = new Prisma.Decimal(sessao.valorAbertura).plus(totalEntradas).minus(totalSaidas);

    // Formatar resposta
    return {
      sessao: {
        id: sessao.id,
        openedAt: sessao.openedAt,
        closedAt: sessao.closedAt,
        valorAbertura: sessao.valorAbertura.toString(),
      },
      movimentos: movimentos.map(movimento => ({
        id: movimento.id,
        tipo: movimento.tipo,
        valor: movimento.valor.toString(),
        descricao: movimento.descricao,
        metodo: movimento.metodo,
        origem: movimento.origem,
        createdAt: movimento.createdAt,
        venda: movimento.venda ? {
          id: movimento.venda.id,
          valorTotal: Number(movimento.venda.valorTotal),
          status: movimento.venda.status,
        } : undefined,
        pagamento: movimento.pagamento ? {
          id: movimento.pagamento.id,
          valor: Number(movimento.pagamento.valor),
          metodoPagamento: movimento.pagamento.metodo,
        } : undefined,
      })),
      resumo: {
        totalEntradas: totalEntradas.toString(),
        totalSaidas: totalSaidas.toString(),
        saldoAtual: saldoAtual.toString(),
        quantidadeMovimentos: movimentos.length,
      },
    };
  }

  /**
   * Busca sessão ativa conforme modo do caixa
   */
  async buscarSessaoAtiva(barbeariaId: string, barbeiroId?: string): Promise<CaixaSessao | null> {
    // Validação defensiva
    if (!barbeariaId) {
      throw new BadRequestException('ID da barbearia é obrigatório');
    }

    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id: barbeariaId },
      select: { modoCaixa: true }
    });

    const where: Prisma.CaixaSessaoWhereInput = {
      barbeariaId,
      closedAt: null, // Sessão aberta não tem data de fechamento
    };

    if (barbearia?.modoCaixa === ModoCaixa.POR_BARBEIRO && barbeiroId) {
      where.barbeiroId = barbeiroId;
    }

    return this.prisma.caixaSessao.findFirst({ where });
  }

  /**
   * Verifica se já existe sessão aberta
   */
  private async verificarSessaoAberta(barbeariaId: string, barbeiroId?: string, operadorId?: string): Promise<void> {
    const sessaoExistente = await this.buscarSessaoAtiva(barbeariaId, barbeiroId);

    if (sessaoExistente) {
      throw new ConflictException('Já existe uma sessão de caixa aberta');
    }
  }

  /**
   * Valida campos obrigatórios conforme modo do caixa
   */
  private validarModoAbertura(modoCaixa: ModoCaixa, dto: AbrirCaixaDto): void {
    if (modoCaixa === ModoCaixa.POR_BARBEIRO && !dto.barbeiroId) {
      throw new BadRequestException('ID do barbeiro é obrigatório para modo POR_BARBEIRO');
    }

    if (modoCaixa === ModoCaixa.POR_OPERADOR && !dto.operadorId) {
      throw new BadRequestException('ID do operador é obrigatório para modo POR_OPERADOR');
    }
  }

  /**
   * Calcula totais de uma sessão
   */
  private async calcularTotaisSessao(sessaoId: string) {
    const movimentos = await this.prisma.caixaMovimento.findMany({
      where: { sessaoId },
    });

    const sessao = await this.prisma.caixaSessao.findUnique({
      where: { id: sessaoId },
      select: { valorAbertura: true },
    });

    const totalEntradas = movimentos
      .filter(m => m.tipo === TipoMovimento.ENTRADA)
      .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

    const totalSaidas = movimentos
      .filter(m => m.tipo === TipoMovimento.SAIDA)
      .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

    return {
      valorAbertura: sessao?.valorAbertura || new Prisma.Decimal(0),
      totalEntradas,
      totalSaidas,
      saldoAtual: (sessao?.valorAbertura || new Prisma.Decimal(0)).plus(totalEntradas).minus(totalSaidas),
      quantidadeMovimentos: movimentos.length,
    };
  }

  /**
   * Busca sessão por ID
   */
  async buscarSessaoPorId(id: string): Promise<CaixaSessao> {
    const sessao = await this.prisma.caixaSessao.findUnique({
      where: { id },
      include: this.includeCompleto,
    });

    if (!sessao) {
      throw new NotFoundException('Sessão de caixa não encontrada');
    }

    return sessao;
  }

  /**
   * Gera relatório de fechamento de uma sessão
   */
  async gerarRelatorioFechamento(sessaoId: string): Promise<any> {
    const sessao = await this.buscarSessaoPorId(sessaoId);
    
    if (!sessao.closedAt) {
      throw new BadRequestException('Sessão ainda não foi fechada');
    }

    const totais = await this.calcularTotaisSessao(sessaoId);
    
    return {
      sessao,
      totais,
      resumo: {
        valorAbertura: sessao.valorAbertura,
        valorFechamento: sessao.valorFechamento,
        diferenca: sessao.diferenca,
        totalMovimentos: totais.quantidadeMovimentos,
      },
    };
  }

  /**
   * Calcula totais consolidados do caixa por barbearia
   */
  async calcularTotais(barbeariaId: string, filtros?: FiltroCaixaDto): Promise<any> {
    const whereClause: any = {
      barbeariaId,
    };

    // Aplicar filtros se fornecidos
    if (filtros?.dataInicial) {
      whereClause.openedAt = { gte: new Date(filtros.dataInicial) };
    }
    if (filtros?.dataFinal) {
      whereClause.openedAt = { ...whereClause.openedAt, lte: new Date(filtros.dataFinal) };
    }
    if (filtros?.barbeiroId) {
      whereClause.barbeiroId = filtros.barbeiroId;
    }

    const sessoes = await this.prisma.caixaSessao.findMany({
      where: whereClause,
      include: {
        movimentos: true,
      },
    });

    const totais = {
      totalSessoes: sessoes.length,
      totalEntradas: 0,
      totalSaidas: 0,
      saldoTotal: 0,
      sessoesAbertas: 0,
      sessoesFechadas: 0,
    };

    for (const sessao of sessoes) {
      if (!sessao.closedAt) {
        totais.sessoesAbertas++;
      } else {
        totais.sessoesFechadas++;
      }

      const totaisSessao = await this.calcularTotaisSessao(sessao.id);
      totais.totalEntradas += Number(totaisSessao.totalEntradas);
      totais.totalSaidas += Number(totaisSessao.totalSaidas);
      totais.saldoTotal += Number(totaisSessao.saldoAtual);
    }

    return totais;
  }

  /**
   * Calcula comissão baseada no tipo configurado
   */
  async calcularComissao(sessaoId: string, barbeiroId?: string): Promise<any> {
    const sessao = await this.buscarSessaoPorId(sessaoId);
    
    // Buscar configuração de comissão da barbearia através de TabelaComissao
    const tabelaComissao = await this.prisma.tabelaComissao.findFirst({
      where: {
        barbeariaId: sessao.barbeariaId,
        barbeiroId: barbeiroId || sessao.barbeiroId,
        ativo: true,
      },
    });

    if (!tabelaComissao) {
      // Se não há configuração específica, usar configuração padrão
      return {
        barbeiroId: barbeiroId || sessao.barbeiroId,
        sessaoId,
        tipoComissao: 'PERCENTUAL',
        comissaoTotal: 0,
        quantidadeVendas: 0,
        detalhes: [],
      };
    }

    const barbeiro = barbeiroId || sessao.barbeiroId;

    if (!barbeiro) {
      throw new BadRequestException('Barbeiro não identificado para cálculo de comissão');
    }

    // Buscar vendas da sessão para o barbeiro
    const vendas = await this.prisma.venda.findMany({
      where: {
        barbeariaId: sessao.barbeariaId,
        barbeiroId: barbeiro,
        createdAt: {
          gte: sessao.openedAt,
          lte: sessao.closedAt || new Date(),
        },
        status: 'FINALIZADA',
      },
      include: {
        itens: {
          include: {
            servico: true,
            produto: true,
          },
        },
        pagamentos: {
          where: { status: 'APROVADO' },
        },
      },
    });

    // Filtrar apenas vendas pagas
    const vendasPagas = vendas.filter(venda => 
      venda.pagamentos.some(p => p.status === 'APROVADO')
    );

    let comissaoTotal = 0;
    const detalhesComissao = [];

    for (const venda of vendasPagas) {
      let comissaoVenda = 0;

      switch (tabelaComissao.tipo) {
        case 'PERCENTUAL':
          // Comissão percentual fixa sobre serviços
          const valorServicos = venda.itens
            .filter(item => item.servico)
            .reduce((sum, item) => sum + Number(item.precoUnit) * item.quantidade, 0);
          
          comissaoVenda = valorServicos * (Number(tabelaComissao.percentual) / 100);
          break;

        case 'VALOR_FIXO':
          // Valor fixo por venda
          comissaoVenda = Number(tabelaComissao.valorFixo || 0);
          break;

        case 'ESCALONADA':
          // Comissão escalonada por metas (implementação básica)
          const valorTotalVenda = Number(venda.valorTotal);
          if (valorTotalVenda >= 100) {
            comissaoVenda = valorTotalVenda * 0.15; // 15% para vendas acima de R$ 100
          } else if (valorTotalVenda >= 50) {
            comissaoVenda = valorTotalVenda * 0.10; // 10% para vendas entre R$ 50-100
          } else {
            comissaoVenda = valorTotalVenda * 0.05; // 5% para vendas abaixo de R$ 50
          }
          break;

        default:
          throw new BadRequestException(`Tipo de comissão não suportado: ${tabelaComissao.tipo}`);
      }

      comissaoTotal += comissaoVenda;
      detalhesComissao.push({
        vendaId: venda.id,
        valorVenda: venda.valorTotal,
        comissao: comissaoVenda,
        tipo: tabelaComissao.tipo,
        percentual: tabelaComissao.percentual,
      });
    }

    return {
      barbeiroId: barbeiro,
      sessaoId,
      tipoComissao: tabelaComissao.tipo,
      comissaoTotal,
      quantidadeVendas: vendasPagas.length,
      detalhes: detalhesComissao,
    };
  }

  /**
   * Registra comissão no sistema financeiro
   */
  async registrarComissao(sessaoId: string, barbeiroId: string): Promise<any> {
    const comissao = await this.calcularComissao(sessaoId, barbeiroId);
    
    if (comissao.comissaoTotal <= 0) {
      throw new BadRequestException('Não há comissão a ser registrada');
    }

    // Verificar se já foi registrada
    const comissaoExistente = await this.prisma.comissao.findFirst({
      where: {
        barbeiroId,
        // Buscar por período da sessão ao invés de sessaoId
        calculadoEm: {
          gte: (await this.buscarSessaoPorId(sessaoId)).openedAt,
          lte: (await this.buscarSessaoPorId(sessaoId)).closedAt || new Date(),
        },
      },
    });

    if (comissaoExistente) {
      throw new ConflictException('Comissão já foi registrada para esta sessão');
    }

    // Registrar comissão
    const novaComissao = await this.prisma.comissao.create({
      data: {
        barbeariaId: (await this.buscarSessaoPorId(sessaoId)).barbeariaId,
        barbeiroId,
        valor: comissao.comissaoTotal,
        percentual: comissao.tipoComissao === 'PERCENTUAL' ? Number(comissao.detalhes[0]?.percentual || 0) : 0,
      },
    });

    // Emitir evento de comissão calculada
    this.eventEmitter.emit('caixa.comissao.calculada', {
      comissaoId: novaComissao.id,
      barbeiroId,
      sessaoId,
      valor: comissao.comissaoTotal,
      detalhes: comissao.detalhes,
    });

    return {
      comissao: novaComissao,
      detalhes: comissao,
    };
  }

  /**
   * Registra movimento automático no caixa (via eventos)
   */
  async registrarMovimentoAutomatico(data: {
    barbeariaId: string;
    sessaoId?: string;
    tipo: TipoMovimento;
    valor: number;
    origem: string;
    referenciaId: string;
    descricao?: string;
  }): Promise<CaixaMovimento> {
    // Validação de valor
    if (data.valor <= 0) {
      throw new BadRequestException('Valor do movimento deve ser maior que zero');
    }

    // Se não foi fornecida sessaoId, buscar sessão ativa
    let sessaoId = data.sessaoId;
    if (!sessaoId) {
      const sessaoAtiva = await this.buscarSessaoAtiva(data.barbeariaId);
      if (!sessaoAtiva) {
        throw new BadRequestException('Não há sessão de caixa ativa para registrar movimento');
      }
      sessaoId = sessaoAtiva.id;
    }

    // Validação de saldo negativo para saídas automáticas
    if (data.tipo === TipoMovimento.SAIDA) {
      const totais = await this.calcularTotaisSessao(sessaoId);
      const saldoAposSaida = totais.saldoAtual.minus(data.valor);
      
      if (saldoAposSaida.lt(0)) {
        console.warn(`[CAIXA] Movimento automático resultaria em saldo negativo. Saldo: R$ ${totais.saldoAtual.toFixed(2)}, Saída: R$ ${data.valor}`);
        // Para movimentos automáticos, apenas logamos o warning mas permitimos a operação
        // pois pode ser uma situação temporária que será corrigida
      }
    }

    const movimento = await this.prisma.caixaMovimento.create({
      data: {
        sessaoId,
        barbeariaId: data.barbeariaId,
        tipo: data.tipo,
        origem: data.origem,
        valor: data.valor,
        descricao: data.descricao || `Movimento automático - ${data.origem}`,
        // Usar vendaId ou pagamentoId baseado na origem
        ...(data.origem === 'VENDA' && { vendaId: data.referenciaId }),
        ...(data.origem === 'PAGAMENTO' && { pagamentoId: data.referenciaId }),
      },
    });

    // Emitir evento de movimento registrado
    this.eventEmitter.emit('caixa.movimento.registrado', {
      movimentoId: movimento.id,
      sessaoId,
      tipo: data.tipo,
      valor: data.valor,
      origem: data.origem,
    });

    return movimento;
  }

  /**
   * Fecha uma sessão de caixa
   */
  async fecharCaixa(dto: FecharCaixaDto, usuarioId: string): Promise<CaixaSessao> {
    const sessao = await this.prisma.caixaSessao.findUnique({
      where: { id: dto.sessaoId },
      include: this.includeCompleto,
    });

    if (!sessao) {
      throw new NotFoundException('Sessão de caixa não encontrada');
    }

    if (sessao.closedAt !== null) {
      throw new BadRequestException('Sessão já está fechada');
    }

    // Validação de valor de fechamento
    if (Number(dto.valorFechamento) < 0) {
      throw new BadRequestException('Valor de fechamento não pode ser negativo');
    }

    // Calcular totais da sessão
    const totais = await this.calcularTotaisSessao(dto.sessaoId);

    // Calcular divergência usando métodos do Decimal
    const valorEsperado = totais.valorAbertura.plus(totais.totalEntradas).minus(totais.totalSaidas);
    const divergencia = new Prisma.Decimal(dto.valorFechamento).minus(valorEsperado);

    // Validação de divergência excessiva (mais de R$ 100)
    if (Math.abs(Number(divergencia)) > 100) {
      throw new BadRequestException(
        `Divergência muito alta detectada: R$ ${divergencia.toFixed(2)}. Valor esperado: R$ ${valorEsperado.toFixed(2)}, Valor informado: R$ ${Number(dto.valorFechamento).toFixed(2)}`
      );
    }

    // Criar fechamento diário se não existir para hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let fechamentoDiario = await this.prisma.fechamentoDiario.findFirst({
      where: {
        barbeariaId: sessao.barbeariaId,
        data: hoje,
      },
    });

    if (!fechamentoDiario) {
      // Calcular totais por método de pagamento
      const movimentos = await this.prisma.caixaMovimento.findMany({
        where: { sessaoId: dto.sessaoId },
      });

      const totalDinheiro = movimentos
        .filter(m => m.metodo === 'DINHEIRO' && m.tipo === TipoMovimento.ENTRADA)
        .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

      const totalCartao = movimentos
        .filter(m => (m.metodo === 'CREDITO' || m.metodo === 'DEBITO') && m.tipo === TipoMovimento.ENTRADA)
        .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

      const totalPix = movimentos
        .filter(m => m.metodo === 'PIX' && m.tipo === TipoMovimento.ENTRADA)
        .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

      const totalVendas = movimentos
        .filter(m => m.origem === 'VENDA' && m.tipo === TipoMovimento.ENTRADA)
        .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

      const totalDespesas = movimentos
        .filter(m => m.origem === 'DESPESA' && m.tipo === TipoMovimento.SAIDA)
        .reduce((sum, m) => sum.plus(m.valor), new Prisma.Decimal(0));

      // Criar fechamento diário
      fechamentoDiario = await this.prisma.fechamentoDiario.create({
        data: {
          barbeariaId: sessao.barbeariaId,
          data: hoje,
          saldoInicial: totais.valorAbertura,
          totalVendas: totalVendas,
          totalDinheiro: totalDinheiro,
          totalCartao: totalCartao,
          totalPix: totalPix,
          totalDespesas: totalDespesas,
          saldoFinal: new Prisma.Decimal(dto.valorFechamento),
          saldoConferido: new Prisma.Decimal(dto.valorFechamento),
          diferenca: divergencia,
          observacoes: dto.observacoes,
          fechadoPorId: usuarioId,
        },
      });
    }

    const sessaoFechada = await this.prisma.caixaSessao.update({
      where: { id: dto.sessaoId },
      data: {
        closedByUserId: usuarioId,
        closedAt: new Date(),
        valorFechamento: dto.valorFechamento,
        diferenca: divergencia,
        fechamentoDiarioId: fechamentoDiario.id, // Associar ao fechamento diário
      },
      include: this.includeCompleto,
    });

    // Emitir evento de fechamento
    this.eventEmitter.emit('caixa.sessao.fechada', {
      sessaoId: sessaoFechada.id,
      barbeariaId: sessaoFechada.barbeariaId,
      valorFechamento: sessaoFechada.valorFechamento,
      diferenca: sessaoFechada.diferenca,
      totais,
    });

    // Emitir evento CAIXA_FECHADO através do event handler
    const caixaEventHandlers = new (await import('../events/caixa.event-handlers')).CaixaEventHandlers(
      this.prisma,
      this.eventEmitter,
    );
    await caixaEventHandlers.emitirCaixaFechado(dto.sessaoId, fechamentoDiario.id);

    return sessaoFechada;
  }
}