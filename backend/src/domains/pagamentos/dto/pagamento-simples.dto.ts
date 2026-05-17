import { IsUUID, IsEnum, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPagamento } from '@prisma/client';

// Enum local para tipoPagamento simples
export enum TipoPagamentoSimples {
  AVISTA = 'AVISTA',
  PARCELADO = 'PARCELADO'
}

/**
 * 💰 DTO para Pagamento Simples
 * Usado para pagamentos diretos sem simulação complexa
 */
export class PagamentoSimplesDto {
  @ApiProperty({
    description: 'ID da venda a ser paga',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  @IsUUID()
  vendaId!: string;

  @ApiProperty({
    description: 'Método de pagamento utilizado',
    enum: MetodoPagamento,
    example: MetodoPagamento.DINHEIRO
  })
  @IsEnum(MetodoPagamento)
  metodoPagamento!: MetodoPagamento;

  @ApiProperty({
    description: 'Valor pago pelo cliente',
    example: 25.00,
    minimum: 0.01
  })
  @IsNumber()
  @IsPositive()
  valorPago!: number;

  @ApiProperty({
    description: 'Tipo de pagamento - determina se aplica juros ou desconto',
    enum: TipoPagamentoSimples,
    example: TipoPagamentoSimples.AVISTA
  })
  @IsEnum(TipoPagamentoSimples)
  tipoPagamento!: TipoPagamentoSimples;

  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento à vista com desconto'
  })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Número de parcelas (obrigatório se tipoPagamento for PARCELADO)',
    example: 3,
    minimum: 1,
    maximum: 12
  })
  @IsOptional()
  @IsNumber()
  parcelas?: number;
}

/**
 * 📋 DTO de Resposta para Pagamento Simples
 */
export class PagamentoSimplesResponseDto {
  @ApiProperty({
    description: 'ID do pagamento criado',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  id: string;

  @ApiProperty({
    description: 'ID da venda',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  vendaId: string;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: MetodoPagamento
  })
  metodoPagamento: MetodoPagamento;

  @ApiProperty({
    description: 'Tipo de pagamento aplicado',
    enum: TipoPagamentoSimples
  })
  tipoPagamento: TipoPagamentoSimples;

  @ApiProperty({
    description: 'Valor original da venda',
    example: 30.00
  })
  valorOriginal: number;

  @ApiProperty({
    description: 'Valor pago pelo cliente',
    example: 25.00
  })
  valorPago: number;

  @ApiProperty({
    description: 'Desconto aplicado (se à vista)',
    example: 5.00
  })
  desconto?: number;

  @ApiProperty({
    description: 'Juros aplicados (se parcelado)',
    example: 2.50
  })
  juros?: number;

  @ApiProperty({
    description: 'Número de parcelas (se parcelado)',
    example: 3
  })
  parcelas?: number;

  @ApiProperty({
    description: 'Status do pagamento',
    example: 'APROVADO'
  })
  status: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Observações',
    example: 'Pagamento à vista com desconto'
  })
  observacoes?: string;
}