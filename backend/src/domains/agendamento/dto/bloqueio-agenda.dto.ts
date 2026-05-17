import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { TipoBloqueio } from '@prisma/client';

// ===== CREATE DTO =====

export class CreateBloqueioAgendaDto {
  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  @IsUUID()
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'ID do barbeiro (opcional para bloqueio geral)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  barbeiroId?: string;

  @ApiProperty({ description: 'Tipo do bloqueio', enum: TipoBloqueio })
  @IsEnum(TipoBloqueio)
  tipo: TipoBloqueio;

  @ApiProperty({ description: 'Título do bloqueio', example: 'Férias de Janeiro' })
  @IsString()
  titulo: string;

  @ApiPropertyOptional({ description: 'Descrição adicional do bloqueio' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ description: 'Data/hora de início do bloqueio', example: '2024-01-15T08:00:00Z' })
  @IsDateString()
  dataInicio: string;

  @ApiProperty({ description: 'Data/hora de fim do bloqueio', example: '2024-01-15T18:00:00Z' })
  @IsDateString()
  dataFim: string;

  @ApiPropertyOptional({ description: 'Se é um bloqueio recorrente', default: false })
  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;
}

// ===== UPDATE DTO =====

export class UpdateBloqueioAgendaDto {
  @ApiPropertyOptional({ description: 'Tipo do bloqueio', enum: TipoBloqueio })
  @IsOptional()
  @IsEnum(TipoBloqueio)
  tipo?: TipoBloqueio;

  @ApiPropertyOptional({ description: 'Título do bloqueio' })
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiPropertyOptional({ description: 'Descrição adicional do bloqueio' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Data/hora de início do bloqueio' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data/hora de fim do bloqueio' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'Se é um bloqueio recorrente' })
  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;
}

// ===== RESPONSE DTO =====

export class BloqueioAgendaResponseDto {
  @ApiProperty({ description: 'ID do bloqueio' })
  id: string;

  @ApiProperty({ description: 'ID da barbearia' })
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'ID do barbeiro' })
  barbeiroId?: string;

  @ApiProperty({ description: 'Tipo do bloqueio', enum: TipoBloqueio })
  tipo: TipoBloqueio;

  @ApiProperty({ description: 'Título do bloqueio' })
  titulo: string;

  @ApiPropertyOptional({ description: 'Descrição do bloqueio' })
  descricao?: string;

  @ApiProperty({ description: 'Data/hora de início' })
  dataInicio: Date;

  @ApiProperty({ description: 'Data/hora de fim' })
  dataFim: Date;

  @ApiProperty({ description: 'Se é recorrente' })
  recorrente: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  // Relacionamentos opcionais
  @ApiPropertyOptional({ description: 'Dados do barbeiro' })
  barbeiro?: {
    id: string;
    nome: string;
  };

  @ApiPropertyOptional({ description: 'Dados da barbearia' })
  barbearia?: {
    id: string;
    nome: string;
  };
}

// ===== QUERY DTO =====

export class BloqueioAgendaQueryDto {
  @ApiPropertyOptional({ description: 'ID do barbeiro para filtrar' })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiPropertyOptional({ description: 'Tipo de bloqueio para filtrar', enum: TipoBloqueio })
  @IsOptional()
  @IsEnum(TipoBloqueio)
  tipo?: TipoBloqueio;

  @ApiPropertyOptional({ description: 'Data de início para filtrar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data de fim para filtrar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'Incluir apenas bloqueios ativos', default: true })
  @IsOptional()
  @IsBoolean()
  apenasAtivos?: boolean;
}