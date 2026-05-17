import { Injectable } from '@nestjs/common';
import { 
  ClienteBasicoDto, 
  ClienteDetalhadoDto, 
  ClienteAdministrativoDto,
  ClienteResponseDto 
} from '../dto/cliente.dto';

@Injectable()
export class ClienteTransformerService {
  
  /**
   * Converte dados do cliente para DTO básico
   * Usado em listagens simples e seleções
   */
  toBasico(cliente: any): ClienteBasicoDto {
    return {
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
    };
  }

  /**
   * Converte dados do cliente para DTO detalhado
   * Usado em operações internas e relatórios
   */
  toDetalhado(cliente: any): ClienteDetalhadoDto {
    return {
      ...this.toBasico(cliente),
      endereco: cliente.endereco,
      dataNascimento: cliente.dataNascimento,
      observacoes: cliente.observacoes,
      createdAt: cliente.createdAt,
      updatedAt: cliente.updatedAt,
      fidelidade: cliente.fidelidade ? {
        pontos: cliente.fidelidade.pontos,
        nivel: cliente.fidelidade.nivel,
      } : undefined,
      _count: cliente._count,
    };
  }

  /**
   * Converte dados do cliente para DTO administrativo
   * Usado para auditoria e controle completo
   */
  toAdministrativo(cliente: any): ClienteAdministrativoDto {
    return {
      ...this.toDetalhado(cliente),
      barbeariaId: cliente.barbeariaId,
      deletedAt: cliente.deletedAt,
      createdByUsuarioId: cliente.createdByUsuarioId,
      updatedByUsuarioId: cliente.updatedByUsuarioId,
      createdBy: cliente.createdBy ? {
        id: cliente.createdBy.id,
        nome: cliente.createdBy.nome,
        email: cliente.createdBy.email,
      } : undefined,
      updatedBy: cliente.updatedBy ? {
        id: cliente.updatedBy.id,
        nome: cliente.updatedBy.nome,
        email: cliente.updatedBy.email,
      } : undefined,
    };
  }

  /**
   * Converte dados do cliente para DTO padrão (mantém compatibilidade)
   * Equivale ao DTO detalhado + campos administrativos básicos
   */
  toResponse(cliente: any): ClienteResponseDto {
    return {
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      endereco: cliente.endereco,
      dataNascimento: cliente.dataNascimento,
      observacoes: cliente.observacoes,
      barbeariaId: cliente.barbeariaId,
      createdAt: cliente.createdAt,
      updatedAt: cliente.updatedAt,
      deletedAt: cliente.deletedAt,
      fidelidade: cliente.fidelidade ? {
        pontos: cliente.fidelidade.pontos,
        nivel: cliente.fidelidade.nivel,
      } : undefined,
      _count: cliente._count,
    };
  }

  /**
   * Converte array de clientes para DTO básico
   */
  toBasicoArray(clientes: any[]): ClienteBasicoDto[] {
    return clientes.map(cliente => this.toBasico(cliente));
  }

  /**
   * Converte array de clientes para DTO detalhado
   */
  toDetalhadoArray(clientes: any[]): ClienteDetalhadoDto[] {
    return clientes.map(cliente => this.toDetalhado(cliente));
  }

  /**
   * Converte array de clientes para DTO administrativo
   */
  toAdministrativoArray(clientes: any[]): ClienteAdministrativoDto[] {
    return clientes.map(cliente => this.toAdministrativo(cliente));
  }

  /**
   * Converte array de clientes para DTO padrão
   */
  toResponseArray(clientes: any[]): ClienteResponseDto[] {
    return clientes.map(cliente => this.toResponse(cliente));
  }
}