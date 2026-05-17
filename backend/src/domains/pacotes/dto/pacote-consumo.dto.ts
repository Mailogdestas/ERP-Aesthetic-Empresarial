import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePacoteConsumoDto {
  @ApiProperty({ description: 'ID do pacote' })
  @IsString()
  pacoteId: string;

  @ApiProperty({ description: 'ID do cliente' })
  @IsString()
  clienteId: string;

  @ApiProperty({ description: 'ID do serviço consumido' })
  @IsString()
  servicoId: string;

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'ID da venda relacionada' })
  @IsOptional()
  @IsString()
  vendaId?: string;

  @ApiPropertyOptional({ description: 'Quantidade consumida', default: 1 })
  @IsOptional()
  @IsNumber()
  quantidade?: number;

  @ApiProperty({ description: 'Valor unitário no momento do consumo' })
  @IsNumber()
  valorUnit: number;
}

export class UpdatePacoteConsumoDto {
  @ApiPropertyOptional({ description: 'Quantidade consumida' })
  @IsOptional()
  @IsNumber()
  quantidade?: number;

  @ApiPropertyOptional({ description: 'Valor unitário' })
  @IsOptional()
  @IsNumber()
  valorUnit?: number;

  @ApiPropertyOptional({ description: 'ID da venda relacionada' })
  @IsOptional()
  @IsString()
  vendaId?: string;
}

export class PacoteConsumoResponseDto {
  @ApiProperty({ description: 'ID do consumo' })
  id: string;

  @ApiProperty({ description: 'ID do pacote' })
  pacoteId: string;

  @ApiProperty({ description: 'Dados do pacote' })
  pacote: {
    id: string;
    nome: string;
    valor: number;
  };

  @ApiProperty({ description: 'ID do cliente' })
  clienteId: string;

  @ApiProperty({ description: 'Dados do cliente' })
  cliente: {
    id: string;
    nome: string;
    telefone?: string;
  };

  @ApiProperty({ description: 'ID do serviço' })
  servicoId: string;

  @ApiProperty({ description: 'Dados do serviço' })
  servico: {
    id: string;
    nome: string;
    preco: number;
  };

  @ApiPropertyOptional({ description: 'ID da venda' })
  vendaId?: string;

  @ApiPropertyOptional({ description: 'Dados da venda' })
  venda?: {
    id: string;
    valorTotal: number;
    status: string;
  };

  @ApiProperty({ description: 'ID da barbearia' })
  barbeariaId: string;

  @ApiProperty({ description: 'Quantidade consumida' })
  quantidade: number;

  @ApiProperty({ description: 'Valor unitário' })
  valorUnit: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

export class QueryPacoteConsumoDto {
  @ApiPropertyOptional({ description: 'Filtrar por pacote' })
  @IsOptional()
  @IsString()
  pacoteId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por cliente' })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por serviço' })
  @IsOptional()
  @IsString()
  servicoId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por venda' })
  @IsOptional()
  @IsString()
  vendaId?: string;

  @ApiPropertyOptional({ description: 'Data inicial (ISO string)' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data final (ISO string)' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20 })
  @IsOptional()
  limit?: number;
}

export class ConsumirPacoteDto {
  @ApiProperty({ description: 'ID do pacote' })
  @IsString()
  pacoteId: string;

  @ApiProperty({ description: 'ID do cliente' })
  @IsString()
  clienteId: string;

  @ApiProperty({ description: 'ID do serviço a ser consumido' })
  @IsString()
  servicoId: string;

  @ApiPropertyOptional({ description: 'Quantidade a consumir', default: 1 })
  @IsOptional()
  @IsNumber()
  quantidade?: number;

  @ApiPropertyOptional({ description: 'ID da venda relacionada' })
  @IsOptional()
  @IsString()
  vendaId?: string;
}