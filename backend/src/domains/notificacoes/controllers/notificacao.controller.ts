import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import { NotificacaoService } from '../services';
import {
  CreateNotificacaoDto,
  UpdateNotificacaoDto,
  NotificacaoResponseDto,
  QueryNotificacaoDto,
  EnviarNotificacaoDto
} from '../dto';

@ApiTags('Notificações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notificacoes')
export class NotificacaoController {
  constructor(private readonly notificacaoService: NotificacaoService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar nova notificação' })
  @ApiResponse({ status: 201, description: 'Notificação criada com sucesso', type: NotificacaoResponseDto })
  async criarNotificacao(
    @Body() dto: CreateNotificacaoDto,
    @Request() req: any
  ): Promise<NotificacaoResponseDto> {
    return await this.notificacaoService.criarNotificacao({
      ...dto,
      barbeariaId: req.user.barbeariaId
    });
  }

  @Post('enviar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Enviar notificação específica' })
  @ApiResponse({ status: 201, description: 'Notificação enviada com sucesso', type: NotificacaoResponseDto })
  async enviarNotificacao(
    @Body() dto: EnviarNotificacaoDto,
    @Request() req: any
  ): Promise<NotificacaoResponseDto> {
    return await this.notificacaoService.enviarNotificacao(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar notificações' })
  @ApiResponse({ status: 200, description: 'Lista de notificações' })
  async listarNotificacoes(
    @Query() query: QueryNotificacaoDto,
    @Request() req: any
  ): Promise<{ notificacoes: NotificacaoResponseDto[]; total: number }> {
    return await this.notificacaoService.listarNotificacoes(req.user.barbeariaId, query);
  }

  @Get('estatisticas')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Obter estatísticas de notificações' })
  @ApiResponse({ status: 200, description: 'Estatísticas das notificações' })
  async obterEstatisticas(
    @Query('dias') dias: string = '30',
    @Request() req: any
  ) {
    return await this.notificacaoService.obterEstatisticas(
      req.user.barbeariaId, 
      parseInt(dias)
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar notificação por ID' })
  @ApiResponse({ status: 200, description: 'Notificação encontrada', type: NotificacaoResponseDto })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async buscarNotificacao(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<NotificacaoResponseDto> {
    return await this.notificacaoService.buscarNotificacao(id, req.user.barbeariaId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar notificação' })
  @ApiResponse({ status: 200, description: 'Notificação atualizada com sucesso', type: NotificacaoResponseDto })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async atualizarNotificacao(
    @Param('id') id: string,
    @Body() dto: UpdateNotificacaoDto,
    @Request() req: any
  ): Promise<NotificacaoResponseDto> {
    return await this.notificacaoService.atualizarNotificacao(
      id, 
      req.user.barbeariaId, 
      dto
    );
  }

  @Put(':id/enviada')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar notificação como enviada' })
  @ApiResponse({ status: 204, description: 'Notificação marcada como enviada' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async marcarComoEnviada(@Param('id') id: string): Promise<void> {
    await this.notificacaoService.marcarComoEnviada(id);
  }

  @Put(':id/erro')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar notificação como erro' })
  @ApiResponse({ status: 204, description: 'Notificação marcada como erro' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async marcarComoErro(
    @Param('id') id: string,
    @Body() body: { erro?: string }
  ): Promise<void> {
    await this.notificacaoService.marcarComoErro(id, body.erro);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover notificação' })
  @ApiResponse({ status: 204, description: 'Notificação removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async removerNotificacao(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<void> {
    await this.notificacaoService.removerNotificacao(id, req.user.barbeariaId);
  }
}