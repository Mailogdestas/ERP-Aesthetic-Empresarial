import { IsUUID, IsEnum, IsBoolean, IsInt, Min, IsOptional, ValidateNested, IsNumber, IsDecimal } from 'class-validator'
import { Type } from 'class-transformer'
import { TipoPagamento } from '@prisma/client'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class OverrideTaxasDto {
  @ApiPropertyOptional({
    description: 'Percentual base de juros personalizado',
    example: 2.90,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  jurosPercentual?: number

  @ApiPropertyOptional({
    description: 'Juros por parcela personalizado',
    example: 0.19,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  jurosPorParcela?: number

  @ApiPropertyOptional({
    description: 'Desconto à vista personalizado',
    example: 5.00,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  descontoAvista?: number
}

export class SimularPagamentoDto {
  @ApiProperty({
    description: 'ID da venda para simulação',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  @IsUUID()
  vendaId!: string

  @ApiProperty({
    description: 'Tipo de pagamento',
    enum: TipoPagamento,
    example: TipoPagamento.CREDITO
  })
  @IsEnum(TipoPagamento)
  tipo!: TipoPagamento

  @ApiPropertyOptional({
    description: 'Número de parcelas (obrigatório para CREDITO)',
    example: 3,
    minimum: 1,
    maximum: 12
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  parcelas?: number

  @ApiPropertyOptional({
    description: 'Se os juros devem ser repassados ao cliente',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  repassaJuros?: boolean

  @ApiPropertyOptional({
    description: 'Taxas personalizadas (requer permissão)',
    type: OverrideTaxasDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OverrideTaxasDto)
  override?: OverrideTaxasDto
}

export class CriarPagamentoDto extends SimularPagamentoDto {
  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento parcelado em 3x no cartão'
  })
  @IsOptional()
  observacoes?: string
}

export class PagarParcelaDto {
  @ApiProperty({
    description: 'ID da parcela a ser paga',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  @IsUUID()
  parcelaId!: string

  @ApiPropertyOptional({
    description: 'Valor pago da parcela',
    example: 34.53,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  valorPago?: number

  @ApiPropertyOptional({
    description: 'Método de pagamento utilizado',
    example: 'PIX'
  })
  @IsOptional()
  metodoPagamento?: string

  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pago via PIX'
  })
  @IsOptional()
  observacoes?: string

  @ApiPropertyOptional({
    description: 'Data do pagamento da parcela',
    example: '2024-01-15T10:30:00Z',
    type: Date
  })
  @IsOptional()
  dataPagamento?: Date
}

export class ParcelaDetalheDto {
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
    description: 'Data de vencimento da parcela',
    example: '2024-01-15T00:00:00Z',
    type: Date
  })
  vencimento: Date

  @ApiProperty({
    description: 'ID da parcela (se já criada)',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    required: false
  })
  parcelaId?: string

  @ApiProperty({
    description: 'Valor pago da parcela',
    example: 34.53,
    type: Number,
    required: false
  })
  valorPago?: number

  @ApiProperty({
    description: 'Parcela avançada relacionada',
    type: 'object',
    required: false
  })
  parcelaAvancada?: any

  @ApiProperty({
    description: 'Configuração de juros aplicada',
    type: 'object',
    required: false
  })
  configJuros?: any
}

export class SimulacaoResponseDto {
  @ApiProperty({
    description: 'Valor base da venda',
    example: 100.00,
    type: Number
  })
  valorBase: number

  @ApiProperty({
    description: 'Tipo de pagamento simulado',
    enum: TipoPagamento,
    example: TipoPagamento.CREDITO
  })
  tipo: TipoPagamento

  @ApiProperty({
    description: 'Número de parcelas',
    example: 3
  })
  parcelas: number

  @ApiProperty({
    description: 'Se os juros são repassados ao cliente',
    example: true
  })
  repassaJuros: boolean

  @ApiProperty({
    description: 'Taxas aplicadas na simulação',
    type: 'object',
    properties: {
      jurosPercentual: { type: 'number', example: 2.90 },
      jurosPorParcela: { type: 'number', example: 0.19 },
      descontoAvista: { type: 'number', example: 0.00 }
    }
  })
  taxas: {
    jurosPercentual: number
    jurosPorParcela: number
    descontoAvista: number
  }

  @ApiProperty({
    description: 'Total que o cliente pagará',
    example: 103.59,
    type: Number
  })
  totalCliente: number

  @ApiProperty({
    description: 'Custo dos juros',
    example: 3.59,
    type: Number
  })
  custoJuros: number

  @ApiProperty({
    description: 'Valor líquido para a barbearia',
    example: 103.59,
    type: Number
  })
  valorLiquido: number

  @ApiProperty({
    description: 'Detalhes das parcelas',
    type: [ParcelaDetalheDto]
  })
  parcelasDetalhe: ParcelaDetalheDto[]
}
