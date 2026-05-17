import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateAssinaturaDto {
  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiProperty({ description: 'ID do plano' })
  @IsString()
  planoId: string;

  @ApiProperty({ description: 'Valor mensal da assinatura' })
  @IsNumber()
  @Min(0.01)
  valor: number;

  @ApiProperty({ description: 'Data de início da assinatura' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Data de fim da assinatura' })
  @IsDateString()
  periodEnd: string;
}