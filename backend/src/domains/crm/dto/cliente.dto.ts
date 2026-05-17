import { IsString, IsEmail, IsOptional, IsDateString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 📝 DTOs DO DOMÍNIO CLIENTE
 */

export class CreateClienteDto {
  @ApiProperty({
    description: 'Nome completo do cliente',
    example: 'João Silva Santos',
  })
  @IsString()
  @Length(2, 100)
  nome: string;

  @ApiProperty({
    description: 'Telefone do cliente (formato brasileiro)',
    example: '(11) 99999-9999',
  })
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXXX-XXXX',
  })
  telefone: string;

  @ApiPropertyOptional({
    description: 'Email do cliente',
    example: 'joao@email.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Endereço completo do cliente',
    example: 'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567',
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  endereco?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento',
    example: '1990-05-15',
  })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre o cliente',
    example: 'Cliente preferencial, gosta de corte degradê',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  observacoes?: string;
}

export class UpdateClienteDto {
  @ApiPropertyOptional({
    description: 'Nome completo do cliente',
    example: 'João Silva Santos',
  })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nome?: string;

  @ApiPropertyOptional({
    description: 'Telefone do cliente (formato brasileiro)',
    example: '(11) 99999-9999',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXXX-XXXX',
  })
  telefone?: string;

  @ApiPropertyOptional({
    description: 'Email do cliente',
    example: 'joao@email.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento',
    example: '1990-05-15',
  })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre o cliente',
    example: 'Cliente preferencial, gosta de corte degradê',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  observacoes?: string;
}

export class ClienteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  telefone: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  endereco?: string;

  @ApiPropertyOptional()
  dataNascimento?: Date;

  @ApiPropertyOptional()
  observacoes?: string;

  @ApiProperty()
  barbeariaId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  // Dados relacionados (quando incluídos)
  @ApiPropertyOptional()
  fidelidade?: {
    pontos: number;
    nivel: string;
  };

  @ApiPropertyOptional()
  _count?: {
    agendamentos: number;
    vendas: number;
    historicoAtendimento: number;
  };
}

// DTO Básico - Para listagens e operações simples
export class ClienteBasicoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  telefone: string;

  @ApiPropertyOptional()
  email?: string;
}

// DTO Detalhado - Para operações internas e relatórios
export class ClienteDetalhadoDto extends ClienteBasicoDto {
  @ApiPropertyOptional()
  endereco?: string;

  @ApiPropertyOptional()
  dataNascimento?: Date;

  @ApiPropertyOptional()
  observacoes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  fidelidade?: {
    pontos: number;
    nivel: string;
  };

  @ApiPropertyOptional()
  _count?: {
    agendamentos: number;
    vendas: number;
    historicoAtendimento: number;
  };
}

// DTO Administrativo - Para auditoria e controle completo
export class ClienteAdministrativoDto extends ClienteDetalhadoDto {
  @ApiProperty()
  barbeariaId: string;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiPropertyOptional()
  createdByUsuarioId?: string;

  @ApiPropertyOptional()
  updatedByUsuarioId?: string;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    nome: string;
    email: string;
  };

  @ApiPropertyOptional()
  updatedBy?: {
    id: string;
    nome: string;
    email: string;
  };
}

export class ClienteHistoricoResponseDto {
  @ApiProperty()
  cliente: ClienteResponseDto;

  @ApiProperty()
  resumo: {
    totalAtendimentos: number;
    totalVendas: number;
    proximosAgendamentos: number;
    pontosFidelidade: number;
  };

  @ApiProperty()
  historico: {
    atendimentos: any[];
    vendas: any[];
    agendamentos: any[];
  };
}
