import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { TipoMovimento, TipoPagamento } from '@prisma/client';

export class FiltroCaixaDto {
  @ApiProperty({ 
    description: 'ID da barbearia', 
    example: 'clxyz123456789' 
  })
  @IsUUID()
  barbeariaId: string;

  @ApiProperty({ 
    description: 'ID do barbeiro (para filtrar por barbeiro específico)', 
    example: 'clxyz123456789',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiProperty({ 
    description: 'ID do operador (para filtrar por operador específico)', 
    example: 'clxyz123456789',
    required: false 
  })
  @IsOptional()
  @IsUUID()
  operadorId?: string;

  @ApiProperty({ 
    description: 'Status da sessão de caixa (aberta/fechada)', 
    example: 'ABERTA',
    required: false 
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ 
    description: 'Data inicial (formato ISO)', 
    example: '2024-01-01T00:00:00.000Z',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dataInicial?: string;

  @ApiProperty({ 
    description: 'Data final (formato ISO)', 
    example: '2024-01-31T23:59:59.999Z',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dataFinal?: string;

  @ApiProperty({ 
    description: 'Tipo de movimento para filtrar', 
    enum: TipoMovimento,
    required: false 
  })
  @IsOptional()
  @IsEnum(TipoMovimento)
  tipoMovimento?: TipoMovimento;

  @ApiProperty({ 
    description: 'Método de pagamento para filtrar', 
    enum: TipoPagamento,
    required: false 
  })
  @IsOptional()
  @IsEnum(TipoPagamento)
  metodoPagamento?: TipoPagamento;

  @ApiProperty({ 
    description: 'Termo de busca na descrição dos movimentos', 
    example: 'sangria',
    required: false 
  })
  @IsOptional()
  @IsString()
  termoBusca?: string;
}