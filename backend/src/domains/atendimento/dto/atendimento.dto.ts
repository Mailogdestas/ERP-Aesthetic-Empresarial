import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsDateString, 
  IsOptional, 
  IsUUID,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsEnum
} from 'class-validator';

export enum StatusAtendimento {
  INICIADO = 'INICIADO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO'
}

export enum AvaliacaoAtendimento {
  MUITO_RUIM = 1,
  RUIM = 2,
  REGULAR = 3,
  BOM = 4,
  EXCELENTE = 5
}

// ===== HISTÓRICO ATENDIMENTO DTOs =====

export class CreateHistoricoAtendimentoDto {
  @ApiProperty({ description: 'ID do agendamento relacionado' })
  @IsNotEmpty()
  @IsUUID()
  agendamentoId: string;

  @ApiProperty({ description: 'ID do cliente' })
  @IsNotEmpty()
  @IsUUID()
  clienteId: string;

  @ApiProperty({ description: 'ID do barbeiro' })
  @IsNotEmpty()
  @IsUUID()
  barbeiroId: string;

  @ApiProperty({ description: 'IDs dos serviços realizados', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  servicoIds: string[];

  @ApiProperty({ description: 'Data e hora de início do atendimento' })
  @IsNotEmpty()
  @IsDateString()
  dataHoraInicio: string;

  @ApiPropertyOptional({ description: 'Data e hora de fim do atendimento' })
  @IsOptional()
  @IsDateString()
  dataHoraFim?: string;

  @ApiPropertyOptional({ description: 'Observações do atendimento' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ description: 'Status do atendimento', enum: StatusAtendimento })
  @IsOptional()
  @IsEnum(StatusAtendimento)
  status?: StatusAtendimento;
}

export class UpdateHistoricoAtendimentoDto {
  @ApiPropertyOptional({ description: 'Data e hora de fim do atendimento' })
  @IsOptional()
  @IsDateString()
  dataHoraFim?: string;

  @ApiPropertyOptional({ description: 'Observações do atendimento' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ description: 'Status do atendimento', enum: StatusAtendimento })
  @IsOptional()
  @IsEnum(StatusAtendimento)
  status?: StatusAtendimento;

  @ApiPropertyOptional({ description: 'Avaliação do cliente', enum: AvaliacaoAtendimento })
  @IsOptional()
  @IsEnum(AvaliacaoAtendimento)
  avaliacaoCliente?: AvaliacaoAtendimento;

  @ApiPropertyOptional({ description: 'Comentário da avaliação' })
  @IsOptional()
  @IsString()
  comentarioAvaliacao?: string;
}

export class HistoricoAtendimentoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  agendamentoId: string;

  @ApiProperty()
  clienteId: string;

  @ApiProperty()
  barbeiroId: string;

  @ApiProperty()
  dataHoraInicio: Date;

  @ApiProperty()
  dataHoraFim: Date;

  @ApiProperty()
  duracaoMinutos: number;

  @ApiProperty({ enum: StatusAtendimento })
  status: StatusAtendimento;

  @ApiProperty()
  observacoes: string;

  @ApiProperty({ enum: AvaliacaoAtendimento })
  avaliacaoCliente: AvaliacaoAtendimento;

  @ApiProperty()
  comentarioAvaliacao: string;

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

  @ApiProperty()
  agendamento: {
    id: string;
    dataHora: Date;
    status: string;
  };

  @ApiProperty({ type: [Object] })
  servicos: Array<{
    id: string;
    nome: string;
    duracaoMinutos: number;
    preco: number;
  }>;
}

// ===== CONSULTAS E RELATÓRIOS =====

export class AtendimentoHistoricoQueryDto {
  @ApiPropertyOptional({ description: 'Data de início', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data de fim', example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'ID do barbeiro para filtrar' })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiPropertyOptional({ description: 'ID do cliente para filtrar' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Status para filtrar', enum: StatusAtendimento })
  @IsOptional()
  @IsEnum(StatusAtendimento)
  status?: StatusAtendimento;

  @ApiPropertyOptional({ description: 'Avaliação mínima para filtrar', enum: AvaliacaoAtendimento })
  @IsOptional()
  @IsEnum(AvaliacaoAtendimento)
  avaliacaoMinima?: AvaliacaoAtendimento;
}

export class RelatorioAtendimentoDto {
  @ApiProperty({ description: 'Período do relatório' })
  periodo: {
    dataInicio: Date;
    dataFim: Date;
  };

  @ApiProperty({ description: 'Estatísticas gerais' })
  estatisticas: {
    totalAtendimentos: number;
    atendimentosConcluidos: number;
    atendimentosCancelados: number;
    tempoMedioAtendimento: number;
    avaliacaoMedia: number;
  };

  @ApiProperty({ description: 'Performance por barbeiro' })
  performanceBarbeiros: Array<{
    barbeiroId: string;
    barbeiro: string;
    totalAtendimentos: number;
    tempoMedio: number;
    avaliacaoMedia: number;
    clientesUnicos: number;
  }>;

  @ApiProperty({ description: 'Serviços mais realizados' })
  servicosPopulares: Array<{
    servicoId: string;
    servico: string;
    quantidade: number;
    tempoMedio: number;
  }>;

  @ApiProperty({ description: 'Distribuição de avaliações' })
  distribuicaoAvaliacoes: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
