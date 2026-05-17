import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';
import { FechamentoAutomaticoService } from '../services/fechamento-automatico.service';

@ApiTags('Fechamento Automático')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fechamento-automatico')
export class FechamentoAutomaticoController {
  constructor(
    private readonly fechamentoAutomaticoService: FechamentoAutomaticoService
  ) {}

  @Post('processar-barbearia/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Processar fechamento para uma barbearia específica' })
  @ApiParam({ name: 'barbeariaId', description: 'ID da barbearia' })
  @ApiQuery({ name: 'data', required: false, description: 'Data do fechamento (YYYY-MM-DD)' })
  @ApiResponse({
    status: 201,
    description: 'Fechamento processado com sucesso'
  })
  async processarFechamentoBarbearia(
    @Param('barbeariaId') barbeariaId: string,
    @Query('data') data?: string
  ) {
    return this.fechamentoAutomaticoService.processarFechamentoBarbearia(
      barbeariaId,
      data
    );
  }

  @Post('reprocessar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reprocessar fechamentos com erro para uma data específica' })
  @ApiQuery({ name: 'data', required: true, description: 'Data para reprocessar (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Reprocessamento concluído'
  })
  async reprocessarFechamentosComErro(
    @Query('data') data: string
  ) {
    return this.fechamentoAutomaticoService.reprocessarFechamentosComErro(data);
  }

  @Get('status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Verificar status dos fechamentos de ontem' })
  @ApiResponse({
    status: 200,
    description: 'Status dos fechamentos'
  })
  async verificarStatusFechamentos() {
    return this.fechamentoAutomaticoService.verificarStatusFechamentos();
  }

  @Post('executar-agora')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Executar processamento de fechamentos manualmente' })
  @ApiResponse({
    status: 200,
    description: 'Processamento executado'
  })
  async executarProcessamentoManual() {
    return this.fechamentoAutomaticoService.processarFechamentosAutomaticos();
  }
}