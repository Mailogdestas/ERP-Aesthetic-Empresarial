import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MensagemTemplateService } from '../services/mensagem-template.service';
import {
  CreateMensagemTemplateDto,
  UpdateMensagemTemplateDto,
  MensagemTemplateResponseDto,
  QueryMensagemTemplateDto,
  ProcessarTemplateDto,
  ProcessarTemplateResponseDto,
} from '../dto/mensagem-template.dto';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';

@ApiTags('Templates de Mensagem')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mensagem-templates')
export class MensagemTemplateController {
  constructor(private readonly mensagemTemplateService: MensagemTemplateService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar novo template de mensagem' })
  @ApiResponse({ status: 201, description: 'Template criado com sucesso', type: MensagemTemplateResponseDto })
  async criarTemplate(
    @Body() dto: CreateMensagemTemplateDto,
    @Request() req: any
  ): Promise<MensagemTemplateResponseDto> {
    return await this.mensagemTemplateService.criarTemplate({
      ...dto,
      barbeariaId: req.user.barbeariaId,
      createdByUsuarioId: req.user.id
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar templates de mensagem' })
  @ApiResponse({ status: 200, description: 'Lista de templates' })
  async listarTemplates(
    @Query() query: QueryMensagemTemplateDto,
    @Request() req: any
  ): Promise<{ templates: MensagemTemplateResponseDto[]; total: number }> {
    return await this.mensagemTemplateService.listarTemplates(req.user.barbeariaId, query);
  }

  @Get('padrao')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Obter templates padrão do sistema' })
  @ApiResponse({ status: 200, description: 'Lista de templates padrão' })
  async obterTemplatesPadrao() {
    return await this.mensagemTemplateService.obterTemplatesPadrao();
  }

  @Get('tipo/:tipo')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar templates por tipo' })
  @ApiResponse({ status: 200, description: 'Lista de templates do tipo especificado' })
  async listarTemplatesPorTipo(
    @Param('tipo') tipo: string,
    @Request() req: any
  ): Promise<MensagemTemplateResponseDto[]> {
    return await this.mensagemTemplateService.listarTemplatesPorTipo(req.user.barbeariaId, tipo);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar template por ID' })
  @ApiResponse({ status: 200, description: 'Template encontrado', type: MensagemTemplateResponseDto })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async buscarTemplate(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<MensagemTemplateResponseDto> {
    return await this.mensagemTemplateService.buscarTemplate(id, req.user.barbeariaId);
  }

  @Get(':id/validar-variaveis')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Validar variáveis do template' })
  @ApiResponse({ status: 200, description: 'Validação das variáveis' })
  async validarVariaveis(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return await this.mensagemTemplateService.validarVariaveis(id, req.user.barbeariaId);
  }

  @Post('processar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Processar template substituindo variáveis' })
  @ApiResponse({ status: 200, description: 'Template processado com sucesso' })
  async processarTemplate(
    @Body() dto: ProcessarTemplateDto,
    @Request() req: any
  ): Promise<{ conteudoProcessado: string }> {
    return await this.mensagemTemplateService.processarTemplate({
      ...dto,
      barbeariaId: req.user.barbeariaId
    });
  }

  @Post(':id/duplicar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Duplicar template' })
  @ApiResponse({ status: 201, description: 'Template duplicado com sucesso', type: MensagemTemplateResponseDto })
  async duplicarTemplate(
    @Param('id') id: string,
    @Body() body: { novoNome: string },
    @Request() req: any
  ): Promise<MensagemTemplateResponseDto> {
    return await this.mensagemTemplateService.duplicarTemplate(
      id,
      req.user.barbeariaId,
      body.novoNome,
      req.user.id
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar template' })
  @ApiResponse({ status: 200, description: 'Template atualizado com sucesso', type: MensagemTemplateResponseDto })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async atualizarTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateMensagemTemplateDto,
    @Request() req: any
  ): Promise<MensagemTemplateResponseDto> {
    return await this.mensagemTemplateService.atualizarTemplate(
      id,
      req.user.barbeariaId,
      {
        ...dto,
        updatedByUsuarioId: req.user.id
      }
    );
  }

  @Put(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Alternar status do template (ativo/inativo)' })
  @ApiResponse({ status: 200, description: 'Status alterado com sucesso', type: MensagemTemplateResponseDto })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async alternarStatusTemplate(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<MensagemTemplateResponseDto> {
    return await this.mensagemTemplateService.alternarStatusTemplate(id, req.user.barbeariaId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover template' })
  @ApiResponse({ status: 204, description: 'Template removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Template não encontrado' })
  async removerTemplate(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<void> {
    await this.mensagemTemplateService.removerTemplate(id, req.user.barbeariaId);
  }
}