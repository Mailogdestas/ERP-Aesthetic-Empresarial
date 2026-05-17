import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDecimal, IsEnum } from 'class-validator';
import { ModoCaixa } from '@prisma/client';
import { Transform } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export class AbrirCaixaDto {
  @ApiProperty({ 
    description: 'ID da barbearia (opcional - será extraído do JWT se não fornecido)', 
    example: 'clxyz123456789',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  barbeariaId?: string;

  @ApiProperty({ 
    description: 'ID do barbeiro (obrigatório para modo POR_BARBEIRO)', 
    example: 'clxyz123456789',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiProperty({ 
    description: 'ID do operador (obrigatório para modo POR_OPERADOR)', 
    example: 'clxyz123456789',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  operadorId?: string;

  @ApiProperty({ 
    description: 'Valor inicial do caixa', 
    example: '100.00',
    required: false,
    default: '0.00'
  })
  @IsOptional()
  @Transform(({ value }) => new Decimal(value))
  @IsDecimal({ decimal_digits: '0,2' })
  valorAbertura?: Decimal;

  @ApiProperty({ 
    description: 'Observações da abertura', 
    example: 'Abertura do caixa matutino',
    required: false 
  })
  @IsOptional()
  observacoes?: string;
}