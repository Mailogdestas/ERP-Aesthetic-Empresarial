import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceiroService } from '../services/financeiro.service';
import { CreateDespesaDto, CreateComissaoDto, CreateRepasseDto, PagarDespesaDto, PagarDespesaResponseDto } from '../dto';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';

@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Post('despesas')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Registrar nova despesa' })
  @ApiResponse({ status: 201, description: 'Despesa registrada com sucesso' })
  async createDespesa(@Body() createDespesaDto: CreateDespesaDto) {
    return this.financeiroService.createDespesa(createDespesaDto);
  }

  @Get('despesas/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar despesas da barbearia' })
  @ApiResponse({ status: 200, description: 'Lista de despesas' })
  async findDespesas(
    @Param('barbeariaId') barbeariaId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('categoria') categoria?: string,
  ) {
    return this.financeiroService.findDespesas({
      barbeariaId,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      categoria,
    });
  }

  @Post('comissoes')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Calcular comissão de barbeiro' })
  @ApiResponse({ status: 201, description: 'Comissão calculada com sucesso' })
  async createComissao(@Body() createComissaoDto: CreateComissaoDto) {
    return this.financeiroService.createComissao(createComissaoDto);
  }

  @Get('comissoes/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar comissões da barbearia' })
  @ApiResponse({ status: 200, description: 'Lista de comissões' })
  async findComissoes(
    @Param('barbeariaId') barbeariaId: string,
    @Query('barbeiroId') barbeiroId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('status') status?: string,
  ) {
    return this.financeiroService.findComissoes({
      barbeariaId,
      barbeiroId,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      status,
    });
  }

  @Post('repasses')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Registrar repasse de comissão' })
  @ApiResponse({ status: 201, description: 'Repasse registrado com sucesso' })
  async createRepasse(@Body() createRepasseDto: CreateRepasseDto) {
    return this.financeiroService.createRepasse(createRepasseDto);
  }

  @Get('repasses/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar repasses da barbearia' })
  @ApiResponse({ status: 200, description: 'Lista de repasses' })
  async findRepasses(
    @Param('barbeariaId') barbeariaId: string,
    @Query('barbeiroId') barbeiroId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.financeiroService.findRepasses({
      barbeariaId,
      barbeiroId,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    });
  }

  @Get('dashboard/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Dashboard financeiro da barbearia' })
  @ApiResponse({ status: 200, description: 'Dados do dashboard financeiro' })
  async getDashboard(
    @Param('barbeariaId') barbeariaId: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.financeiroService.getDashboard(barbeariaId, periodo);
  }

  @Get('relatorio-faturamento/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Relatório de faturamento' })
  @ApiResponse({ status: 200, description: 'Relatório de faturamento' })
  async getRelatorioFaturamento(
    @Param('barbeariaId') barbeariaId: string,
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
  ) {
    return this.financeiroService.getRelatorioFaturamento(
      barbeariaId,
      new Date(dataInicio),
      new Date(dataFim),
    );
  }

  @Get('relatorio-comissoes/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Relatório de comissões' })
  @ApiResponse({ status: 200, description: 'Relatório de comissões' })
  async getRelatorioComissoes(
    @Param('barbeariaId') barbeariaId: string,
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
  ) {
    return this.financeiroService.getRelatorioComissoes(
      barbeariaId,
      new Date(dataInicio),
      new Date(dataFim),
    );
  }

  @Patch('despesas/:id/pagar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Pagar uma despesa cadastrada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Despesa paga com sucesso',
    type: PagarDespesaResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Despesa não encontrada' })
  @ApiResponse({ status: 400, description: 'Despesa já foi paga' })
  async pagarDespesa(
    @Param('id') despesaId: string,
    @Body() dto: PagarDespesaDto,
  ): Promise<PagarDespesaResponseDto> {
    return this.financeiroService.pagarDespesa(despesaId, dto);
  }
}