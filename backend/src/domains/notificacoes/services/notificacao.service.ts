import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  CreateNotificacaoDto, 
  UpdateNotificacaoDto, 
  NotificacaoResponseDto,
  QueryNotificacaoDto,
  EnviarNotificacaoDto
} from '../dto';
import { NotificacaoStatus } from '@prisma/client';

@Injectable()
export class NotificacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Cria uma nova notificação
   */
  async criarNotificacao(dto: CreateNotificacaoDto): Promise<NotificacaoResponseDto> {
    const notificacao = await this.prisma.notificacao.create({
      data: {
        tipo: dto.tipo,
        payload: dto.payload,
        barbeariaId: dto.barbeariaId,
        status: dto.status || NotificacaoStatus.PENDENTE
      },
      include: {
        barbearia: {
          select: { nome: true }
        }
      }
    });

    // Emite evento para processamento assíncrono
    this.eventEmitter.emit('notificacao.criada', {
      notificacaoId: notificacao.id,
      tipo: notificacao.tipo,
      barbeariaId: notificacao.barbeariaId
    });

    return notificacao;
  }

  /**
   * Envia uma notificação específica
   */
  async enviarNotificacao(dto: EnviarNotificacaoDto): Promise<NotificacaoResponseDto> {
    // Busca template se fornecido
    let template = null;
    if (dto.templateId) {
      template = await this.prisma.mensagemTemplate.findFirst({
        where: {
          id: dto.templateId,
          ativo: true,
          deletedAt: null
        }
      });

      if (!template) {
        throw new NotFoundException('Template de mensagem não encontrado');
      }
    }

    // Busca dados do destinatário baseado no tipo
    const destinatario = await this.buscarDestinatario(dto.tipo, dto.destinatarioId);
    if (!destinatario) {
      throw new NotFoundException('Destinatário não encontrado');
    }

    // Cria payload da notificação
    const payload = {
      destinatarioId: dto.destinatarioId,
      destinatario,
      dados: dto.dados,
      template: template ? {
        id: template.id,
        nome: template.nome,
        conteudo: template.conteudo
      } : null,
      canal: dto.canal || 'WhatsApp'
    };

    // Cria a notificação
    const notificacao = await this.criarNotificacao({
      tipo: dto.tipo,
      payload,
      barbeariaId: destinatario.barbeariaId,
      status: NotificacaoStatus.PENDENTE
    });

    return notificacao;
  }

  /**
   * Lista notificações com filtros
   */
  async listarNotificacoes(
    barbeariaId: string, 
    query: QueryNotificacaoDto
  ): Promise<{ notificacoes: NotificacaoResponseDto[]; total: number }> {
    const { page = 1, limit = 20, tipo, status, dataInicio, dataFim } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      barbeariaId,
      ...(tipo && { tipo }),
      ...(status && { status }),
      ...(dataInicio || dataFim) && {
        enviadoEm: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) })
        }
      }
    };

    const [notificacoes, total] = await Promise.all([
      this.prisma.notificacao.findMany({
        where,
        include: {
          barbearia: {
            select: { nome: true }
          }
        },
        orderBy: { enviadoEm: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.notificacao.count({ where })
    ]);

    return { notificacoes, total };
  }

  /**
   * Busca notificação por ID
   */
  async buscarNotificacao(id: string, barbeariaId: string): Promise<NotificacaoResponseDto> {
    const notificacao = await this.prisma.notificacao.findFirst({
      where: { id, barbeariaId },
      include: {
        barbearia: {
          select: { nome: true }
        }
      }
    });

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return notificacao;
  }

  /**
   * Atualiza status da notificação
   */
  async atualizarNotificacao(
    id: string, 
    barbeariaId: string, 
    dto: UpdateNotificacaoDto
  ): Promise<NotificacaoResponseDto> {
    const notificacao = await this.prisma.notificacao.findFirst({
      where: { id, barbeariaId }
    });

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    const notificacaoAtualizada = await this.prisma.notificacao.update({
      where: { id },
      data: dto,
      include: {
        barbearia: {
          select: { nome: true }
        }
      }
    });

    return notificacaoAtualizada;
  }

  /**
   * Remove notificação
   */
  async removerNotificacao(id: string, barbeariaId: string): Promise<void> {
    const notificacao = await this.prisma.notificacao.findFirst({
      where: { id, barbeariaId }
    });

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }

    await this.prisma.notificacao.delete({
      where: { id }
    });
  }

  /**
   * Marca notificação como enviada
   */
  async marcarComoEnviada(id: string): Promise<void> {
    await this.prisma.notificacao.update({
      where: { id },
      data: { 
        status: NotificacaoStatus.ENVIADO,
        enviadoEm: new Date()
      }
    });
  }

  /**
   * Marca notificação como erro
   */
  async marcarComoErro(id: string, erro?: string): Promise<void> {
    const payload = erro ? { erro } : {};
    
    await this.prisma.notificacao.update({
      where: { id },
      data: { 
        status: NotificacaoStatus.ERRO,
        payload: {
          ...payload
        }
      }
    });
  }

  /**
   * Busca estatísticas de notificações
   */
  async obterEstatisticas(barbeariaId: string, dias: number = 30) {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const [total, enviadas, erros, pendentes, porTipo] = await Promise.all([
      // Total de notificações
      this.prisma.notificacao.count({
        where: {
          barbeariaId,
          enviadoEm: { gte: dataInicio }
        }
      }),
      
      // Enviadas com sucesso
      this.prisma.notificacao.count({
        where: {
          barbeariaId,
          status: NotificacaoStatus.ENVIADO,
          enviadoEm: { gte: dataInicio }
        }
      }),
      
      // Com erro
      this.prisma.notificacao.count({
        where: {
          barbeariaId,
          status: NotificacaoStatus.ERRO,
          enviadoEm: { gte: dataInicio }
        }
      }),
      
      // Pendentes
      this.prisma.notificacao.count({
        where: {
          barbeariaId,
          status: NotificacaoStatus.PENDENTE,
          enviadoEm: { gte: dataInicio }
        }
      }),
      
      // Por tipo
      this.prisma.notificacao.groupBy({
        by: ['tipo'],
        where: {
          barbeariaId,
          enviadoEm: { gte: dataInicio }
        },
        _count: true
      })
    ]);

    return {
      periodo: `${dias} dias`,
      total,
      enviadas,
      erros,
      pendentes,
      taxaSucesso: total > 0 ? ((enviadas / total) * 100).toFixed(2) + '%' : '0%',
      porTipo: porTipo.map(item => ({
        tipo: item.tipo,
        quantidade: item._count
      }))
    };
  }

  /**
   * Busca destinatário baseado no tipo de notificação
   */
  private async buscarDestinatario(tipo: string, destinatarioId: string) {
    switch (tipo) {
      case 'LEMBRETE_AGENDAMENTO':
      case 'ANIVERSARIO':
      case 'FIDELIDADE':
        return await this.prisma.cliente.findFirst({
          where: { id: destinatarioId, deletedAt: null },
          select: {
            id: true,
            nome: true,
            telefone: true,
            email: true,
            barbeariaId: true
          }
        });
        
      case 'PROMOCAO':
        // Pode ser cliente ou broadcast
        return await this.prisma.cliente.findFirst({
          where: { id: destinatarioId, deletedAt: null },
          select: {
            id: true,
            nome: true,
            telefone: true,
            email: true,
            barbeariaId: true
          }
        });
        
      case 'COBRANCA':
        // Pode ser cliente ou fornecedor
        const cliente = await this.prisma.cliente.findFirst({
          where: { id: destinatarioId, deletedAt: null },
          select: {
            id: true,
            nome: true,
            telefone: true,
            email: true,
            barbeariaId: true
          }
        });
        
        if (cliente) return cliente;
        
        return await this.prisma.fornecedor.findFirst({
          where: { id: destinatarioId, deletedAt: null },
          select: {
            id: true,
            nome: true,
            contato: true,
            barbeariaId: true
          }
        });
        
      default:
        return null;
    }
  }
}