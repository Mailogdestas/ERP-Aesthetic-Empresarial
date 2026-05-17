import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { CampanhaService } from '../services/campanha.service';
import { SoftDelete } from '../../../shared/decorators/soft-delete.decorator';

/**
 * 📢 CAMPANHA CONTROLLER
 * 
 * Endpoints para gestão de campanhas de marketing
 */

@ApiTags('CRM - Campanhas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/campanhas')
export class CampanhaController {
  constructor(private readonly campanhaService: CampanhaService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar nova campanha',
    description: 'Cria uma nova campanha de marketing',
  })
  async criarCampanha(
    @Body() data: {
      nome: string;
      descricao?: string;
      tipo: 'PROMOCIONAL' | 'FIDELIDADE' | 'REATIVACAO' | 'ANIVERSARIO';
      dataInicio: string;
      dataFim: string;
      ativa: boolean;
    },
    @Request() req: any,
  ) {
    return this.campanhaService.criarCampanha(
      {
        ...data,
        dataInicio: new Date(data.dataInicio),
        dataFim: new Date(data.dataFim),
      },
      req.user.barbeariaId,
      req.user.userId, // Corrigido: era req.user.sub
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar campanhas',
    description: 'Lista todas as campanhas da barbearia',
  })
  async listarCampanhas(
    @Request() req: any,
    @Query('ativa') ativa?: string,
    @Query('tipo') tipo?: string,
  ) {
    const filtros: any = {};
    
    if (ativa !== undefined) {
      filtros.ativa = ativa === 'true';
    }
    
    if (tipo) {
      filtros.tipo = tipo;
    }

    return this.campanhaService.listarCampanhas(
      req.user.barbeariaId,
      filtros,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar campanha por ID',
    description: 'Retorna os dados de uma campanha específica',
  })
  async buscarCampanha(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const campanha = await this.campanhaService.findById(id);
    
    if (!campanha || campanha.barbeariaId !== req.user.barbeariaId) {
      throw new Error('Campanha não encontrada');
    }

    return campanha;
  }

  @Post(':id/segmentar')
  @ApiOperation({
    summary: 'Segmentar clientes para campanha',
    description: 'Define quais clientes serão impactados pela campanha',
  })
  async segmentarClientes(
    @Param('id') id: string,
    @Body() filtros: {
      nivel_fidelidade?: string[];
      ultima_visita_dias?: number;
      gasto_minimo?: number;
      aniversariantes?: boolean;
    },
    @Request() req: any,
  ) {
    return this.campanhaService.segmentarClientes(
      id,
      req.user.barbeariaId,
      filtros,
    );
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Alterar status da campanha',
    description: 'Ativa ou desativa uma campanha',
  })
  async alterarStatus(
    @Param('id') id: string,
    @Body('ativa') ativa: boolean,
    @Request() req: any,
  ) {
    return this.campanhaService.alterarStatusCampanha(
      id,
      req.user.barbeariaId,
      ativa,
      req.user.userId, // Corrigido: era req.user.sub
    );
  }

  @Get(':id/performance')
  @ApiOperation({
    summary: 'Performance da campanha',
    description: 'Retorna métricas de performance da campanha',
  })
  async performance(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.campanhaService.performanceCampanha(
      id,
      req.user.barbeariaId,
    );
  }

  @SoftDelete('Campanha')
  async deletarCampanha(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    await this.campanhaService.deletarCampanha(
      id,
      req.user.barbeariaId,
      req.user.userId, // Corrigido: era req.user.sub
    );
  }
}
