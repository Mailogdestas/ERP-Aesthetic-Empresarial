import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CaixaService } from '../services/caixa.service';
import { AbrirCaixaDto } from '../dto/abrir-caixa.dto';
import { FecharCaixaDto } from '../dto/fechar-caixa.dto';
import { MovimentoManualDto } from '../dto/movimento-manual.dto';
import { FiltroCaixaDto } from '../dto/filtro-caixa.dto';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';

@ApiTags('Caixa')
@ApiBearerAuth()
@Controller('caixa')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CaixaController {
  constructor(private readonly caixaService: CaixaService) {}

  @Post('abrir')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({
    summary: 'Abrir sessão de caixa',
    description: 'Abre uma nova sessão de caixa para a barbearia. Apenas um caixa pode estar aberto por vez.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sessão de caixa aberta com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou já existe caixa aberto' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async abrirCaixa(@Body() dto: AbrirCaixaDto, @Request() req: any) {
    // Extrair barbeariaId do JWT se não fornecido no body
    const barbeariaId = dto.barbeariaId || req.user?.barbeariaId;
    
    if (!barbeariaId) {
      throw new BadRequestException('ID da barbearia não encontrado no token de autenticação');
    }

    // Extrair usuarioId do JWT (campo 'userId' mapeado do 'sub')
    const usuarioId = req.user?.userId || req.user?.id;
    
    if (!usuarioId) {
      throw new BadRequestException('ID do usuário não encontrado no token de autenticação');
    }

    // Criar novo DTO com barbeariaId garantido
    const dtoCompleto: AbrirCaixaDto = {
      ...dto,
      barbeariaId
    };

    return this.caixaService.abrirCaixa(dtoCompleto, usuarioId);
  }

  @Patch(':id/fechar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({
    summary: 'Fechar sessão de caixa',
    description: 'Fecha uma sessão de caixa ativa, realizando a conferência de valores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão de caixa fechada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou caixa já fechado' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async fecharCaixa(@Param('id') id: string, @Body() dto: FecharCaixaDto, @Request() req: any) {
    // Adicionar o id da URL ao DTO
    const dtoCompleto: FecharCaixaDto = {
      ...dto,
      sessaoId: id
    };
    return this.caixaService.fecharCaixa(dtoCompleto, req.user.id);
  }

  @Post('movimento-manual')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Registrar movimento manual',
    description: 'Registra um movimento manual no caixa (sangria, suprimento, despesa, etc.).',
  })
  @ApiResponse({
    status: 201,
    description: 'Movimento registrado com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async registrarMovimentoManual(@Body() dto: MovimentoManualDto, @Request() req: any) {
    // Extrair barbeariaId do JWT se não fornecido no DTO
    const barbeariaId = req.user?.barbeariaId;
    
    if (!barbeariaId) {
      throw new BadRequestException('ID da barbearia não encontrado no token de autenticação');
    }

    // Se sessaoId não foi fornecido, buscar sessão ativa
    if (!dto.sessaoId) {
      const sessaoAtiva = await this.caixaService.buscarSessaoAtiva(barbeariaId);
      if (!sessaoAtiva) {
        throw new BadRequestException('Não há sessão de caixa ativa. Abra uma sessão primeiro.');
      }
      dto.sessaoId = sessaoAtiva.id;
    }

    // Extrair usuarioId do JWT
    const usuarioId = req.user?.userId || req.user?.id;
    
    if (!usuarioId) {
      throw new BadRequestException('ID do usuário não encontrado no token de autenticação');
    }

    return this.caixaService.registrarMovimentoManual(dto, usuarioId);
  }

  @Get('sessoes')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({
    summary: 'Listar sessões de caixa',
    description: 'Lista as sessões de caixa com filtros opcionais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sessões retornada com sucesso',
  })
  async listarSessoes(@Query() filtros: FiltroCaixaDto) {
    return this.caixaService.listarSessoes(filtros);
  }

  @Get('sessoes/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({
    summary: 'Buscar sessão por ID',
    description: 'Retorna os detalhes de uma sessão específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão encontrada',
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async buscarSessao(@Param('id') id: string) {
    return this.caixaService.buscarSessaoPorId(id);
  }

  @Get('sessoes/:id/movimentos')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({
    summary: 'Listar movimentos de uma sessão',
    description: 'Lista todos os movimentos de uma sessão específica com resumo financeiro.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimentos retornada com sucesso',
    type: 'MovimentosSessaoResponseDto',
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async listarMovimentosSessao(@Param('id') sessaoId: string) {
    return this.caixaService.listarMovimentosPorSessao(sessaoId);
  }

  @Get('sessoes/ativa/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({
    summary: 'Buscar sessão ativa',
    description: 'Retorna a sessão de caixa ativa da barbearia, se houver.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão ativa encontrada',
  })
  @ApiResponse({ status: 404, description: 'Nenhuma sessão ativa encontrada' })
  async buscarSessaoAtiva(@Param('barbeariaId') barbeariaId: string) {
    return this.caixaService.buscarSessaoAtiva(barbeariaId);
  }

  @Get('relatorio/fechamento/:sessaoId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Relatório de fechamento',
    description: 'Gera relatório detalhado do fechamento de uma sessão.',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async relatorioFechamento(@Param('sessaoId') sessaoId: string) {
    return this.caixaService.gerarRelatorioFechamento(sessaoId);
  }

  @Get('totais/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({
    summary: 'Totais do caixa',
    description: 'Retorna os totais consolidados do caixa da barbearia.',
  })
  @ApiResponse({
    status: 200,
    description: 'Totais calculados com sucesso',
  })
  async calcularTotais(
    @Param('barbeariaId') barbeariaId: string,
    @Query() filtros?: FiltroCaixaDto,
  ) {
    return this.caixaService.calcularTotais(barbeariaId, filtros);
  }
}