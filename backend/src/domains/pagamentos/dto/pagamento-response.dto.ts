import { ApiProperty } from '@nestjs/swagger'
import { TipoPagamento, StatusPagamento, StatusParcela } from '@prisma/client'

export class ParcelaResponseDto {
  @ApiProperty({
    description: 'ID da parcela',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  id: string

  @ApiProperty({
    description: 'ID do pagamento',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  pagamentoId: string

  @ApiProperty({
    description: 'Número da parcela',
    example: 1
  })
  numeroParcela: number

  @ApiProperty({
    description: 'Valor da parcela',
    example: 34.53,
    type: Number
  })
  valor: number

  @ApiProperty({
    description: 'Valor pago da parcela',
    example: 34.53,
    type: Number,
    nullable: true
  })
  valorPago: number | null

  @ApiProperty({
    description: 'Data de vencimento',
    example: '2024-01-15T00:00:00Z',
    type: Date
  })
  dataVencimento: Date

  @ApiProperty({
    description: 'Data do pagamento',
    example: '2024-01-15T10:30:00Z',
    type: Date,
    nullable: true
  })
  dataPagamento: Date | null

  @ApiProperty({
    description: 'Status da parcela',
    enum: StatusParcela,
    example: StatusParcela.PENDENTE
  })
  status: StatusParcela

  @ApiProperty({
    description: 'Método de pagamento da parcela',
    example: 'PIX',
    nullable: true
  })
  metodoPagamento: string | null

  @ApiProperty({
    description: 'Observações da parcela',
    example: 'Pago via PIX',
    nullable: true
  })
  observacoes: string | null

  @ApiProperty({
    description: 'ID da transação no gateway',
    example: 'txn_123456789',
    nullable: true
  })
  gatewayTxnId: string | null

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00Z',
    type: Date
  })
  createdAt: Date

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-15T10:30:00Z',
    type: Date
  })
  updatedAt: Date

  @ApiProperty({
    description: 'Data de exclusão (soft delete)',
    example: null,
    type: Date,
    nullable: true
  })
  deletedAt: Date | null

  @ApiProperty({
    description: 'Pagamento relacionado (resumo)',
    type: 'object',
    nullable: true
  })
  pagamento?: {
    id: string;
    valorComJuros: number;
    venda?: any;
  }
}

export class PagamentoResponseDto {
  @ApiProperty({
    description: 'ID do pagamento',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  id: string

  @ApiProperty({
    description: 'ID da venda',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  vendaId: string

  @ApiProperty({
    description: 'ID da barbearia',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  barbeariaId: string

  @ApiProperty({
    description: 'Tipo de pagamento',
    enum: TipoPagamento,
    example: TipoPagamento.CREDITO
  })
  tipo: TipoPagamento

  @ApiProperty({
    description: 'Valor bruto da venda',
    example: 100.00,
    type: Number
  })
  valorBruto: number

  @ApiProperty({
    description: 'Valor que o cliente paga',
    example: 103.59,
    type: Number
  })
  valorCliente: number

  @ApiProperty({
    description: 'Valor líquido para a barbearia',
    example: 103.59,
    type: Number
  })
  valorLiquido: number

  @ApiProperty({
    description: 'Se os juros são repassados ao cliente',
    example: true
  })
  repassaJuros: boolean

  @ApiProperty({
    description: 'Status do pagamento',
    enum: StatusPagamento,
    example: StatusPagamento.PENDENTE
  })
  status: StatusPagamento

  @ApiProperty({
    description: 'Parcelas do pagamento',
    type: [ParcelaResponseDto]
  })
  parcelas: ParcelaResponseDto[]

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00Z',
    type: Date
  })
  createdAt: Date

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-15T10:30:00Z',
    type: Date
  })
  updatedAt: Date

  @ApiProperty({
    description: 'Data de exclusão (soft delete)',
    example: null,
    type: Date,
    nullable: true
  })
  deletedAt: Date | null

  @ApiProperty({
    description: 'ID do usuário que criou',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    nullable: true
  })
  createdByUsuarioId: string | null

  @ApiProperty({
    description: 'ID do usuário que atualizou',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    nullable: true
  })
  updatedByUsuarioId: string | null
}
