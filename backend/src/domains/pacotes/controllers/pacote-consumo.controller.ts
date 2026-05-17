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
import { PacoteConsumoService } from '../services/pacote-consumo.service';
import {
  CreatePacoteConsumoDto,
  UpdatePacoteConsumoDto,
  PacoteConsumoResponseDto,
  QueryPacoteConsumoDto,
  ConsumirPacoteDto,
} from '../dto/pacote-consumo.dto';

@ApiTags('Pacote Consumo')
@ApiBearerAuth()
@Controller('pacotes-consumo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PacoteConsumoController {
  constructor(private readonly pacoteConsumoService: PacoteConsumoService) {}

  @Post('consumir')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Consumir serviço do pacote' })
  @ApiResponse({ status: 201, description: 'Serviço consumido com sucesso', type: PacoteConsumoResponseDto })
  async consumirPacote(
    @Body() consumirPacoteDto: ConsumirPacoteDto,
    @Request() req: any,
  ): Promise<PacoteConsumoResponseDto> {
    return this.pacoteConsumoService.consumirPacote(
      consumirPacoteDto,
      req.user.barbeariaId,
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar registro de consumo' })
  @ApiResponse({ status: 201, description: 'Consumo criado com sucesso', type: PacoteConsumoResponseDto })
  async criarConsumo(
    @Body() createConsumoDto: CreatePacoteConsumoDto,
    @Request() req: any,
  ): Promise<PacoteConsumoResponseDto> {
    return this.pacoteConsumoService.criarConsumo({
      ...createConsumoDto,
      barbeariaId: req.user.barbeariaId,
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar consumos de pacotes' })
  @ApiResponse({ status: 200, description: 'Lista de consumos' })
  async listarConsumos(
    @Request() req: any,
    @Query() query: QueryPacoteConsumoDto,
  ) {
    return this.pacoteConsumoService.listarConsumos(req.user.barbeariaId, query);
  }

  @Get('estatisticas')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Obter estatísticas de consumo' })
  @ApiResponse({ status: 200, description: 'Estatísticas de consumo' })
  async obterEstatisticas(
    @Request() req: any,
  ) {
    return this.pacoteConsumoService.obterEstatisticasConsumo(req.user.barbeariaId);
  }

  @Get('cliente/:clienteId/saldo')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Obter saldo de pacotes do cliente' })
  @ApiResponse({ status: 200, description: 'Saldo de pacotes do cliente' })
  async obterSaldoCliente(
    @Param('clienteId') clienteId: string,
    @Request() req: any,
  ) {
    return this.pacoteConsumoService.obterSaldoPacotesCliente(clienteId, req.user.barbeariaId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar consumo por ID' })
  @ApiResponse({ status: 200, description: 'Consumo encontrado', type: PacoteConsumoResponseDto })
  async buscarConsumo(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<PacoteConsumoResponseDto> {
    return this.pacoteConsumoService.buscarConsumo(id, req.user.barbeariaId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar consumo' })
  @ApiResponse({ status: 200, description: 'Consumo atualizado com sucesso', type: PacoteConsumoResponseDto })
  async atualizarConsumo(
    @Param('id') id: string,
    @Body() updateConsumoDto: UpdatePacoteConsumoDto,
    @Request() req: any,
  ): Promise<PacoteConsumoResponseDto> {
    return this.pacoteConsumoService.atualizarConsumo(
      id,
      req.user.barbeariaId,
      updateConsumoDto,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Remover consumo' })
  @ApiResponse({ status: 200, description: 'Consumo removido com sucesso' })
  async removerConsumo(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    return this.pacoteConsumoService.removerConsumo(id, req.user.barbeariaId);
  }
}