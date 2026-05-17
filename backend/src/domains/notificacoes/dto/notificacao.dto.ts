import { IsString, IsOptional, IsBoolean, IsEnum, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificacaoStatus } from '@prisma/client';

export class CreateNotificacaoDto {
  @ApiProperty({ description: 'Tipo da notificação (ex: LEMBRETE_AGENDAMENTO, PROMOCAO, ANIVERSARIO)' })
  @IsString()
  tipo: string;

  @ApiProperty({ description: 'Payload da notificação (dados específicos)' })
  @IsObject()
  payload: any;

  @ApiProperty({ description: 'ID da barbearia' })
  @IsString()
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'Status da notificação', enum: NotificacaoStatus, default: NotificacaoStatus.PENDENTE })
  @IsOptional()
  @IsEnum(NotificacaoStatus)
  status?: NotificacaoStatus;
}

export class UpdateNotificacaoDto {
  @ApiPropertyOptional({ description: 'Status da notificação', enum: NotificacaoStatus })
  @IsOptional()
  @IsEnum(NotificacaoStatus)
  status?: NotificacaoStatus;

  @ApiPropertyOptional({ description: 'Payload da notificação' })
  @IsOptional()
  @IsObject()
  payload?: any;
}

export class NotificacaoResponseDto {
  @ApiProperty({ description: 'ID da notificação' })
  id: string;

  @ApiProperty({ description: 'Tipo da notificação' })
  tipo: string;

  @ApiProperty({ description: 'Payload da notificação' })
  payload: any;

  @ApiProperty({ description: 'Data de envio' })
  enviadoEm: Date;

  @ApiProperty({ description: 'Status da notificação', enum: NotificacaoStatus })
  status: NotificacaoStatus;

  @ApiProperty({ description: 'ID da barbearia' })
  barbeariaId: string;

  @ApiPropertyOptional({ description: 'Nome da barbearia' })
  barbearia?: {
    nome: string;
  };
}

export class QueryNotificacaoDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status', enum: NotificacaoStatus })
  @IsOptional()
  @IsEnum(NotificacaoStatus)
  status?: NotificacaoStatus;

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

export class EnviarNotificacaoDto {
  @ApiProperty({ description: 'Tipo da notificação (ex: LEMBRETE_AGENDAMENTO, PROMOCAO, ANIVERSARIO)' })
  @IsString()
  tipo: string;

  @ApiProperty({ description: 'ID do destinatário (cliente, barbeiro, etc.)' })
  @IsString()
  destinatarioId: string;

  @ApiProperty({ description: 'Dados específicos para a notificação' })
  @IsObject()
  dados: any;

  @ApiPropertyOptional({ description: 'ID do template de mensagem' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Canal de envio (WhatsApp, SMS, Email)', default: 'WhatsApp' })
  @IsOptional()
  @IsString()
  canal?: string;
}