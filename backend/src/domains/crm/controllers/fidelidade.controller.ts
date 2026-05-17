import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import { FidelidadeService } from '../services/fidelidade.service';

/**
 * 🎯 FIDELIDADE CONTROLLER
 * 
 * Endpoints para gestão do programa de fidelidade
 */

@ApiTags('CRM - Fidelidade')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm/fidelidade')
export class FidelidadeController {
  constructor(private readonly fidelidadeService: FidelidadeService) {}

  @Get('cliente/:clienteId')
  @ApiOperation({
    summary: 'Consultar pontos do cliente',
    description: 'Retorna os pontos de fidelidade de um cliente específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Pontos de fidelidade do cliente',
  })
  async consultarPontos(
    @Param('clienteId') clienteId: string,
    @Request() req: any,
  ) {
    return this.fidelidadeService.consultarPontos(
      clienteId,
      req.user.barbeariaId,
    );
  }

  @Post('cliente/:clienteId/adicionar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Adicionar pontos manualmente',
    description: 'Permite adicionar pontos de fidelidade manualmente para um cliente',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pontos: {
          type: 'number',
          description: 'Quantidade de pontos a adicionar',
          example: 50,
        },
        motivo: {
          type: 'string',
          description: 'Motivo da adição manual (opcional)',
          example: 'Bonificação especial',
        },
      },
      required: ['pontos'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pontos adicionados com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  async adicionarPontos(
    @Param('clienteId') clienteId: string,
    @Body('pontos') pontos: number,
    @Body('motivo') motivo: string,
    @Request() req: any,
  ) {
    return this.fidelidadeService.adicionarPontosManual(
      clienteId,
      req.user.barbeariaId,
      pontos,
      req.user.sub,
      motivo,
    );
  }

  @Post('cliente/:clienteId/resgatar')
  @ApiOperation({
    summary: 'Resgatar pontos do cliente',
    description: 'Permite que o cliente resgate pontos de fidelidade',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pontosUtilizados: {
          type: 'number',
          description: 'Quantidade de pontos a resgatar',
          example: 10,
        },
      },
      required: ['pontosUtilizados'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pontos resgatados com sucesso',
  })
  async resgatarPontos(
    @Param('clienteId') clienteId: string,
    @Body('pontosUtilizados') pontosUtilizados: number,
    @Request() req: any,
  ) {
    return this.fidelidadeService.resgatarPontos(
      clienteId,
      req.user.barbeariaId,
      pontosUtilizados,
      req.user.sub,
    );
  }

  @Get('top-clientes')
  @ApiOperation({
    summary: 'Top clientes por fidelidade',
    description: 'Lista os clientes com mais pontos de fidelidade',
  })
  @ApiQuery({ name: 'limite', required: false, description: 'Número de clientes (padrão: 10)' })
  async topClientes(
    @Request() req: any,
    @Query('limite') limite?: string,
  ) {
    const limiteNum = limite ? parseInt(limite) : 10;
    return this.fidelidadeService.topClientesFidelidade(
      req.user.barbeariaId,
      limiteNum,
    );
  }

  @Get('relatorio')
  @ApiOperation({
    summary: 'Relatório de fidelidade',
    description: 'Relatório completo do programa de fidelidade',
  })
  async relatorio(@Request() req: any) {
    return this.fidelidadeService.relatorioFidelidade(req.user.barbeariaId);
  }
}
