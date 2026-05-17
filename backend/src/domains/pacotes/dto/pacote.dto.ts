import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ItemPacoteDto {
  @ApiProperty({ description: 'ID do serviço' })
  @IsString()
  servicoId: string;

  @ApiProperty({ description: 'Nome do serviço' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Quantidade incluída no pacote' })
  @IsNumber()
  quantidade: number;

  @ApiProperty({ description: 'Valor unitário do serviço' })
  @IsNumber()
  valorUnitario: number;
}

export class CreatePacoteDto {
  @ApiProperty({ description: 'Nome do pacote' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Valor total do pacote' })
  @IsNumber()
  valor: number;

  @ApiProperty({ description: 'Itens inclusos no pacote', type: [ItemPacoteDto] })
  @IsArray()
  @Type(() => ItemPacoteDto)
  itens: ItemPacoteDto[];

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'Se o pacote está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'ID do usuário que está criando' })
  @IsOptional()
  @IsString()
  createdByUsuarioId?: string;
}

export class UpdatePacoteDto {
  @ApiPropertyOptional({ description: 'Nome do pacote' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ description: 'Valor total do pacote' })
  @IsOptional()
  @IsNumber()
  valor?: number;

  @ApiPropertyOptional({ description: 'Itens inclusos no pacote', type: [ItemPacoteDto] })
  @IsOptional()
  @IsArray()
  @Type(() => ItemPacoteDto)
  itens?: ItemPacoteDto[];

  @ApiPropertyOptional({ description: 'Se o pacote está ativo' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'ID do usuário que está atualizando' })
  @IsOptional()
  @IsString()
  updatedByUsuarioId?: string;
}

export class PacoteResponseDto {
  @ApiProperty({ description: 'ID do pacote' })
  id: string;

  @ApiProperty({ description: 'Nome do pacote' })
  nome: string;

  @ApiProperty({ description: 'Valor total do pacote' })
  valor: number;

  @ApiProperty({ description: 'Itens inclusos no pacote' })
  itens: ItemPacoteDto[];

  @ApiProperty({ description: 'Se o pacote está ativo' })
  ativo: boolean;

  @ApiProperty({ description: 'ID da barbearia' })
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'Nome da barbearia' })
  barbearia?: {
    nome: string;
  };

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Usuário que criou' })
  createdByUsuario?: {
    nome: string;
  };

  @ApiPropertyOptional({ description: 'Usuário que atualizou' })
  updatedByUsuario?: {
    nome: string;
  };
}

export class QueryPacoteDto {
  @ApiPropertyOptional({ description: 'Filtrar por status ativo' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'Buscar por nome (contém)' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20 })
  @IsOptional()
  limit?: number;
}