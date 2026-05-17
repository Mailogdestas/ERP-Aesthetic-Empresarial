import { applyDecorators, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * 🏷️ SOFT DELETE DECORATOR
 * 
 * Decorator que padroniza endpoints de soft delete
 * Garante consistência em todos os domínios
 */

export function SoftDelete(entityName: string) {
  return applyDecorators(
    Delete(':id'),
    HttpCode(HttpStatus.NO_CONTENT),
    ApiOperation({
      summary: `Soft delete ${entityName}`,
      description: `Marca ${entityName} como deletado sem remover do banco de dados`,
    }),
    ApiResponse({
      status: 204,
      description: `${entityName} deletado com sucesso`,
    }),
    ApiResponse({
      status: 404,
      description: `${entityName} não encontrado`,
    }),
    ApiResponse({
      status: 409,
      description: `${entityName} já foi deletado`,
    }),
  );
}

/**
 * Decorator para endpoint de restore
 */
export function RestoreDeleted(entityName: string) {
  return applyDecorators(
    Delete(':id/restore'),
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: `Restaurar ${entityName}`,
      description: `Restaura ${entityName} que foi deletado`,
    }),
    ApiResponse({
      status: 200,
      description: `${entityName} restaurado com sucesso`,
    }),
    ApiResponse({
      status: 404,
      description: `${entityName} não encontrado`,
    }),
  );
}
