import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { CreateClienteDto, UpdateClienteDto } from '../dto/cliente.dto';
import { Cliente } from '@prisma/client';

/**
 * 👤 CLIENTE SERVICE
 * 
 * Casos de Uso:
 * - Cadastrar Cliente
 * - Atualizar Cliente  
 * - Consultar Histórico
 * - Gerar Pontos Fidelidade (via evento)
 */

@Injectable()
export class ClienteService extends BaseService<Cliente> {
  constructor(prisma: PrismaService) {
    super(prisma, 'cliente');
  }

  /**
   * 📝 CASO DE USO: Cadastrar Cliente
   */
  async cadastrarCliente(
    data: CreateClienteDto,
    barbeariaId: string,
    usuarioId: string,
  ): Promise<Cliente> {
    // Validar se já existe cliente com mesmo telefone na barbearia
    const existingCliente = await this.prisma.cliente.findFirst({
      where: {
        telefone: data.telefone,
        barbeariaId,
        deletedAt: null,
      },
    });

    if (existingCliente) {
      throw new ConflictException('Já existe um cliente com este telefone');
    }

    // Validar se já existe cliente com mesmo email na barbearia (se fornecido)
    if (data.email) {
      const existingEmail = await this.prisma.cliente.findFirst({
        where: {
          email: data.email,
          barbeariaId,
          deletedAt: null,
        },
      });

      if (existingEmail) {
        throw new ConflictException('Já existe um cliente com este email');
      }
    }

    // Transformar data de nascimento se fornecida
    const processedData = this.processClienteData(data);

    return this.create({
      ...processedData,
      barbeariaId,
    }, usuarioId);
  }

  /**
   * ✏️ CASO DE USO: Atualizar Cliente
   */
  async atualizarCliente(
    id: string,
    data: UpdateClienteDto,
    barbeariaId: string,
    usuarioId: string,
  ): Promise<Cliente> {
    const cliente = await this.findById(id);
    if (!cliente || cliente.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Validar telefone único (se alterado)
    if (data.telefone && data.telefone !== cliente.telefone) {
      const existingTelefone = await this.prisma.cliente.findFirst({
        where: {
          telefone: data.telefone,
          barbeariaId,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existingTelefone) {
        throw new ConflictException('Já existe um cliente com este telefone');
      }
    }

    // Validar email único (se alterado)
    if (data.email && data.email !== cliente.email) {
      const existingEmail = await this.prisma.cliente.findFirst({
        where: {
          email: data.email,
          barbeariaId,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existingEmail) {
        throw new ConflictException('Já existe um cliente com este email');
      }
    }

    return this.update(id, this.processClienteData(data), usuarioId);
  }

  /**
   * 🔄 Processa dados do cliente, transformando data de nascimento
   */
  private processClienteData(data: CreateClienteDto | UpdateClienteDto): any {
    const processedData: any = { ...data };
    
    // Transformar dataNascimento de string YYYY-MM-DD para DateTime
    if (processedData.dataNascimento) {
      // Se é uma string no formato YYYY-MM-DD, converter para DateTime
      if (typeof processedData.dataNascimento === 'string') {
        // Adicionar horário padrão (meio-dia UTC) para evitar problemas de timezone
        processedData.dataNascimento = new Date(`${processedData.dataNascimento}T12:00:00.000Z`);
      }
    }
    
    return processedData;
  }

  /**
   * 📊 CASO DE USO: Consultar Histórico do Cliente
   */
  async consultarHistorico(clienteId: string, barbeariaId: string) {
    const cliente = await this.findById(clienteId);
    if (!cliente || cliente.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Buscar histórico completo
    const [atendimentos, vendas, agendamentos, fidelidade] = await Promise.all([
      // Histórico de atendimentos
      this.prisma.historicoAtendimento.findMany({
        where: {
          clienteId,
          deletedAt: null,
        },
        include: {
          barbeiro: {
            select: { nome: true },
          },
        },
        orderBy: { data: 'desc' },
        take: 10,
      }),

      // Histórico de vendas
      this.prisma.venda.findMany({
        where: {
          clienteId,
          deletedAt: null,
        },
        include: {
          itens: {
            include: {
              produto: { select: { nome: true } },
              servico: { select: { nome: true } },
            },
          },
          barbeiro: {
            select: { nome: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Próximos agendamentos
      this.prisma.agendamento.findMany({
        where: {
          clienteId,
          inicio: { gte: new Date() },
          status: { in: ['PENDENTE', 'CONFIRMADO'] },
          deletedAt: null,
        },
        include: {
          barbeiro: {
            select: { nome: true },
          },
          servico: {
            select: { nome: true, duracaoMin: true },
          },
        },
        orderBy: { inicio: 'asc' },
        take: 5,
      }),

      // Pontos de fidelidade
      this.prisma.fidelidade.findFirst({
        where: {
          clienteId,
        },
      }),
    ]);

    return {
      cliente,
      resumo: {
        totalAtendimentos: atendimentos.length,
        totalVendas: vendas.length,
        proximosAgendamentos: agendamentos.length,
        pontosFidelidade: fidelidade?.pontos || 0,
      },
      historico: {
        atendimentos,
        vendas,
        agendamentos,
      },
    };
  }

  /**
   * 🔍 Buscar clientes da barbearia
   */
  async buscarClientesBarbearia(
    barbeariaId: string,
    filtros?: {
      nome?: string;
      telefone?: string;
      email?: string;
    },
  ): Promise<Cliente[]> {
    const where: any = {
      barbeariaId,
      deletedAt: null,
    };

    if (filtros?.nome) {
      where.nome = {
        contains: filtros.nome,
        mode: 'insensitive',
      };
    }

    if (filtros?.telefone) {
      where.telefone = {
        contains: filtros.telefone,
      };
    }

    if (filtros?.email) {
      where.email = {
        contains: filtros.email,
        mode: 'insensitive',
      };
    }

    return this.findMany(where, {
      fidelidade: true,
      _count: {
        select: {
          agendamentos: true,
          vendas: true,
          historicos: true,
        },
      },
    });
  }

  /**
   * 🗑️ SOFT DELETE: Deletar Cliente
   */
  async deletarCliente(
    id: string,
    barbeariaId: string,
    usuarioId: string,
  ): Promise<void> {
    const cliente = await this.findById(id);
    if (!cliente || cliente.barbeariaId !== barbeariaId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    // Verificar se tem agendamentos futuros
    const agendamentosFuturos = await this.prisma.agendamento.count({
      where: {
        clienteId: id,
        inicio: { gte: new Date() },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
        deletedAt: null,
      },
    });

    if (agendamentosFuturos > 0) {
      throw new ConflictException(
        'Não é possível deletar cliente com agendamentos futuros',
      );
    }

    await this.softDelete(id, usuarioId);
  }
}
