import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EstoqueService } from '../services/estoque.service';
import { CreateEstoqueDto, UpdateEstoqueDto, AjustarEstoqueDto } from '../dto';
import { JwtAuthGuard } from '../../../core/auth/jwt.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/role.enum';

@ApiTags('estoque')
@ApiBearerAuth()
@Controller('estoque')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar novo registro de estoque' })
  @ApiResponse({ status: 201, description: 'Estoque criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Produto, barbearia ou usuário não encontrado' })
  async create(@Body() createEstoqueDto: CreateEstoqueDto) {
    return await this.estoqueService.create(createEstoqueDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Listar estoque com filtros' })
  @ApiQuery({ name: 'barbeariaId', required: false, description: 'ID da barbearia' })
  @ApiQuery({ name: 'produtoId', required: false, description: 'ID do produto' })
  @ApiQuery({ name: 'alertaEstoqueBaixo', required: false, type: Boolean, description: 'Filtrar apenas produtos com estoque baixo' })
  @ApiResponse({ status: 200, description: 'Lista de estoque retornada com sucesso' })
  async findAll(
    @Query('barbeariaId') barbeariaId?: string,
    @Query('produtoId') produtoId?: string,
    @Query('alertaEstoqueBaixo') alertaEstoqueBaixo?: boolean,
  ) {
    return await this.estoqueService.findAll({
      barbeariaId,
      produtoId,
      alertaEstoqueBaixo,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar estoque por ID' })
  @ApiParam({ name: 'id', description: 'ID do estoque' })
  @ApiResponse({ status: 200, description: 'Dados do estoque' })
  @ApiResponse({ status: 404, description: 'Estoque não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.estoqueService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar estoque' })
  @ApiParam({ name: 'id', description: 'ID do estoque' })
  @ApiResponse({ status: 200, description: 'Estoque atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Estoque não encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEstoqueDto: UpdateEstoqueDto,
  ) {
    return await this.estoqueService.update(id, updateEstoqueDto);
  }

  @Post('ajustar')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Ajustar quantidade em estoque' })
  @ApiResponse({ status: 200, description: 'Quantidade ajustada com sucesso' })
  async ajustar(@Body() ajustarEstoqueDto: AjustarEstoqueDto) {
    return await this.estoqueService.ajustarQuantidade(ajustarEstoqueDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Excluir estoque' })
  @ApiParam({ name: 'id', description: 'ID do estoque' })
  @ApiResponse({ status: 200, description: 'Estoque excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Estoque não encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.estoqueService.remove(id);
  }

  @Get('baixo/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Buscar produtos com estoque baixo' })
  @ApiParam({ name: 'barbeariaId', description: 'ID da barbearia' })
  @ApiResponse({ status: 200, description: 'Lista de produtos com estoque baixo' })
  async getEstoqueBaixo(@Param('barbeariaId', ParseUUIDPipe) barbeariaId: string) {
    return await this.estoqueService.getEstoqueBaixo(barbeariaId);
  }

  @Get('resumo/:barbeariaId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.BARBER)
  @ApiOperation({ summary: 'Obter resumo do estoque' })
  @ApiParam({ name: 'barbeariaId', description: 'ID da barbearia' })
  @ApiResponse({ status: 200, description: 'Resumo do estoque' })
  async getResumoEstoque(@Param('barbeariaId', ParseUUIDPipe) barbeariaId: string) {
    return await this.estoqueService.getResumoEstoque(barbeariaId);
  }
}