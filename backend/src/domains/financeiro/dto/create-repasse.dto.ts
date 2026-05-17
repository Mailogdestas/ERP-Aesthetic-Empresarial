import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';

export class CreateRepasseDto {
  @ApiProperty({ description: 'ID do barbeiro' })
  @IsString()
  barbeiroId: string;

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiProperty({ description: 'IDs das comissões a serem repassadas' })
  @IsArray()
  @IsString({ each: true })
  comissaoIds: string[];

  @ApiProperty({ description: 'Valor total do repasse' })
  @IsNumber()
  @Min(0.01)
  valorTotal: number;

  @ApiProperty({ description: 'Forma de pagamento do repasse' })
  @IsString()
  formaPagamento: string;

  @ApiProperty({ description: 'ID do usuário que processou o repasse', required: false })
  @IsOptional()
  @IsString()
  processadoPorUsuarioId?: string;

  @ApiProperty({ description: 'Observações sobre o repasse', required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;
}