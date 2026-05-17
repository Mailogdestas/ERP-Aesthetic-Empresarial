import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsDateString, 
  IsOptional, 
  IsEnum, 
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TipoRecorrencia } from '@prisma/client';

export enum StatusAgendamento {
  PENDENTE = 'PENDENTE',
  CONFIRMADO = 'CONFIRMADO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
  NO_SHOW = 'NO_SHOW'
}

// ===== AGENDAMENTO DTOs =====

export class CreateAgendamentoDto {
  @IsString()
  clienteId: string;

  @IsString()
  barbeiroId: string;

  @IsArray()
  servicoIds: string[];

  @IsDateString()
  dataHora: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ enum: TipoRecorrencia, required: false })
  @IsOptional()
  recorrencia?: TipoRecorrencia;

  @IsOptional()
  @IsNumber()
  quantidadeRecorrencias?: number;
}


export class UpdateAgendamentoDto {
  @ApiPropertyOptional({ description: 'ID do barbeiro' })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiPropertyOptional({ description: 'IDs dos serviços', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  servicoIds?: string[];

  @ApiPropertyOptional({ description: 'Data e hora do agendamento' })
  @IsOptional()
  @IsDateString()
  dataHora?: string;

  @ApiPropertyOptional({ description: 'Observações do agendamento' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ description: 'Status do agendamento', enum: StatusAgendamento })
  @IsOptional()
  @IsEnum(StatusAgendamento)
  status?: StatusAgendamento;

  @ApiProperty({ enum: TipoRecorrencia, required: false })
  @IsOptional()
  recorrencia?: TipoRecorrencia;

  @IsOptional()
  @IsNumber()
  quantidadeRecorrencias?: number;
}

export class AgendamentoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clienteId: string;

  @ApiProperty()
  barbeiroId: string;

  @ApiProperty()
  dataHora: Date;

  @ApiProperty()
  duracaoMinutos: number;

  @ApiProperty({ enum: StatusAgendamento })
  status: StatusAgendamento;

  @ApiProperty()
  observacoes: string;

  @ApiProperty({ enum: TipoRecorrencia })
  recorrencia: TipoRecorrencia;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Relacionamentos
  @ApiProperty()
  cliente: {
    id: string;
    nome: string;
    telefone: string;
  };

  @ApiProperty()
  barbeiro: {
    id: string;
    nome: string;
  };

  @ApiProperty({ type: [Object] })
  servicos: Array<{
    id: string;
    nome: string;
    duracaoMinutos: number;
    preco: number;
  }>;
}

// ===== TURNO DTOs =====

export class CreateTurnoDto {
  @ApiProperty({ description: 'ID do barbeiro' })
  @IsNotEmpty()
  @IsUUID()
  barbeiroId: string;

  @ApiProperty({ description: 'Dia da semana (0=Domingo, 6=Sábado)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(6)
  diaSemana: number;

  @ApiProperty({ description: 'Horário de início', example: '08:00' })
  @IsNotEmpty()
  @IsString()
  horaInicio: string;

  @ApiProperty({ description: 'Horário de fim', example: '18:00' })
  @IsNotEmpty()
  @IsString()
  horaFim: string;

  @ApiPropertyOptional({ description: 'Se está ativo' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateTurnoDto {
  @ApiPropertyOptional({ description: 'Horário de início' })
  @IsOptional()
  @IsString()
  horaInicio?: string;

  @ApiPropertyOptional({ description: 'Horário de fim' })
  @IsOptional()
  @IsString()
  horaFim?: string;

  @ApiPropertyOptional({ description: 'Se está ativo' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

// ===== BLOQUEIO AGENDA DTOs =====

export class CreateBloqueioAgendaDto {
  @ApiProperty({ description: 'ID do barbeiro' })
  @IsNotEmpty()
  @IsUUID()
  barbeiroId: string;

  @ApiProperty({ description: 'Data e hora de início do bloqueio' })
  @IsNotEmpty()
  @IsDateString()
  dataHoraInicio: string;

  @ApiProperty({ description: 'Data e hora de fim do bloqueio' })
  @IsNotEmpty()
  @IsDateString()
  dataHoraFim: string;

  @ApiProperty({ description: 'Motivo do bloqueio' })
  @IsNotEmpty()
  @IsString()
  motivo: string;

  @ApiPropertyOptional({ description: 'Se é um bloqueio recorrente' })
  @IsOptional()
  @IsBoolean()
  recorrente?: boolean;
}

// ===== CALENDARIO DTOs =====

export class CalendarioQueryDto {
  @ApiProperty({ description: 'Data de início', example: '2024-01-01' })
  @IsNotEmpty()
  @IsDateString()
  dataInicio: string;

  @ApiProperty({ description: 'Data de fim', example: '2024-01-31' })
  @IsNotEmpty()
  @IsDateString()
  dataFim: string;

  @ApiPropertyOptional({ description: 'ID do barbeiro para filtrar' })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiPropertyOptional({ description: 'Status para filtrar', enum: StatusAgendamento })
  @IsOptional()
  @IsEnum(StatusAgendamento)
  status?: StatusAgendamento;
}

export class SlotsLivresQueryDto {
  @ApiProperty({ description: 'Data para buscar slots', example: '2024-01-15' })
  @IsNotEmpty()
  @IsDateString()
  data: string;

  @ApiProperty({ description: 'ID do barbeiro' })
  @IsNotEmpty()
  @IsUUID()
  barbeiroId: string;

  @ApiProperty({ description: 'IDs dos serviços', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  servicoIds: string[];
}

export class SlotLivreDto {
  @ApiProperty({ description: 'Horário do slot' })
  horaInicio: string;

  @ApiProperty({ description: 'Horário de fim do slot' })
  horaFim: string;

  @ApiProperty({ description: 'Duração total em minutos' })
  duracaoMinutos: number;

  @ApiProperty({ description: 'Se o slot está disponível' })
  disponivel: boolean;

  @ApiProperty({ description: 'Motivo da indisponibilidade (se houver)' })
  motivo?: string;
}

export class ConflitosResponseDto {
  @ApiProperty({ description: 'Se há conflitos' })
  temConflito: boolean;

  @ApiProperty({ description: 'Lista de conflitos encontrados', type: [Object] })
  conflitos: Array<{
    tipo: 'AGENDAMENTO' | 'BLOQUEIO' | 'TURNO';
    descricao: string;
    dataHora: Date;
    agendamentoId?: string;
  }>;

  @ApiProperty({ description: 'Sugestões de horários alternativos', type: [SlotLivreDto] })
  sugestoes: SlotLivreDto[];
}

