import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { HistoricoAtendimentoService } from '../services/historico-atendimento.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DomainEventType } from '../../../shared/events/domain-events';
import {
  UpdateHistoricoAtendimentoDto,
  CreateHistoricoAtendimentoDto,
  HistoricoAtendimentoResponseDto,
  AtendimentoHistoricoQueryDto,
  RelatorioAtendimentoDto,
  AvaliacaoAtendimento
} from '../dto/atendimento.dto';
import { AvaliacaoCliente } from '@prisma/client';

@ApiTags('Atendimento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('atendimento')
export class AtendimentoController {
  constructor(
    private readonly historicoAtendimentoService: HistoricoAtendimentoService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService
  ) {}

  // ===== CONSULTAS DE HISTÓRICO =====

  @Get('historico')
  @ApiOperation({ 
    summary: 'Listar histórico de atendimentos',
    description: 'Lista histórico com filtros opcionais por período, barbeiro, cliente, status e avaliação'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de histórico de atendimentos',
    type: [HistoricoAtendimentoResponseDto]
  })
  async listarHistorico(
    @Query() query: AtendimentoHistoricoQueryDto
  ): Promise<HistoricoAtendimentoResponseDto[]> {
    return this.historicoAtendimentoService.listarHistorico(query);
  }

  @Get('historico/cliente/:clienteId')
  @ApiOperation({ 
    summary: 'Buscar histórico por cliente',
    description: 'Retorna todo o histórico de atendimentos de um cliente específico'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico do cliente',
    type: [HistoricoAtendimentoResponseDto]
  })
  async buscarHistoricoPorCliente(
    @Param('clienteId', ParseUUIDPipe) clienteId: string
  ): Promise<HistoricoAtendimentoResponseDto[]> {
    return this.historicoAtendimentoService.buscarHistoricoPorCliente(clienteId);
  }

  // ===== GESTÃO DE ATENDIMENTO =====

  @Put('historico/agendamento/:agendamentoId/finalizar')
  @ApiOperation({ 
    summary: 'Finalizar atendimento',
    description: 'Finaliza um atendimento em andamento, registrando hora de fim e observações'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Atendimento finalizado com sucesso',
    type: HistoricoAtendimentoResponseDto
  })
  async finalizarAtendimento(
    @Param('agendamentoId') agendamentoId: string,
    @Body() dto: UpdateHistoricoAtendimentoDto
  ): Promise<HistoricoAtendimentoResponseDto> {
    console.log('🎯 INICIANDO FINALIZAÇÃO DE ATENDIMENTO');
    console.log('📋 Parâmetros recebidos:', { agendamentoId, dto });
    
    // Finalizar o atendimento
    console.log('🔄 Chamando historicoAtendimentoService.finalizarAtendimento...');
    const resultado = await this.historicoAtendimentoService.finalizarAtendimento(agendamentoId, dto);
    console.log('✅ Atendimento finalizado:', resultado.id);

    // Buscar dados do agendamento para emitir o evento
    console.log('🔍 Buscando dados do agendamento:', agendamentoId);
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        servico: true
      }
    });

    console.log('📊 Agendamento encontrado:', agendamento ? 'SIM' : 'NÃO');
    if (agendamento) {
      console.log('📋 Dados do agendamento:', {
        id: agendamento.id,
        barbeariaId: agendamento.barbeariaId,
        clienteId: agendamento.clienteId,
        barbeiroId: agendamento.barbeiroId,
        servicoId: agendamento.servicoId,
        servico: agendamento.servico
      });

      // Emitir evento ATENDIMENTO_CONCLUIDO
      const eventData = {
        agendamentoId: agendamento.id,
        barbeariaId: agendamento.barbeariaId,
        clienteId: agendamento.clienteId,
        barbeiroId: agendamento.barbeiroId,
        servicoIds: [agendamento.servicoId], // Corrigido: usar servicoId (singular)
        dataHoraInicio: agendamento.inicio,
        dataHoraFim: new Date(dto.dataHoraFim || new Date()),
        observacoes: dto.observacoes
      };
      
      console.log('🎬 PREPARANDO EVENTO ATENDIMENTO_CONCLUIDO');
      console.log('📋 Dados do evento:', JSON.stringify(eventData, null, 2));
      console.log('🔥 Tipo do evento:', DomainEventType.ATENDIMENTO_CONCLUIDO);
      
      console.log('📡 EMITINDO EVENTO...');
      this.eventEmitter.emit(DomainEventType.ATENDIMENTO_CONCLUIDO, eventData);
      console.log('✅ EVENTO EMITIDO COM SUCESSO!');
    } else {
      console.log('❌ AGENDAMENTO NÃO ENCONTRADO - EVENTO NÃO SERÁ EMITIDO');
    }

    console.log('🎯 FINALIZANDO MÉTODO finalizarAtendimento');
    return resultado;
  }

  @Put('historico/:historicoId/avaliacao')
  @ApiOperation({ 
    summary: 'Registrar avaliação do cliente',
    description: 'Permite que o cliente avalie o atendimento recebido'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avaliação registrada com sucesso',
    type: HistoricoAtendimentoResponseDto
  })
  async registrarAvaliacao(
    @Param('historicoId', ParseUUIDPipe) historicoId: string,
    @Body() body: { 
      avaliacao: AvaliacaoCliente; 
      comentario?: string; 
    }
  ): Promise<HistoricoAtendimentoResponseDto> {
    return this.historicoAtendimentoService.registrarAvaliacao(
      historicoId,
      body.avaliacao,
      body.comentario
    );
  }

  // ===== RELATÓRIOS E ANALYTICS =====

  @Get('relatorio')
  @ApiOperation({ 
    summary: 'Gerar relatório de atendimentos',
    description: 'Gera relatório completo com estatísticas, performance e distribuição de avaliações'
  })
  @ApiQuery({ name: 'dataInicio', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'dataFim', required: true, example: '2024-01-31' })
  @ApiQuery({ name: 'barbeiroId', required: false, description: 'Filtrar por barbeiro específico' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relatório de atendimentos',
    type: RelatorioAtendimentoDto
  })
  async gerarRelatorio(
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
    @Query('barbeiroId') barbeiroId?: string
  ): Promise<RelatorioAtendimentoDto> {
    return this.historicoAtendimentoService.gerarRelatorio(
      new Date(dataInicio),
      new Date(dataFim),
      barbeiroId
    );
  }

  @Get('analytics/barbeiro/:barbeiroId')
  @ApiOperation({ 
    summary: 'Analytics por barbeiro',
    description: 'Estatísticas detalhadas de performance de um barbeiro específico'
  })
  @ApiQuery({ name: 'dataInicio', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'dataFim', required: false, example: '2024-01-31' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics do barbeiro'
  })
  async analyticsBarbeiro(
    @Param('barbeiroId', ParseUUIDPipe) barbeiroId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string
  ) {
    const inicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fim = dataFim ? new Date(dataFim) : new Date();

    return this.historicoAtendimentoService.gerarRelatorio(inicio, fim, barbeiroId);
  }

  @Get('analytics/avaliacoes')
  @ApiOperation({ 
    summary: 'Distribuição de avaliações',
    description: 'Mostra distribuição das avaliações dos clientes por período'
  })
  @ApiQuery({ name: 'dataInicio', required: false })
  @ApiQuery({ name: 'dataFim', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Distribuição de avaliações'
  })
  async distribuicaoAvaliacoes(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string
  ) {
    const inicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fim = dataFim ? new Date(dataFim) : new Date();

    const relatorio = await this.historicoAtendimentoService.gerarRelatorio(inicio, fim);
    
    return {
      periodo: relatorio.periodo,
      distribuicaoAvaliacoes: relatorio.distribuicaoAvaliacoes,
      avaliacaoMedia: relatorio.estatisticas.avaliacaoMedia,
      totalAvaliacoes: Object.values(relatorio.distribuicaoAvaliacoes).reduce((a, b) => a + b, 0)
    };
  }

  // ===== ENDPOINTS PARA MOBILE/CLIENTE =====

  @Get('cliente/:clienteId/ultimo-atendimento')
  @ApiOperation({ 
    summary: 'Último atendimento do cliente',
    description: 'Retorna o último atendimento realizado para o cliente'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Último atendimento do cliente',
    type: HistoricoAtendimentoResponseDto
  })
  async ultimoAtendimentoCliente(
    @Param('clienteId', ParseUUIDPipe) clienteId: string
  ): Promise<HistoricoAtendimentoResponseDto | null> {
    const historicos = await this.historicoAtendimentoService.buscarHistoricoPorCliente(clienteId);
    return historicos.length > 0 ? historicos[0] : null;
  }

  @Get('cliente/:clienteId/estatisticas')
  @ApiOperation({ 
    summary: 'Estatísticas do cliente',
    description: 'Estatísticas de atendimento de um cliente específico'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas do cliente'
  })
  async estatisticasCliente(
    @Param('clienteId', ParseUUIDPipe) clienteId: string
  ) {
    const historicos = await this.historicoAtendimentoService.buscarHistoricoPorCliente(clienteId);
    
    const totalAtendimentos = historicos.length;
    const atendimentosConcluidos = historicos.filter(h => h.status === 'CONCLUIDO').length;
    const avaliacoes = historicos.filter(h => h.avaliacaoCliente).map(h => h.avaliacaoCliente);
    const avaliacaoMedia = avaliacoes.length > 0 
      ? avaliacoes.reduce((a, b) => a + b, 0) / avaliacoes.length 
      : 0;

    const tempoMedio = historicos
      .filter(h => h.duracaoMinutos > 0)
      .reduce((acc, h) => acc + h.duracaoMinutos, 0) / Math.max(1, historicos.filter(h => h.duracaoMinutos > 0).length);

    return {
      clienteId,
      totalAtendimentos,
      atendimentosConcluidos,
      avaliacaoMedia: Number(avaliacaoMedia.toFixed(1)),
      tempoMedioMinutos: Math.round(tempoMedio || 0),
      primeiroAtendimento: historicos.length > 0 ? historicos[historicos.length - 1].dataHoraInicio : null,
      ultimoAtendimento: historicos.length > 0 ? historicos[0].dataHoraInicio : null
    };
  }
}
