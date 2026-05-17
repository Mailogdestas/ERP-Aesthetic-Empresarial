/**
 * 📣 EVENTOS ENTRE DOMÍNIOS - MAPA ENTERPRISE
 * 
 * Sistema de eventos que conecta os domínios seguindo o fluxo:
 * ATENDIMENTO → VENDAS → PAGAMENTO → CAIXA/ESTOQUE/FIDELIDADE → FINANCEIRO
 */

export enum DomainEventType {
  // ATENDIMENTO → VENDAS
  ATENDIMENTO_CONCLUIDO = 'ATENDIMENTO_CONCLUIDO',
  
  // VENDAS → PAGAMENTO
  VENDA_FINALIZADA = 'VENDA_FINALIZADA',
  
  // PAGAMENTO → CAIXA/ESTOQUE/FIDELIDADE
  VENDA_PAGA = 'VENDA_PAGA',
  
  // PAGAMENTO ESPECÍFICOS
  PAGAMENTO_CRIADO = 'PAGAMENTO_CRIADO',
  PARCELA_PAGA = 'PARCELA_PAGA',
  PAGAMENTO_CANCELADO = 'PAGAMENTO_CANCELADO',
  PARCELA_VENCIDA = 'PARCELA_VENCIDA',
  
  // CAIXA → FINANCEIRO
  CAIXA_FECHADO = 'CAIXA_FECHADO',
  
  // FINANCEIRO → CAIXA
  DESPESA_PAGA = 'DESPESA_PAGA',
  
  // AGENDAMENTO
  AGENDAMENTO_CONFIRMADO = 'AGENDAMENTO_CONFIRMADO',
  AGENDAMENTO_CANCELADO = 'AGENDAMENTO_CANCELADO',
  
  // ESTOQUE
  ESTOQUE_BAIXO = 'ESTOQUE_BAIXO',
  
  // SAAS
  ASSINATURA_RENOVADA = 'ASSINATURA_RENOVADA',
  ASSINATURA_SUSPENSA = 'ASSINATURA_SUSPENSA',
  AGENDAMENTO_INICIADO = "AGENDAMENTO_INICIADO",
}

export interface DomainEvent {
  type: DomainEventType;
  aggregateId: string;
  barbeariaId: string;
  payload: any;
  occurredAt: Date;
  version: number;
}

// EVENTOS ESPECÍFICOS

export interface AtendimentoConcluidoEvent extends DomainEvent {
  type: DomainEventType.ATENDIMENTO_CONCLUIDO;
  payload: {
    agendamentoId: string;
    clienteId: string;
    barbeiroId: string;
    servicosRealizados: Array<{
      servicoId: string;
      servicoNome: string;
      preco: number;
      duracao: number;
    }>;
    observacoes?: string;
  };
}

export interface VendaFinalizadaEvent extends DomainEvent {
  type: DomainEventType.VENDA_FINALIZADA;
  payload: {
    vendaId: string;
    clienteId: string;
    barbeiroId: string;
    total: number;
    itens: Array<{
      tipo: 'PRODUTO' | 'SERVICO';
      itemId: string;
      nome: string;
      quantidade: number;
      precoUnit: number;
      total: number;
    }>;
  };
}

export interface VendaPagaEvent extends DomainEvent {
  type: DomainEventType.VENDA_PAGA;
  payload: {
    vendaId: string;
    clienteId: string;
    barbeiroId: string;
    total: number;
    metodoPagamento: string;
    pagamentoId: string;
    barbeariaId: string;
    itens: Array<{
      tipo: 'PRODUTO' | 'SERVICO';
      itemId: string;
      nome: string;
      quantidade: number;
      precoUnit: number;
      total: number;
    }>;
  };
}

export interface CaixaFechadoEvent extends DomainEvent {
  type: DomainEventType.CAIXA_FECHADO;
  payload: {
    caixaSessaoId: string;
    fechamentoDiarioId: string;
    data: Date;
    saldoInicial: number;
    saldoFinal: number;
    totalEntradas: number;
    totalSaidas: number;
    totalVendas: number;
    totalDespesas: number;
  };
}

export interface PagamentoCriadoEvent extends DomainEvent {
  type: DomainEventType.PAGAMENTO_CRIADO;
  payload: {
    pagamentoId: string;
    vendaId: string;
    clienteId: string;
    barbeiroId: string;
    valorTotal: number;
    tipoPagamento: 'AVISTA' | 'PARCELADO';
    numeroParcelas: number;
    parcelas: Array<{
      parcelaId: string;
      numero: number;
      valor: number;
      dataVencimento: Date;
    }>;
  };
}

export interface ParcelaPagaEvent extends DomainEvent {
  type: DomainEventType.PARCELA_PAGA;
  payload: {
    parcelaId: string;
    pagamentoId: string;
    vendaId: string;
    clienteId: string;
    barbeiroId: string;
    numeroParcela: number;
    valor: number;
    metodoPagamento: string;
    dataPagamento: Date;
    isUltimaParcela: boolean;
  };
}

export interface PagamentoCanceladoEvent extends DomainEvent {
  type: DomainEventType.PAGAMENTO_CANCELADO;
  payload: {
    pagamentoId: string;
    vendaId: string;
    clienteId: string;
    barbeiroId: string;
    motivo: string;
    valorTotal: number;
  };
}

export interface ParcelaVencidaEvent extends DomainEvent {
  type: DomainEventType.PARCELA_VENCIDA;
  payload: {
    parcelaId: string;
    pagamentoId: string;
    vendaId: string;
    clienteId: string;
    barbeiroId: string;
    numeroParcela: number;
    valor: number;
    dataVencimento: Date;
    diasAtraso: number;
  };
}

export interface DespesaPagaEvent extends DomainEvent {
  type: DomainEventType.DESPESA_PAGA;
  payload: {
    despesaId: string;
    descricao: string;
    valor: number;
    tipo: string;
    metodoPagamento: string;
    dataPagamento: Date;
    usuarioId: string;
    barbeariaId: string;
  };
}
