import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CronService } from './cron.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/role.enum';

@ApiTags('CRON Jobs')
@Controller('cron')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Get('status')
  @ApiOperation({ summary: 'Obter status dos CRON jobs' })
  @ApiResponse({ status: 200, description: 'Status dos jobs retornado com sucesso' })
  @Roles(Role.ADMIN, Role.MANAGER)
  getJobsStatus() {
    return this.cronService.getJobsStatus();
  }

  @Post('execute/:jobName')
  @ApiOperation({ summary: 'Executar job manualmente' })
  @ApiResponse({ status: 200, description: 'Job executado com sucesso' })
  @ApiResponse({ status: 404, description: 'Job não encontrado' })
  @Roles(Role.ADMIN)
  async executeJob(@Param('jobName') jobName: string) {
    await this.cronService.executarJobManual(jobName);
    return {
      message: `Job '${jobName}' executado com sucesso`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Listar jobs disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de jobs disponíveis' })
  @Roles(Role.ADMIN, Role.MANAGER)
  getAvailableJobs() {
    return {
      caixa: [
        { name: 'fechar-caixa', description: 'Fechamento automático de caixa' },
        { name: 'abrir-caixa', description: 'Abertura automática de caixa' },
        { name: 'consolidar-caixa', description: 'Consolidação de dados de caixa' },
      ],
      relatorios: [
        { name: 'relatorio-diario', description: 'Geração de relatórios diários' },
        { name: 'relatorio-semanal', description: 'Geração de relatórios semanais' },
        { name: 'relatorio-mensal', description: 'Geração de relatórios mensais' },
        { name: 'limpar-relatorios', description: 'Limpeza de relatórios antigos' },
      ],
      notificacoes: [
        { name: 'lembretes', description: 'Envio de lembretes de agendamento' },
        { name: 'aniversarios', description: 'Envio de parabéns de aniversário' },
        { name: 'limpar-notificacoes', description: 'Limpeza de notificações antigas' },
      ],
    };
  }
}