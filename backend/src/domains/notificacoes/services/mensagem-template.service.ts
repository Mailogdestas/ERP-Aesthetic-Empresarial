import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { 
  CreateMensagemTemplateDto, 
  UpdateMensagemTemplateDto, 
  MensagemTemplateResponseDto,
  QueryMensagemTemplateDto,
  ProcessarTemplateDto
} from '../dto';

@Injectable()
export class MensagemTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo template de mensagem
   */
  async criarTemplate(dto: CreateMensagemTemplateDto): Promise<MensagemTemplateResponseDto> {
    // Verifica se já existe template com mesmo nome para a barbearia
    const templateExistente = await this.prisma.mensagemTemplate.findFirst({
      where: {
        nome: dto.nome,
        barbeariaId: dto.barbeariaId,
        deletedAt: null
      }
    });

    if (templateExistente) {
      throw new BadRequestException('Já existe um template com este nome');
    }

    const template = await this.prisma.mensagemTemplate.create({
      data: {
        nome: dto.nome,
        conteudo: dto.conteudo,
        tipo: dto.tipo,

        ativo: dto.ativo ?? true,
        barbeariaId: dto.barbeariaId,
        createdByUsuarioId: dto.createdByUsuarioId,
        updatedByUsuarioId: dto.createdByUsuarioId
      },
      include: {
        barbearia: {
          select: { nome: true }
        },
        createdByUsuario: {
          select: { nome: true }
        }
      }
    });

    return template;
  }

  /**
   * Lista templates com filtros
   */
  async listarTemplates(
    barbeariaId: string, 
    query: QueryMensagemTemplateDto
  ): Promise<{ templates: MensagemTemplateResponseDto[]; total: number }> {
    const { page = 1, limit = 20, tipo, ativo, nome } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      barbeariaId,
      deletedAt: null,
      ...(tipo && { tipo }),
      ...(ativo !== undefined && { ativo }),
      ...(nome && {
        OR: [
          { nome: { contains: nome, mode: 'insensitive' } },
          { conteudo: { contains: nome, mode: 'insensitive' } }
        ]
      })
    };

    const [templates, total] = await Promise.all([
      this.prisma.mensagemTemplate.findMany({
        where,
        include: {
          barbearia: {
            select: { nome: true }
          },
          createdByUsuario: {
            select: { nome: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.mensagemTemplate.count({ where })
    ]);

    return { templates, total };
  }

  /**
   * Busca template por ID
   */
  async buscarTemplate(id: string, barbeariaId: string): Promise<MensagemTemplateResponseDto> {
    const template = await this.prisma.mensagemTemplate.findFirst({
      where: { 
        id, 
        barbeariaId,
        deletedAt: null 
      },
      include: {
        barbearia: {
          select: { nome: true }
        },
        createdByUsuario: {
          select: { nome: true }
        },
        updatedByUsuario: {
          select: { nome: true }
        }
      }
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    return template;
  }

  /**
   * Atualiza template
   */
  async atualizarTemplate(
    id: string, 
    barbeariaId: string, 
    dto: UpdateMensagemTemplateDto
  ): Promise<MensagemTemplateResponseDto> {
    const template = await this.prisma.mensagemTemplate.findFirst({
      where: { 
        id, 
        barbeariaId,
        deletedAt: null 
      }
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    // Verifica se o novo nome já existe (se foi alterado)
    if (dto.nome && dto.nome !== template.nome) {
      const templateExistente = await this.prisma.mensagemTemplate.findFirst({
        where: {
          nome: dto.nome,
          barbeariaId,
          deletedAt: null,
          id: { not: id }
        }
      });

      if (templateExistente) {
        throw new BadRequestException('Já existe um template com este nome');
      }
    }

    const templateAtualizado = await this.prisma.mensagemTemplate.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date()
      },
      include: {
        barbearia: {
          select: { nome: true }
        },
        createdByUsuario: {
          select: { nome: true }
        },
        updatedByUsuario: {
          select: { nome: true }
        }
      }
    });

    return templateAtualizado;
  }

  /**
   * Remove template (soft delete)
   */
  async removerTemplate(id: string, barbeariaId: string): Promise<void> {
    const template = await this.prisma.mensagemTemplate.findFirst({
      where: { 
        id, 
        barbeariaId,
        deletedAt: null 
      }
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    await this.prisma.mensagemTemplate.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        ativo: false
      }
    });
  }

  /**
   * Ativa/desativa template
   */
  async alternarStatusTemplate(id: string, barbeariaId: string): Promise<MensagemTemplateResponseDto> {
    const template = await this.prisma.mensagemTemplate.findFirst({
      where: { 
        id, 
        barbeariaId,
        deletedAt: null 
      }
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    const templateAtualizado = await this.prisma.mensagemTemplate.update({
      where: { id },
      data: { 
        ativo: !template.ativo,
        updatedAt: new Date()
      },
      include: {
        barbearia: {
          select: { nome: true }
        },
        createdByUsuario: {
          select: { nome: true }
        }
      }
    });

    return templateAtualizado;
  }

  /**
   * Processa template substituindo variáveis
   */
  async processarTemplate(dto: ProcessarTemplateDto): Promise<{ conteudoProcessado: string }> {
    const template = await this.buscarTemplate(dto.templateId, dto.barbeariaId);
    
    let conteudoProcessado = template.conteudo;
    
    // Substitui variáveis no formato {{variavel}}
    if (dto.variaveis && Object.keys(dto.variaveis).length > 0) {
      Object.entries(dto.variaveis).forEach(([chave, valor]) => {
        const regex = new RegExp(`{{${chave}}}`, 'g');
        conteudoProcessado = conteudoProcessado.replace(regex, String(valor));
      });
    }

    return { conteudoProcessado };
  }

  /**
   * Lista templates por tipo
   */
  async listarTemplatesPorTipo(
    barbeariaId: string, 
    tipo: string
  ): Promise<MensagemTemplateResponseDto[]> {
    return await this.prisma.mensagemTemplate.findMany({
      where: {
        barbeariaId,
        tipo,
        ativo: true,
        deletedAt: null
      },
      include: {
        barbearia: {
          select: { nome: true }
        }
      },
      orderBy: { nome: 'asc' }
    });
  }

  /**
   * Duplica template
   */
  async duplicarTemplate(
    id: string, 
    barbeariaId: string, 
    novoNome: string,
    usuarioId: string
  ): Promise<MensagemTemplateResponseDto> {
    const templateOriginal = await this.buscarTemplate(id, barbeariaId);
    
    // Verifica se o novo nome já existe
    const templateExistente = await this.prisma.mensagemTemplate.findFirst({
      where: {
        nome: novoNome,
        barbeariaId,
        deletedAt: null
      }
    });

    if (templateExistente) {
      throw new BadRequestException('Já existe um template com este nome');
    }

    const templateDuplicado = await this.prisma.mensagemTemplate.create({
      data: {
        nome: novoNome,
        conteudo: templateOriginal.conteudo,
        tipo: templateOriginal.tipo,
        ativo: true,
        barbeariaId,
        createdByUsuarioId: usuarioId,
        updatedByUsuarioId: usuarioId
      },
      include: {
        barbearia: {
          select: { nome: true }
        },
        createdByUsuario: {
          select: { nome: true }
        }
      }
    });

    return templateDuplicado;
  }

  /**
   * Valida variáveis do template
   */
  async validarVariaveis(templateId: string, barbeariaId: string): Promise<{
    variaveisEncontradas: string[];
    variaveisDeclaradas: string[];
    variaveisNaoDeclaradas: string[];
  }> {
    const template = await this.buscarTemplate(templateId, barbeariaId);
    
    // Extrai variáveis do conteúdo (formato {{variavel}})
    const regexVariaveis = /{{(\w+)}}/g;
    const variaveisEncontradas: string[] = [];
    let match;
    
    while ((match = regexVariaveis.exec(template.conteudo)) !== null) {
      if (!variaveisEncontradas.includes(match[1])) {
        variaveisEncontradas.push(match[1]);
      }
    }
    
    // Como não temos campo variaveis no modelo, retornamos array vazio
    const variaveisDeclaradas: string[] = [];
    const variaveisNaoDeclaradas = variaveisEncontradas;
    
    return {
      variaveisEncontradas,
      variaveisDeclaradas,
      variaveisNaoDeclaradas
    };
  }

  /**
   * Busca templates padrão do sistema
   */
  async obterTemplatesPadrao(): Promise<Array<{
    nome: string;
    conteudo: string;
    tipo: string;
    variaveis: string[];
  }>> {
    return [
      {
        nome: 'Lembrete de Agendamento',
        conteudo: 'Olá {{nomeCliente}}! Lembramos que você tem um agendamento marcado para {{dataAgendamento}} às {{horaAgendamento}} na {{nomeBarbearia}}. Confirme sua presença!',
        tipo: 'LEMBRETE_AGENDAMENTO',
        variaveis: ['nomeCliente', 'dataAgendamento', 'horaAgendamento', 'nomeBarbearia']
      },
      {
        nome: 'Parabéns Aniversário',
        conteudo: '🎉 Parabéns {{nomeCliente}}! A {{nomeBarbearia}} deseja um feliz aniversário! Que tal comemorar com um corte especial? Temos uma surpresa para você!',
        tipo: 'ANIVERSARIO',
        variaveis: ['nomeCliente', 'nomeBarbearia']
      },
      {
        nome: 'Promoção Especial',
        conteudo: '🔥 {{nomeCliente}}, não perca! {{nomeBarbearia}} está com uma promoção especial: {{descricaoPromocao}}. Válida até {{validadePromocao}}!',
        tipo: 'PROMOCAO',
        variaveis: ['nomeCliente', 'nomeBarbearia', 'descricaoPromocao', 'validadePromocao']
      },
      {
        nome: 'Pontos Fidelidade',
        conteudo: '⭐ {{nomeCliente}}, você acumulou {{pontos}} pontos na {{nomeBarbearia}}! Está quase ganhando uma recompensa especial!',
        tipo: 'FIDELIDADE',
        variaveis: ['nomeCliente', 'pontos', 'nomeBarbearia']
      },
      {
        nome: 'Cobrança Pendente',
        conteudo: 'Olá {{nomeCliente}}, você possui uma pendência de R$ {{valor}} referente ao serviço do dia {{dataServico}}. Entre em contato conosco para regularizar.',
        tipo: 'COBRANCA',
        variaveis: ['nomeCliente', 'valor', 'dataServico']
      }
    ];
  }
}