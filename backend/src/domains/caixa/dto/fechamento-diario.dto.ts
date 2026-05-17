import { IsOptional, IsString, IsDecimal, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateFechamentoDiarioDto {
  @ApiProperty({ description: 'Data do fechamento (YYYY-MM-DD)' })
  @IsDateString()
  data: string;

  @ApiProperty({ description: 'Saldo inicial do dia', example: '1000.00' })
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => new Decimal(value))
  saldoInicial: Decimal;

  @ApiProperty({ description: 'Total de vendas do dia', example: '2500.00' })
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => new Decimal(value))
  totalVendas: Decimal;

  @ApiProperty({ description: 'Total em dinheiro', example: '800.00' })
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => new Decimal(value))
  totalDinheiro: Decimal;

  @ApiProperty({ description: 'Total em cartão', example: '1200.00' })
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => new Decimal(value))
  totalCartao: Decimal;

  @ApiProperty({ description: 'Total em PIX', example: '500.00' })
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => new Decimal(value))
  totalPix: Decimal;

  @ApiProperty({ description: 'Total de despesas', example: '300.00' })
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => new Decimal(value))
  totalDespesas: Decimal;

  @ApiProperty({ description: 'Saldo final calculado', example: '3200.00' })
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => new Decimal(value))
  saldoFinal: Decimal;

  @ApiPropertyOptional({ description: 'Saldo conferido fisicamente', example: '3180.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => value ? new Decimal(value) : undefined)
  saldoConferido?: Decimal;

  @ApiPropertyOptional({ description: 'Diferença encontrada', example: '-20.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => value ? new Decimal(value) : undefined)
  diferenca?: Decimal;

  @ApiPropertyOptional({ description: 'Observações do fechamento' })
  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateFechamentoDiarioDto {
  @ApiPropertyOptional({ description: 'Saldo conferido fisicamente', example: '3180.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => value ? new Decimal(value) : undefined)
  saldoConferido?: Decimal;

  @ApiPropertyOptional({ description: 'Diferença encontrada', example: '-20.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  @Transform(({ value }) => value ? new Decimal(value) : undefined)
  diferenca?: Decimal;

  @ApiPropertyOptional({ description: 'Observações do fechamento' })
  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class FechamentoDiarioResponseDto {
  @ApiProperty({ description: 'ID do fechamento' })
  id: string;

  @ApiProperty({ description: 'ID da barbearia' })
  barbeariaId: string;

  @ApiProperty({ description: 'Data do fechamento' })
  data: Date;

  @ApiProperty({ description: 'Saldo inicial do dia' })
  saldoInicial: Decimal;

  @ApiProperty({ description: 'Total de vendas do dia' })
  totalVendas: Decimal;

  @ApiProperty({ description: 'Total em dinheiro' })
  totalDinheiro: Decimal;

  @ApiProperty({ description: 'Total em cartão' })
  totalCartao: Decimal;

  @ApiProperty({ description: 'Total em PIX' })
  totalPix: Decimal;

  @ApiProperty({ description: 'Total de despesas' })
  totalDespesas: Decimal;

  @ApiProperty({ description: 'Saldo final calculado' })
  saldoFinal: Decimal;

  @ApiPropertyOptional({ description: 'Saldo conferido fisicamente' })
  saldoConferido?: Decimal;

  @ApiPropertyOptional({ description: 'Diferença encontrada' })
  diferenca?: Decimal;

  @ApiPropertyOptional({ description: 'Observações do fechamento' })
  observacoes?: string;

  @ApiProperty({ description: 'ID do usuário que fechou' })
  fechadoPorId: string;

  @ApiProperty({ description: 'Data/hora do fechamento' })
  fechadoEm: Date;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

export class FechamentoDiarioQueryDto {
  @ApiPropertyOptional({ description: 'Data inicial (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataInicial?: string;

  @ApiPropertyOptional({ description: 'Data final (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataFinal?: string;

  @ApiPropertyOptional({ description: 'Página', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', example: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}

export class ProcessarFechamentoDiarioDto {
  @ApiProperty({ description: 'Data para processar fechamento (YYYY-MM-DD)' })
  @IsDateString()
  data: string;

  @ApiPropertyOptional({ description: 'Forçar reprocessamento se já existe' })
  @IsOptional()
  forcarReprocessamento?: boolean = false;
}