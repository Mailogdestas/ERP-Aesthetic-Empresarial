import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsDecimal, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoMovimento, TipoPagamento } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class MovimentoManualDto {
  @ApiProperty({ 
    description: 'ID da sessão de caixa', 
    example: 'clxyz123456789',
    required: false
  })
  @IsOptional()
  @IsUUID()
  sessaoId?: string;

  @ApiProperty({ 
    description: 'Tipo do movimento', 
    enum: TipoMovimento,
    example: TipoMovimento.ENTRADA 
  })
  @IsEnum(TipoMovimento)
  tipo: TipoMovimento;

  @ApiProperty({ 
    description: 'Valor do movimento', 
    example: '50.00' 
  })
  @Transform(({ value }) => new Decimal(value))
  @IsDecimal({ decimal_digits: '0,2' })
  valor: Decimal;

  @ApiProperty({ 
    description: 'Descrição do movimento', 
    example: 'Sangria para depósito bancário' 
  })
  @IsString()
  descricao: string;

  @ApiProperty({ 
    description: 'Método de pagamento', 
    enum: TipoPagamento,
    example: TipoPagamento.DINHEIRO,
    required: false 
  })
  @IsOptional()
  @IsEnum(TipoPagamento)
  metodo?: TipoPagamento;

  @ApiProperty({ 
    description: 'Origem do movimento', 
    example: 'MANUAL',
    default: 'MANUAL',
    required: false 
  })
  @IsOptional()
  @IsString()
  origem?: string;
}