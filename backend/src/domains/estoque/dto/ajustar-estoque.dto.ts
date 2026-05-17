import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class AjustarEstoqueDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsString()
  produtoId: string;

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiProperty({ description: 'Quantidade a ser ajustada (positiva para entrada, negativa para saída)' })
  @IsNumber()
  quantidadeDelta: number;

  @ApiProperty({ description: 'Motivo do ajuste', required: false })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiProperty({ description: 'ID do usuário responsável pelo ajuste' })
  @IsString()
  usuarioId: string;
}