import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import { FechamentoDiarioService } from '../services/fechamento-diario.service';
import {
  CreateFechamentoDiarioDto,
  UpdateFechamentoDiarioDto,
  FechamentoDiarioResponseDto,
  FechamentoDiarioQueryDto,
  ProcessarFechamentoDiarioDto
} from '../dto';

@ApiTags('Fechamento Diário')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fechamento-diario')
export class FechamentoDiarioController {
  constructor(
    private readonly fechamentoDiarioService: FechamentoDiarioService
  ) {}

  @Post('processar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Processar fechamento diário automaticamente' })
  @ApiResponse({
    status: 201,
    description: 'Fechamento processado com sucesso',
    type: FechamentoDiarioResponseDto
  })
  async processarFechamento(
    @Body() dto: ProcessarFechamentoDiarioDto,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.processarFechamentoDiario(
      req.user.barbeariaId,
      req.user.userId, // Corrigido: era req.user.sub
      dto
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar fechamento diário manual' })
  @ApiResponse({
    status: 201,
    description: 'Fechamento criado com sucesso',
    type: FechamentoDiarioResponseDto
  })
  async criarFechamento(
    @Body() dto: CreateFechamentoDiarioDto,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.criarFechamento(
      req.user.barbeariaId,
      req.user.userId, // Corrigido: era req.user.sub
      dto
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar fechamentos diários' })
  @ApiQuery({ name: 'dataInicial', required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dataFinal', required: false, description: 'Data final (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, description: 'Página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página' })
  @ApiResponse({
    status: 200,
    description: 'Lista de fechamentos',
    type: [FechamentoDiarioResponseDto]
  })
  async listarFechamentos(
    @Query() query: FechamentoDiarioQueryDto,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.listarFechamentos(
      req.user.barbeariaId,
      query
    );
  }

  @Get('data/:data')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar fechamento por data' })
  @ApiParam({ name: 'data', description: 'Data do fechamento (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Fechamento encontrado',
    type: FechamentoDiarioResponseDto
  })
  async buscarFechamentoPorData(
    @Param('data') data: string,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.buscarFechamentoPorData(
      req.user.barbeariaId,
      data
    );
  }

  @Get('resumo')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Resumo de fechamentos por período' })
  @ApiQuery({ name: 'dataInicial', required: true, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dataFinal', required: true, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Resumo dos fechamentos'
  })
  async resumoFechamentos(
    @Query('dataInicial') dataInicial: string,
    @Query('dataFinal') dataFinal: string,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.resumoFechamentos(
      req.user.barbeariaId,
      dataInicial,
      dataFinal
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar fechamento por ID' })
  @ApiParam({ name: 'id', description: 'ID do fechamento' })
  @ApiResponse({
    status: 200,
    description: 'Fechamento encontrado',
    type: FechamentoDiarioResponseDto
  })
  async buscarFechamento(
    @Param('id') id: string,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.buscarFechamento(
      req.user.barbeariaId,
      id
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar fechamento (conferência)' })
  @ApiParam({ name: 'id', description: 'ID do fechamento' })
  @ApiResponse({
    status: 200,
    description: 'Fechamento atualizado com sucesso',
    type: FechamentoDiarioResponseDto
  })
  async atualizarFechamento(
    @Param('id') id: string,
    @Body() dto: UpdateFechamentoDiarioDto,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.atualizarFechamento(
      req.user.barbeariaId,
      id,
      dto
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Remover fechamento diário' })
  @ApiParam({ name: 'id', description: 'ID do fechamento' })
  @ApiResponse({
    status: 200,
    description: 'Fechamento removido com sucesso'
  })
  async removerFechamento(
    @Param('id') id: string,
    @Req() req: any
  ) {
    return this.fechamentoDiarioService.removerFechamento(
      req.user.barbeariaId,
      id
    );
  }
}