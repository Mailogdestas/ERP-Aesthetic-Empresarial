import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

/**
 * 💰 DTO para Pagamento de Despesa
 * Usado para registrar o pagamento de uma despesa cadastrada
 */
export class PagarDespesaDto {
  @ApiProperty({
    description: 'Método de pagamento utilizado',
    enum: ['DINHEIRO', 'CARTAO', 'PIX', 'TRANSFERENCIA'],
    example: 'DINHEIRO'
  })
  @IsEnum(['DINHEIRO', 'CARTAO', 'PIX', 'TRANSFERENCIA'])
  metodoPagamento!: string;

  @ApiPropertyOptional({
    description: 'Data do pagamento (se não informada, usa data atual)',
    example: '2025-01-02T10:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento à vista da conta de energia'
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}

/**
 * 📋 DTO de Resposta para Pagamento de Despesa
 */
export class PagarDespesaResponseDto {
  @ApiProperty({
    description: 'ID da despesa paga',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  id: string;

  @ApiProperty({
    description: 'Descrição da despesa',
    example: 'Conta de energia elétrica'
  })
  descricao: string;

  @ApiProperty({
    description: 'Valor da despesa',
    example: 150.00
  })
  valor: number;

  @ApiProperty({
    description: 'Status atualizado',
    example: 'PAGO'
  })
  status: string;

  @ApiProperty({
    description: 'Método de pagamento',
    example: 'DINHEIRO'
  })
  metodoPagamento: string;

  @ApiProperty({
    description: 'Data do pagamento',
    example: '2025-01-02T10:30:00Z'
  })
  dataPagamento: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2025-01-02T10:30:00Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Observações',
    example: 'Pagamento à vista da conta de energia'
  })
  observacoes?: string;
}