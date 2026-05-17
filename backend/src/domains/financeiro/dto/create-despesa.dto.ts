import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateDespesaDto {
  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiProperty({ description: 'Descrição da despesa' })
  @IsString()
  descricao: string;

  @ApiProperty({ description: 'Valor da despesa' })
  @IsNumber()
  @Min(0.01)
  valor: number;

  @ApiProperty({ description: 'Categoria da despesa', required: false })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiProperty({ description: 'Data da despesa', required: false })
  @IsOptional()
  @IsDateString()
  data?: string;

  @ApiProperty({ description: 'ID do usuário que registrou', required: false })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiProperty({ description: 'Observações adicionais', required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;
}