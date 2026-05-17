import { IsOptional, IsString, IsUUID, IsNumber, Min, IsDecimal, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddItemVendaDto {
  @ApiProperty({
    description: 'ID do produto (obrigatório se não for serviço)',
    example: 'cm123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  produtoId?: string;

  @ApiProperty({
    description: 'ID do serviço (obrigatório se não for produto)',
    example: 'cm123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  servicoId?: string;

  @ApiProperty({
    description: 'Quantidade do item',
    example: 2,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantidade?: number = 1;

  @ApiProperty({
    description: 'Preço unitário (opcional, será buscado do produto/serviço se não informado)',
    example: 25.50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precoUnit?: number;

  @ApiProperty({
    description: 'Tipo de comissão (opcional, para ajuste manual)',
    example: 'PERCENTUAL',
    enum: ['FIXA', 'PERCENTUAL'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['FIXA', 'PERCENTUAL'])
  comissaoTipo?: 'FIXA' | 'PERCENTUAL';

  @ApiProperty({
    description: 'Valor da comissão (opcional, para ajuste manual)',
    example: 40,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  comissaoValor?: number;
}
