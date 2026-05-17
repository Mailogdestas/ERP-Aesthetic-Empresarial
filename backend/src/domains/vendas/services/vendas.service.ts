import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Venda, VendaStatus, Prisma } from '@prisma/client';
import { CreateVendaDto, UpdateVendaDto, AddItemVendaDto, VendaResponseDto } from '../dto';

/**
 * 💰 VENDAS SERVICE
 * 
 * Casos de Uso:
 * - Criar Venda (status = ABERTA)
 * - Adicionar Item (Produto ou Serviço)
 * - Finalizar Venda (status = FINALIZADA, pronta para pagamento)
 * - Receber evento ATENDIMENTO_CONCLUIDO
 * - Emitir evento VENDA_FINALIZADA
 */

@Injectable()
export class VendasService extends BaseService<Venda> {
  constructor(
    protected prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    super(prisma, 'venda');
  }

  private include = {
    cliente: { select: { id: true, nome: true, telefone: true } },
    barbeiro: { select: { id: true, nome: true } },
    itens: {
      include: {
        produto: { select: { id: true, nome: true, preco: true } },
        servico: { select: { id: true, nome: true, preco: true } },
      },
    },
    pagamentos: true,
  };

  /**
   * Cria uma nova venda
   */
  async create(dto: CreateVendaDto, usuarioId: string): Promise<VendaResponseDto> {
    console.log('💰 INICIANDO CRIAÇÃO DE VENDA');
    console.log('📋 DTO recebido:', JSON.stringify(dto, null, 2));
    console.log('👤 Usuario ID:', usuarioId);

    try {
      console.log('🔄 Preparando dados para criação...');
      const vendaData = {
        barbeariaId: dto.barbeariaId,
        clienteId: dto.clienteId,
        barbeiroId: dto.barbeiroId,
        agendamentoId: dto.agendamentoId,
        status: dto.status || VendaStatus.ABERTA,
        valorTotal: 0, // Valor inicial, será calculado quando itens forem adicionados
        createdByUsuarioId: usuarioId,
        updatedByUsuarioId: usuarioId,
      };
      
      console.log('📊 Dados preparados para criação:', JSON.stringify(vendaData, null, 2));
      console.log('🔥 Chamando super.create...');
      
      const venda = await super.create(vendaData);
      
      console.log('✅ VENDA CRIADA COM SUCESSO!');
      console.log('🆔 ID da venda:', venda.id);
      console.log('📋 Dados da venda criada:', JSON.stringify(venda, null, 2));
      
      return this.formatVendaResponse(venda);
    } catch (error) {
      console.log('❌ ERRO NA CRIAÇÃO DA VENDA');
      console.log('🔥 Tipo do erro:', error.constructor.name);
      console.log('📋 Mensagem do erro:', error.message);
      console.log('📊 Stack trace:', error.stack);
      
      if (error.code) {
        console.log('🔢 Código do erro:', error.code);
      }
      
      if (error.meta) {
        console.log('📋 Meta do erro:', JSON.stringify(error.meta, null, 2));
      }
      
      throw error;
    }
  }

  /**
   * 📝 CASO DE USO: Criar Venda
   * Status inicial: ABERTA
   */
  async criarVenda(
    data: CreateVendaDto,
    barbeariaId: string,
    usuarioId: string,
  ): Promise<VendaResponseDto> {
    const venda = await this.create({
      ...data,
      barbeariaId,
      status: VendaStatus.ABERTA,
    }, usuarioId);

    return this.formatVendaResponse(await this.findById(venda.id, this.include));
  }

  /**
   * Lista todas as vendas
   */
  async findAll(barbeariaId: string): Promise<VendaResponseDto[]> {
    const vendas = await this.findMany({
      barbeariaId
    }, {
      itens: {
        include: {
          produto: true,
          servico: true
        }
      },
      cliente: true,
      barbeiro: true
    });

    return vendas.map(venda => this.formatVendaResponse(venda));
  }

