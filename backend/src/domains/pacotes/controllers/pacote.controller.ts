import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import { PacoteService } from '../services/pacote.service';
import {
  CreatePacoteDto,
  UpdatePacoteDto,
  PacoteResponseDto,
  QueryPacoteDto,
} from '../dto/pacote.dto';

@ApiTags('Pacotes')
@ApiBearerAuth()
@Controller('pacotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PacoteController {
  constructor(private readonly pacoteService: PacoteService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar novo pacote' })
  @ApiResponse({ status: 201, description: 'Pacote criado com sucesso', type: PacoteResponseDto })
  async criarPacote(
    @Body() createPacoteDto: CreatePacoteDto,
    @Request() req: any,
  ): Promise<PacoteResponseDto> {
    return this.pacoteService.criarPacote({
      ...createPacoteDto,
      barbeariaId: req.user.barbeariaId,
      createdByUsuarioId: req.user.userId, // Corrigido: era req.user.sub
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar pacotes' })
  @ApiResponse({ status: 200, description: 'Lista de pacotes' })
  async listarPacotes(
    @Request() req: any,
    @Query() query: QueryPacoteDto,
  ) {
    return this.pacoteService.listarPacotes(req.user.barbeariaId, query);
  }

  @Get('ativos')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar apenas pacotes ativos' })
  @ApiResponse({ status: 200, description: 'Lista de pacotes ativos' })
  async listarPacotesAtivos(
    @Request() req: any,
    @Query() query: QueryPacoteDto,
  ) {
    return this.pacoteService.listarPacotes(req.user.barbeariaId, { ...query, ativo: true });
  }

  @Get('estatisticas')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Obter estatísticas dos pacotes' })
  @ApiResponse({ status: 200, description: 'Estatísticas dos pacotes' })
  async obterEstatisticas(
    @Request() req: any,
  ) {
    return this.pacoteService.obterEstatisticasPacotes(req.user.barbeariaId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar pacote por ID' })
  @ApiResponse({ status: 200, description: 'Pacote encontrado', type: PacoteResponseDto })
  async buscarPacote(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<PacoteResponseDto> {
    return this.pacoteService.buscarPacote(id, req.user.barbeariaId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar pacote' })
  @ApiResponse({ status: 200, description: 'Pacote atualizado com sucesso', type: PacoteResponseDto })
  async atualizarPacote(
    @Param('id') id: string,
    @Body() updatePacoteDto: UpdatePacoteDto,
    @Request() req: any,
  ): Promise<PacoteResponseDto> {
    return this.pacoteService.atualizarPacote(
      id,
      req.user.barbeariaId,
      updatePacoteDto,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Remover pacote' })
  @ApiResponse({ status: 200, description: 'Pacote removido com sucesso' })
  async removerPacote(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    return this.pacoteService.removerPacote(id, req.user.barbeariaId);
  }

  @Put(':id/ativar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Ativar pacote' })
  @ApiResponse({ status: 200, description: 'Pacote ativado com sucesso', type: PacoteResponseDto })
  async ativarPacote(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<PacoteResponseDto> {
    return this.pacoteService.ativarPacote(id, req.user.barbeariaId, req.user.userId); // Corrigido: era req.user.sub
  }

  @Put(':id/desativar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Desativar pacote' })
  @ApiResponse({ status: 200, description: 'Pacote desativado com sucesso', type: PacoteResponseDto })
  async desativarPacote(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<PacoteResponseDto> {
    return this.pacoteService.desativarPacote(id, req.user.barbeariaId, req.user.userId); // Corrigido: era req.user.sub
  }

  @Post(':id/duplicar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Duplicar pacote' })
  @ApiResponse({ status: 201, description: 'Pacote duplicado com sucesso', type: PacoteResponseDto })
  async duplicarPacote(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<PacoteResponseDto> {
    return this.pacoteService.duplicarPacote(id, req.user.barbeariaId, req.user.userId); // Corrigido: era req.user.sub
  }
}