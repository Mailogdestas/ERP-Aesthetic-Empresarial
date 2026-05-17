import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateComissaoDto {
  @ApiProperty({ description: 'ID da venda' })
  @IsString()
  vendaId: string;

  @ApiProperty({ description: 'ID do barbeiro' })
  @IsString()
  barbeiroId: string;

  @ApiProperty({ description: 'Valor base para cálculo da comissão' })
  @IsNumber()
  @Min(0)
  valorBase: number;

  @ApiProperty({ description: 'Percentual de comissão (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentual?: number;

  @ApiProperty({ description: 'Valor fixo da comissão (alternativa ao percentual)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorFixo?: number;

  @ApiProperty({ description: 'Observações sobre a comissão', required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;
}