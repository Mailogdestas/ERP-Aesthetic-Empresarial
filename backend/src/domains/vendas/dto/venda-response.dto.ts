import { ApiProperty } from '@nestjs/swagger';
import { VendaStatus } from '@prisma/client';

export class ItemVendaResponseDto {
  @ApiProperty({ description: 'ID do item' })
  id: string;

  @ApiProperty({ description: 'ID do produto (se aplicável)' })
  produtoId?: string;

  @ApiProperty({ description: 'Nome do produto (se aplicável)' })
  produtoNome?: string;

  @ApiProperty({ description: 'ID do serviço (se aplicável)' })
  servicoId?: string;

  @ApiProperty({ description: 'Nome do serviço (se aplicável)' })
  servicoNome?: string;

  @ApiProperty({ description: 'Quantidade' })
  quantidade: number;

  @ApiProperty({ description: 'Preço unitário' })
  precoUnit: number;

  @ApiProperty({ description: 'Total do item' })
  total: number;

  @ApiProperty({ description: 'Tipo de comissão (FIXA ou PERCENTUAL)', required: false })
  comissaoTipo?: string;

  @ApiProperty({ description: 'Valor da comissão configurada', required: false })
  comissaoValor?: number;

  @ApiProperty({ description: 'Valor da comissão calculada', required: false })
  comissaoCalculada?: number;
}

export class VendaResponseDto {
  @ApiProperty({ description: 'ID da venda' })
  id: string;

  @ApiProperty({ description: 'ID da barbearia' })
  barbeariaId: string;

  @ApiProperty({ description: 'ID do cliente (se aplicável)' })
  clienteId: string;

  @ApiProperty({ description: 'Nome do cliente (se aplicável)' })
  clienteNome?: string;

  @ApiProperty({ description: 'ID do barbeiro (se aplicável)' })
  barbeiroId: string;

  @ApiProperty({ description: 'Nome do barbeiro (se aplicável)' })
  barbeiroNome?: string;

  @ApiProperty({ description: 'ID do agendamento (se aplicável)' })
  agendamentoId: string;

  @ApiProperty({ description: 'Status da venda', enum: VendaStatus })
  status: VendaStatus;

  @ApiProperty({ description: 'Valor total da venda' })
  valorTotal: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  @ApiProperty({ description: 'Data de exclusão (se aplicável)' })
  deletedAt: Date;

  @ApiProperty({ description: 'ID do usuário que criou' })
  createdByUsuarioId: string;

  @ApiProperty({ description: 'ID do usuário que atualizou' })
  updatedByUsuarioId: string;

  @ApiProperty({ description: 'Itens da venda', type: [ItemVendaResponseDto] })
  itens: ItemVendaResponseDto[];
}
