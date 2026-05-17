import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateEstoqueDto {
  @ApiProperty({ description: 'Nova quantidade em estoque', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantidade?: number;

  @ApiProperty({ description: 'Nova quantidade mínima para alerta', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  alertaMin?: number;
}