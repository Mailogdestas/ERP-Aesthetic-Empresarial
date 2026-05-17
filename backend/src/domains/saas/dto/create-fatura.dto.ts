import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateFaturaDto {
  @ApiProperty({ description: 'ID da assinatura' })
  @IsString()
  assinaturaId: string;

  @ApiProperty({ description: 'Valor da fatura' })
  @IsNumber()
  @Min(0.01)
  valor: number;

  @ApiProperty({ description: 'Data de vencimento da fatura' })
  @IsDateString()
  vencimento: string;

  @ApiProperty({ description: 'Descrição da fatura', required: false })
  @IsOptional()
  @IsString()
  descricao?: string;
}