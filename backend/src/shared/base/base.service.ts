import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * 🗑️ BASE SERVICE COM SOFT DELETE
 * 
 * Classe base que implementa soft delete para todos os domínios
 * Garante que nenhum dado seja perdido permanentemente
 */

export interface SoftDeleteEntity {
  id: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditableEntity extends SoftDeleteEntity {
  createdByUsuarioId?: string | null;
  updatedByUsuarioId?: string | null;
}

@Injectable()
export abstract class BaseService<T extends SoftDeleteEntity> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  /**
   * Busca todos os registros não deletados
   */
  async findMany(where: any = {}, include?: any): Promise<T[]> {
    const model = this.getModel();
    return model.findMany({
      where: {
        ...where,
        deletedAt: null, // Só registros não deletados
      },
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca um registro por ID (não deletado)
   */
  async findById(id: string, include?: any): Promise<T | null> {
    const model = this.getModel();
    return model.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include,
    });
  }

  /**
   * Busca um registro único (não deletado)
   */
  async findUnique(where: any, include?: any): Promise<T | null> {
    const model = this.getModel();
    return model.findFirst({
      where: {
        ...where,
        deletedAt: null,
      },
      include,
    });
  }

  /**
   * Cria um novo registro
   */
  async create(data: any, usuarioId?: string): Promise<T> {
    console.log('🏗️ BASE SERVICE - INICIANDO CRIAÇÃO');
    console.log('📋 Dados recebidos:', JSON.stringify(data, null, 2));
    console.log('👤 Usuario ID:', usuarioId);
    console.log('🏷️ Model name:', this.modelName);
    
    try {
      console.log('🔄 Preparando dados finais...');
      const finalData = {
        ...data,
        createdByUsuarioId: usuarioId,
        updatedByUsuarioId: usuarioId,
      };
      
      console.log('📊 Dados finais para criação:', JSON.stringify(finalData, null, 2));
      console.log('🔥 Chamando prisma.create...');
      
      const model = this.getModel();
      console.log('📋 Model obtido:', model ? 'SIM' : 'NÃO');
      
      const result = await model.create({
        data: finalData,
      });
      
      console.log('✅ BASE SERVICE - CRIAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('🆔 ID do registro criado:', result.id);
      console.log('📋 Resultado completo:', JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.log('❌ BASE SERVICE - ERRO NA CRIAÇÃO');
      console.log('🔥 Tipo do erro:', error.constructor.name);
      console.log('📋 Mensagem do erro:', error.message);
      console.log('📊 Stack trace:', error.stack);
      
      if (error.code) {
        console.log('🔢 Código do erro Prisma:', error.code);
      }
      
      if (error.meta) {
        console.log('📋 Meta do erro Prisma:', JSON.stringify(error.meta, null, 2));
      }
      
      if (error.clientVersion) {
        console.log('🔧 Versão do cliente Prisma:', error.clientVersion);
      }
      
      throw error;
    }
  }

  /**
   * Atualiza um registro (soft delete check)
   */
  async update(id: string, data: any, usuarioId?: string): Promise<T> {
    const model = this.getModel();
    
    // Verifica se o registro existe e não foi deletado
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`${this.modelName} não encontrado ou foi deletado`);
    }

    return model.update({
      where: { id },
      data: {
        ...data,
        updatedByUsuarioId: usuarioId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * SOFT DELETE - marca como deletado sem remover do banco
   */
  async softDelete(id: string, usuarioId?: string): Promise<T> {
    const model = this.getModel();
    
    // Verifica se o registro existe e não foi deletado
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`${this.modelName} não encontrado ou já foi deletado`);
    }

    return model.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedByUsuarioId: usuarioId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * RESTORE - restaura um registro deletado
   */
  async restore(id: string, usuarioId?: string): Promise<T> {
    const model = this.getModel();
    
    return model.update({
      where: { id },
      data: {
        deletedAt: null,
        updatedByUsuarioId: usuarioId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Busca registros deletados (para auditoria)
   */
  async findDeleted(where: any = {}): Promise<T[]> {
    const model = this.getModel();
    return model.findMany({
      where: {
        ...where,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * HARD DELETE - remove permanentemente (usar com extrema cautela)
   */
  async hardDelete(id: string): Promise<void> {
    const model = this.getModel();
    await model.delete({
      where: { id },
    });
  }

  /**
   * Conta registros não deletados
   */
  async count(where: any = {}): Promise<number> {
    const model = this.getModel();
    return model.count({
      where: {
        ...where,
        deletedAt: null,
      },
    });
  }

  /**
   * Verifica se existe (não deletado)
   */
  async exists(where: any): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Obtém o modelo Prisma correspondente
   */
  private getModel() {
    return (this.prisma as any)[this.modelName];
  }
}
