import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SaasService } from '../services/saas.service';
import { CreateAssinaturaDto, CreateFaturaDto } from '../dto';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';

@ApiTags('SaaS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('saas')
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  @Post('assinaturas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar nova assinatura' })
  @ApiResponse({ status: 201, description: 'Assinatura criada com sucesso' })
  async createAssinatura(@Body() createAssinaturaDto: CreateAssinaturaDto) {
    return this.saasService.createAssinatura(createAssinaturaDto);
  }

  @Get('assinaturas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar assinaturas' })
  @ApiResponse({ status: 200, description: 'Lista de assinaturas' })
  async findAssinaturas(@Query() filters: any) {
    return this.saasService.findAssinaturas(filters);
  }

  @Get('assinaturas/barbearia/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar assinatura da barbearia' })
  @ApiResponse({ status: 200, description: 'Assinatura da barbearia' })
  async findAssinaturaBarbearia(@Param('barbeariaId') barbeariaId: string) {
    return this.saasService.findAssinaturaBarbearia(barbeariaId);
  }

  @Post('faturas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Gerar nova fatura' })
  @ApiResponse({ status: 201, description: 'Fatura gerada com sucesso' })
  async createFatura(@Body() createFaturaDto: CreateFaturaDto) {
    return this.saasService.createFatura(createFaturaDto);
  }

  @Get('faturas/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar faturas da barbearia' })
  @ApiResponse({ status: 200, description: 'Lista de faturas' })
  async findFaturas(
    @Param('barbeariaId') barbeariaId: string,
    @Query('status') status?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.saasService.findFaturas({
      barbeariaId,
      status,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    });
  }

  @Get('dashboard')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Dashboard SaaS' })
  @ApiResponse({ status: 200, description: 'Dados do dashboard SaaS' })
  async getDashboard() {
    return this.saasService.getDashboard();
  }

  @Get('features/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar features ativas da barbearia' })
  @ApiResponse({ status: 200, description: 'Features ativas' })
  async getFeaturesAtivas(@Param('barbeariaId') barbeariaId: string) {
    return this.saasService.getFeaturesAtivas(barbeariaId);
  }
}