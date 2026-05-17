import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BaseService } from '../../../shared/base/base.service';
import { ConfigJuros } from '@prisma/client';
import { 
  CreateConfigJurosDto, 
  UpdateConfigJurosDto, 
  ConfigJurosResponseDto 
} from '../dto/config-juros.dto';

/**
 * ⚙️ CONFIG JUROS SERVICE
 * 
 * Casos de Uso:
 * - Criar Configuração de Juros
 * - Atualizar Configuração
 * - Buscar Configuração por Barbearia
 * - Validar Configurações
 */

@Injectable()
export class ConfigJurosService extends BaseService<ConfigJuros> {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'configJuros');
  }

  /**
   * 📝 CASO DE USO: Criar Configuração de Juros
   */
  async criarConfig(
    dto: CreateConfigJurosDto,
    barbeariaId: string,
    usuarioId: string,
  ): Promise<ConfigJurosResponseDto> {
    // Verificar se já existe configuração para esta barbearia
    const configExistente = await this.prisma.configJuros.findFirst({
      where: { 
        barbeariaId,
        deletedAt: null 
      }
    });

    if (configExistente) {
      throw new ConflictException('Já existe configuração de juros para esta barbearia');
    }

    // Validar dados
    this.validarConfiguracao(dto);

    const config = await this.create({
      ...dto,
      barbeariaId,
    }, usuarioId);

    return this.mapToResponse(config);
  }

  /**
   * ✏️ CASO DE USO: Atualizar Configuração
   */
  async atualizarConfig(
    id: string,
    dto: UpdateConfigJurosDto,
    usuarioId: string,
  ): Promise<ConfigJurosResponseDto> {
    // Verificar se existe
    const configExistente = await this.findById(id);
    if (!configExistente) {
      throw new NotFoundException('Configuração de juros não encontrada');
    }

    // Validar dados se fornecidos
    if (Object.keys(dto).length > 0) {
      this.validarConfiguracao(dto);
    }

    const config = await this.update(id, dto, usuarioId);
    return this.mapToResponse(config);
  }

  /**
   * 🔍 CASO DE USO: Buscar por Barbearia
   */
  async buscarPorBarbearia(barbeariaId: string): Promise<ConfigJurosResponseDto | null> {
    const config = await this.prisma.configJuros.findFirst({
      where: { 
        barbeariaId,
        deletedAt: null 
      }
    });

    return config ? this.mapToResponse(config) : null;
  }

  /**
   * 🔧 CASO DE USO: Obter ou Criar Configuração Padrão
   * Usado internamente pelo PagamentoService
   */
  async obterOuCriarPadrao(barbeariaId: string): Promise<ConfigJuros> {
    let config = await this.prisma.configJuros.findFirst({
      where: { barbeariaId }
    });

    if (!config) {
      config = await this.prisma.configJuros.create({
        data: {
          barbeariaId,
          jurosPercentual: 2.5, // 2.5% ao mês
          jurosPorParcela: 2.5,
          descontoAvista: 5.0, // 5% de desconto à vista
          minValorParcela: 50.0,
          maxParcelas: 12,
        }
      });
    }

    return config;
  }

  /**
   * 📊 CASO DE USO: Listar Todas as Configurações
   */
  async listarTodas(): Promise<ConfigJurosResponseDto[]> {
    const configs = await this.findMany({}, {
      barbearia: {
        select: {
          id: true,
          nome: true,
        }
      }
    });

    return configs.map(config => this.mapToResponse(config));
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Valida os dados da configuração
   */
  private validarConfiguracao(dto: Partial<CreateConfigJurosDto>): void {
    if (dto.jurosPercentual !== undefined) {
      if (dto.jurosPercentual < 0 || dto.jurosPercentual > 50) {
        throw new ConflictException('Juros deve estar entre 0% e 50%');
      }
    }

    if (dto.descontoAvista !== undefined) {
      if (dto.descontoAvista < 0 || dto.descontoAvista > 30) {
        throw new ConflictException('Desconto à vista deve estar entre 0% e 30%');
      }
    }

    if (dto.minValorParcela !== undefined) {
      if (dto.minValorParcela < 1) {
        throw new ConflictException('Valor mínimo da parcela deve ser maior que R$ 1,00');
      }
    }

    if (dto.maxParcelas !== undefined) {
      if (dto.maxParcelas < 1 || dto.maxParcelas > 24) {
        throw new ConflictException('Máximo de parcelas deve estar entre 1 e 24');
      }
    }
  }

  /**
   * Mapeia entidade para DTO de resposta
   */
  private mapToResponse(config: ConfigJuros & { barbearia?: any }): ConfigJurosResponseDto {
    return {
      id: config.id,
      barbeariaId: config.barbeariaId,
      jurosPercentual: Number(config.jurosPercentual),
      jurosPorParcela: Number(config.jurosPorParcela),
      descontoAvista: config.descontoAvista ? Number(config.descontoAvista) : null,
      minValorParcela: config.minValorParcela ? Number(config.minValorParcela) : null,
      maxParcelas: config.maxParcelas,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      deletedAt: config.deletedAt,
      createdByUsuarioId: config.createdByUsuarioId,
      updatedByUsuarioId: config.updatedByUsuarioId,
    };
  }
}
