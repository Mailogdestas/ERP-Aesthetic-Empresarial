import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDecimal } from 'class-validator';
import { Transform } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

export class FecharCaixaDto {
  @ApiProperty({ 
    description: 'ID da sessão de caixa a ser fechada', 
    example: 'clxyz123456789' 
  })
  @IsUUID()
  sessaoId: string;

  @ApiProperty({ 
    description: 'Valor final contado no caixa', 
    example: '250.75' 
  })
  @Transform(({ value }) => new Decimal(value))
  @IsDecimal({ decimal_digits: '0,2' })
  valorFechamento: Decimal;

  @ApiProperty({ 
    description: 'Observações do fechamento', 
    example: 'Fechamento normal, sem divergências',
    required: false 
  })
  @IsOptional()
  observacoes?: string;

  @ApiProperty({ 
    description: 'Valor de sangria realizada', 
    example: '50.00',
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => new Decimal(value))
  @IsDecimal({ decimal_digits: '0,2' })
  valorSangria?: Decimal;

  @ApiProperty({ 
    description: 'Valor de suprimento adicionado', 
    example: '100.00',
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => new Decimal(value))
  @IsDecimal({ decimal_digits: '0,2' })
  valorSuprimento?: Decimal;
}