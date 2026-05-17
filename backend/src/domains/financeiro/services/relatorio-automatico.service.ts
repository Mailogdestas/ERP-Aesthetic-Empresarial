// TEMPORARIAMENTE DESABILITADO - Relatórios automáticos serão implementados posteriormente
// Motivo: Tabela 'relatorio' não existe no schema.prisma atual

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RelatorioAutomaticoService {
  private readonly logger = new Logger(RelatorioAutomaticoService.name);

  constructor() {
    this.logger.log('RelatorioAutomaticoService temporariamente desabilitado');
  }

  // TODO: Implementar relatórios automáticos quando a tabela 'relatorio' for criada no schema
  // - Relatórios diários (às 6h)
  // - Relatórios semanais (segundas às 7h)  
  // - Relatórios mensais (dia 1º às 8h)
}