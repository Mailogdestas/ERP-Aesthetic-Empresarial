import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import { ConfigJurosService } from '../services/config-juros.service';
import { 
  CreateConfigJurosDto, 
  UpdateConfigJurosDto, 
  ConfigJurosResponseDto 
} from '../dto/config-juros.dto';

/**
 * ⚙️ CONFIG JUROS CONTROLLER
 * 
 * Endpoints:
 * - POST / - Criar configuração de juros
 * - PUT /:id - Atualizar configuração
 * - GET /barbearia - Buscar configuração da barbearia
 * - GET / - Listar todas as configurações (admin)
 */

@ApiTags('Configuração de Juros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('config-juros')
export class ConfigJurosController {
  constructor(private readonly configJurosService: ConfigJurosService) {}

  /**
   * 📝 Criar Configuração de Juros
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Criar configuração de juros',
    description: 'Cria uma nova configuração de juros para a barbearia'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Configuração criada com sucesso',
    type: ConfigJurosResponseDto
  })
  async criarConfig(
    @Body() dto: CreateConfigJurosDto,
    @Request() req: any,
  ): Promise<ConfigJurosResponseDto> {
    return this.configJurosService.criarConfig(
      dto,
      req.user.barbeariaId,
      req.user.id
    );
  }

  /**
   * ✏️ Atualizar Configuração
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Atualizar configuração de juros',
    description: 'Atualiza uma configuração existente de juros'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuração atualizada com sucesso',
    type: ConfigJurosResponseDto
  })
  async atualizarConfig(
    @Param('id') id: string,
    @Body() dto: UpdateConfigJurosDto,
    @Request() req: any,
  ): Promise<ConfigJurosResponseDto> {
    return this.configJurosService.atualizarConfig(id, dto, req.user.id);
  }

  /**
   * 🔍 Buscar Configuração da Barbearia
   */
  @Get('barbearia')
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Buscar configuração da barbearia',
    description: 'Retorna a configuração de juros da barbearia do usuário logado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuração encontrada',
    type: ConfigJurosResponseDto
  })
  async buscarPorBarbearia(
    @Request() req: any,
  ): Promise<ConfigJurosResponseDto | null> {
    return this.configJurosService.buscarPorBarbearia(req.user.barbeariaId);
  }

  /**
   * 📊 Listar Todas as Configurações
   * Apenas para administradores do sistema
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Listar todas as configurações',
    description: 'Lista todas as configurações de juros do sistema (apenas admin)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de configurações',
    type: [ConfigJurosResponseDto]
  })
  async listarTodas(): Promise<ConfigJurosResponseDto[]> {
    return this.configJurosService.listarTodas();
  }

  /**
   * 🔧 Obter ou Criar Configuração Padrão
   * Endpoint interno para garantir que sempre existe uma configuração
   */
  @Post('padrao')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.BARBER)
  @ApiOperation({ 
    summary: 'Obter ou criar configuração padrão',
    description: 'Retorna a configuração existente ou cria uma padrão se não existir'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuração padrão obtida/criada',
    type: ConfigJurosResponseDto
  })
  async obterOuCriarPadrao(
    @Request() req: any,
  ): Promise<ConfigJurosResponseDto> {
    const config = await this.configJurosService.obterOuCriarPadrao(req.user.barbeariaId);
    
    return {
      id: config.id,
      barbeariaId: config.barbeariaId,
      jurosPercentual: Number(config.jurosPercentual),
      jurosPorParcela: Number(config.jurosPorParcela),
      descontoAvista: config.descontoAvista ? Number(config.descontoAvista) : null,
      minValorParcela: config.minValorParcela ? Number(config.minValorParcela) : null,
      maxParcelas: config.maxParcelas,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      deletedAt: config.deletedAt,
      createdByUsuarioId: config.createdByUsuarioId,
      updatedByUsuarioId: config.updatedByUsuarioId,
    };
  }
}
