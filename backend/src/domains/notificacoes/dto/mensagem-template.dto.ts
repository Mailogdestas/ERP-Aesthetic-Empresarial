import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMensagemTemplateDto {
  @ApiProperty({ description: 'Nome do template' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Tipo do template (ex: LEMBRETE_AGENDAMENTO, PROMOCAO, ANIVERSARIO)' })
  @IsString()
  tipo: string;

  @ApiProperty({ description: 'Conteúdo do template com placeholders (ex: {{cliente}}, {{data}})' })
  @IsString()
  conteudo: string;

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'Se o template está ativo', default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'ID do usuário que está criando' })
  @IsOptional()
  @IsString()
  createdByUsuarioId?: string;
}

export class UpdateMensagemTemplateDto {
  @ApiPropertyOptional({ description: 'Nome do template' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ description: 'Tipo do template' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ description: 'Conteúdo do template' })
  @IsOptional()
  @IsString()
  conteudo?: string;

  @ApiPropertyOptional({ description: 'Se o template está ativo' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'ID do usuário que está atualizando' })
  @IsOptional()
  @IsString()
  updatedByUsuarioId?: string;
}

export class MensagemTemplateResponseDto {
  @ApiProperty({ description: 'ID do template' })
  id: string;

  @ApiProperty({ description: 'Nome do template' })
  nome: string;

  @ApiProperty({ description: 'Tipo do template' })
  tipo: string;

  @ApiProperty({ description: 'Conteúdo do template' })
  conteudo: string;

  @ApiProperty({ description: 'Se o template está ativo' })
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

export class QueryMensagemTemplateDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo' })
  @IsOptional()
  @IsString()
  tipo?: string;

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

export class ProcessarTemplateDto {
  @ApiProperty({ description: 'ID do template' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiProperty({ description: 'Variáveis para substituir no template' })
  @IsOptional()
  variaveis?: Record<string, any>;
}

export class ProcessarTemplateResponseDto {
  @ApiProperty({ description: 'Conteúdo processado com variáveis substituídas' })
  conteudoProcessado: string;

  @ApiProperty({ description: 'Template utilizado' })
  template: MensagemTemplateResponseDto;

  @ApiProperty({ description: 'Variáveis utilizadas' })
  variaveis: Record<string, any>;
}