  /**
   * Busca uma venda por ID
   */
  async findOne(id: string): Promise<VendaResponseDto> {
    const venda = await this.findById(id, {
      itens: {
        include: {
          produto: true,
          servico: true
        }
      },
      cliente: true,
      barbeiro: true
    });
    
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }
    return this.formatVendaResponse(venda);
  }

  /**
   * Atualiza uma venda
   */
  async update(id: string, dto: UpdateVendaDto, usuarioId?: string): Promise<VendaResponseDto> {
    const venda = await this.findById(id);
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.status !== VendaStatus.ABERTA) {
      throw new BadRequestException('Só é possível atualizar vendas abertas');
    }

    const vendaAtualizada = await this.prisma.venda.update({
      where: { id },
      data: {
        clienteId: dto.clienteId,
        barbeiroId: dto.barbeiroId,
        updatedByUsuarioId: usuarioId,
        updatedAt: new Date()
      },
      include: {
        itens: {
          include: {
            produto: true,
            servico: true
          }
        },
        cliente: true,
        barbeiro: true
      }
    });

    return this.formatVendaResponse(vendaAtualizada);
  }


  /**
   * Finaliza uma venda
   */
  async finalizar(id: string, usuarioId?: string): Promise<VendaResponseDto> {
    const venda = await this.findById(id);
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.status !== VendaStatus.ABERTA) {
      throw new BadRequestException('Só é possível finalizar vendas abertas');
    }

    const vendaFinalizada = await this.prisma.venda.update({
      where: { id },
      data: {
        status: VendaStatus.FINALIZADA,
        updatedByUsuarioId: usuarioId,
        updatedAt: new Date()
      },
      include: {
        itens: {
          include: {
            produto: true,
            servico: true
          }
        },
        cliente: true,
        barbeiro: true
      }
    });

    // Emitir evento VENDA_FINALIZADA
    this.eventEmitter.emit('VENDA_FINALIZADA', {
      vendaId: id,
      barbeariaId: venda.barbeariaId,
      clienteId: venda.clienteId,
      barbeiroId: venda.barbeiroId,
      valorTotal: venda.valorTotal,
      itens: vendaFinalizada.itens.map(item => ({
        id: item.id,
        tipo: item.produtoId ? 'PRODUTO' : 'SERVICO',
        nome: item.produto?.nome || item.servico?.nome || 'Item',
        quantidade: item.quantidade,
        valorUnitario: item.precoUnit,
        valorTotal: item.total
      })),
      timestamp: new Date()
    });

    return this.formatVendaResponse(vendaFinalizada);
  }

  /**
   * Remove uma venda (soft delete)
   */
  async remove(id: string, usuarioId?: string): Promise<VendaResponseDto> {
    const venda = await this.findById(id);
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.status === VendaStatus.PAGA) {
      throw new BadRequestException('Não é possível remover vendas pagas');
    }

    const vendaRemovida = await this.softDelete(id, usuarioId);
    return this.formatVendaResponse(vendaRemovida);
  }

  /**
   * Restaura uma venda removida
   */
  async restore(id: string, usuarioId?: string): Promise<VendaResponseDto> {
    const vendaRestaurada = await super.restore(id, usuarioId);
    return this.formatVendaResponse(vendaRestaurada);
  }

  /**
   * Lista vendas removidas
   */
  async findDeleted(barbeariaId?: string): Promise<VendaResponseDto[]> {
    const where: any = {};
    if (barbeariaId) {
      where.barbeariaId = barbeariaId;
    }
    
    const vendas = await super.findDeleted(where);
    return vendas.map(venda => this.formatVendaResponse(venda));
  }

  /**
   * Retorna o histórico de alterações de uma venda
   */
  async getAuditHistory(id: string) {
    const venda = await this.findById(id);
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    // Buscar todas as versões da venda (incluindo deletadas)
    const historico = await this.prisma.venda.findMany({
      where: { id },
      include: {
        itens: {
          include: {
            produto: true,
            servico: true,
          },
        },
        cliente: true,
        barbeiro: true,
        pagamentos: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      vendaId: id,
      historico: historico.map(versao => ({
        id: versao.id,
        status: versao.status,
        valorTotal: versao.valorTotal,
        createdAt: versao.createdAt,
        updatedAt: versao.updatedAt,
        deletedAt: versao.deletedAt,
        createdByUsuarioId: versao.createdByUsuarioId,
        updatedByUsuarioId: versao.updatedByUsuarioId,
        itens: versao.itens.map(item => ({
          id: item.id,
          produtoId: item.produtoId,
          produtoNome: item.produto?.nome,
          servicoId: item.servicoId,
          servicoNome: item.servico?.nome,
          quantidade: item.quantidade,
          precoUnit: item.precoUnit,
          total: item.total,
          comissaoTipo: item.comissaoTipo,
          comissaoValor: item.comissaoValor,
          comissaoCalculada: item.comissaoCalculada,
        })),
        cliente: versao.cliente ? {
          id: versao.cliente.id,
          nome: versao.cliente.nome,
        } : null,
        barbeiro: versao.barbeiro ? {
          id: versao.barbeiro.id,
          nome: versao.barbeiro.nome,
        } : null,
        totalPagamentos: versao.pagamentos.reduce((sum, p) => sum + Number(p.valor), 0),
      })),
    };
  }

  /**
   * Adiciona um item (produto ou serviço) à venda
   */
  async addItemToVenda(vendaId: string, dto: AddItemVendaDto): Promise<VendaResponseDto> {
    const venda = await this.findById(vendaId);
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.status !== VendaStatus.ABERTA) {
      throw new BadRequestException('Só é possível adicionar itens a vendas abertas');
    }

    let precoUnitario = dto.precoUnit;
    let servicoComComissao = null;

    // Validar se produto ou serviço existe e buscar preço se não informado
    if (dto.produtoId) {
      const produto = await this.prisma.produto.findFirst({
        where: { id: dto.produtoId, deletedAt: null }
      });
      if (!produto) {
        throw new NotFoundException('Produto não encontrado');
      }
      if (!precoUnitario) {
        precoUnitario = produto.preco;
      }
    }

    if (dto.servicoId) {
      const servico = await this.prisma.servico.findFirst({
        where: { id: dto.servicoId, deletedAt: null }
      });
      if (!servico) {
        throw new NotFoundException('Serviço não encontrado');
      }
      if (!precoUnitario) {
        precoUnitario = servico.preco;
      }
      servicoComComissao = servico;
    }

    const quantidade = dto.quantidade || 1;
    const total = quantidade * precoUnitario;

    // Calcular comissão
    let comissaoTipo = dto.comissaoTipo;
    let comissaoValor = dto.comissaoValor;
    let comissaoCalculada = null;

    // Se é serviço e não tem comissão manual, aplicar comissão padrão
    if (servicoComComissao && !comissaoTipo && servicoComComissao.comissaoPadraoPercentual) {
      comissaoTipo = 'PERCENTUAL';
      comissaoValor = Number(servicoComComissao.comissaoPadraoPercentual);
    }

    // Calcular valor da comissão
    if (comissaoTipo && comissaoValor) {
      if (comissaoTipo === 'FIXA') {
        comissaoCalculada = comissaoValor;
      } else {
        comissaoCalculada = total * (comissaoValor / 100);
      }
    }

    // Criar item da venda
    await this.prisma.itemVenda.create({
      data: {
        vendaId,
        produtoId: dto.produtoId,
        servicoId: dto.servicoId,
        quantidade,
        precoUnit: precoUnitario,
        total: total,
        comissaoTipo,
        comissaoValor: comissaoValor || null,
        comissaoCalculada
      }
    });

    // Recalcular total da venda
    await this.recalcularTotal(vendaId);

    // Retornar venda atualizada
    const vendaAtualizada = await this.findById(vendaId);
    return this.formatVendaResponse(vendaAtualizada);
  }

  /**
   * 📝 CASO DE USO: Finalizar Venda
   * Muda status para FINALIZADA e emite evento
   */
  async finalizarVenda(
    vendaId: string,
    barbeariaId: string,
    usuarioId: string,
  ): Promise<VendaResponseDto> {
    const venda = await this.findById(vendaId, this.include);
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.barbeariaId !== barbeariaId) {
      throw new BadRequestException('Venda não pertence a esta barbearia');
    }

    if (venda.status !== VendaStatus.ABERTA) {
      throw new BadRequestException('Só é possível finalizar vendas abertas');
    }

    // Verificar se tem pelo menos um item
    const itensCount = await this.prisma.itemVenda.count({
      where: { vendaId },
    });

    if (itensCount === 0) {
      throw new BadRequestException('Venda deve ter pelo menos um item para ser finalizada');
    }

    // Atualizar status
    const vendaFinalizada = await this.update(vendaId, {
      status: VendaStatus.FINALIZADA,
    }, usuarioId);

    // Emitir evento para domínio de pagamento
    this.eventEmitter.emit('venda.finalizada', {
      vendaId: vendaFinalizada.id,
      barbeariaId: vendaFinalizada.barbeariaId,
      valorTotal: vendaFinalizada.valorTotal,
    });

    return this.formatVendaResponse(await this.findById(vendaId, this.include));
  }

  /**
   * 📝 CASO DE USO: Listar Vendas por Barbearia
   */
  async listarVendas(
    barbeariaId: string,
    status?: VendaStatus,
    clienteId?: string,
    barbeiroId?: string,
  ): Promise<VendaResponseDto[]> {
    const where: any = { barbeariaId };

    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;
    if (barbeiroId) where.barbeiroId = barbeiroId;

    const vendas = await this.findMany(where, this.include);
    return vendas.map(venda => this.formatVendaResponse(venda));
  }

  /**
   * 📝 CASO DE USO: Buscar Venda por ID
   */
  async buscarVenda(
    vendaId: string,
    barbeariaId: string,
  ): Promise<VendaResponseDto> {
    const venda = await this.findById(vendaId, this.include);
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (venda.barbeariaId !== barbeariaId) {
      throw new BadRequestException('Venda não pertence a esta barbearia');
    }

    return this.formatVendaResponse(venda);
  }

  /**
   * 🔄 MÉTODO AUXILIAR: Recalcular Total da Venda
   */
  private async recalcularTotal(vendaId: string): Promise<void> {
    const itens = await this.prisma.itemVenda.findMany({
      where: { vendaId },
    });

    const valorTotal = itens.reduce((sum, item) => sum + Number(item.total), 0);

    await this.prisma.venda.update({
      where: { id: vendaId },
      data: { valorTotal },
    });
  }

  /**
   * 🔄 MÉTODO AUXILIAR: Formatar Resposta da Venda
   */
  private formatVendaResponse(venda: any): VendaResponseDto {
    return {
      id: venda.id,
      barbeariaId: venda.barbeariaId,
      clienteId: venda.clienteId || '',
      clienteNome: venda.cliente?.nome || null,
      barbeiroId: venda.barbeiroId || '',
      barbeiroNome: venda.barbeiro?.nome || null,
      agendamentoId: venda.agendamentoId || '',
      status: venda.status,
      valorTotal: Number(venda.valorTotal),
      createdAt: venda.createdAt,
      updatedAt: venda.updatedAt,
      deletedAt: venda.deletedAt || null,
      createdByUsuarioId: venda.createdByUsuarioId || '',
      updatedByUsuarioId: venda.updatedByUsuarioId || '',
      itens: venda.itens?.map((item: any) => ({
        id: item.id,
        produtoId: item.produtoId,
        produtoNome: item.produtoNome || item.produto?.nome,
        servicoId: item.servicoId,
        servicoNome: item.servicoNome || item.servico?.nome,
        quantidade: item.quantidade,
        precoUnit: Number(item.precoUnit),
        total: Number(item.total),
        comissaoTipo: item.comissaoTipo,
        comissaoValor: item.comissaoValor ? Number(item.comissaoValor) : null,
        comissaoCalculada: item.comissaoCalculada ? Number(item.comissaoCalculada) : null,
      })) || [],
    };
  }
}
