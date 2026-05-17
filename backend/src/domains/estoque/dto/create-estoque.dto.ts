import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateEstoqueDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsString()
  produtoId: string;

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiProperty({ description: 'Quantidade inicial em estoque' })
  @IsNumber()
  @Min(0)
  quantidade: number;

  @ApiProperty({ description: 'Quantidade mínima para alerta', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  alertaMin?: number;

  @ApiProperty({ description: 'ID do usuário que criou o registro', required: false })
  @IsOptional()
  @IsString()
  createdByUsuarioId?: string;
}