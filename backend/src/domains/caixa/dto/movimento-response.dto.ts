import { ApiProperty } from '@nestjs/swagger';
import { TipoMovimento } from '@prisma/client';

export class MovimentoSessaoResponseDto {
  @ApiProperty({ description: 'ID do movimento' })
  id: string;

  @ApiProperty({ description: 'Tipo do movimento', enum: TipoMovimento })
  tipo: TipoMovimento;

  @ApiProperty({ description: 'Valor do movimento' })
  valor: string;

  @ApiProperty({ description: 'Descrição do movimento' })
  descricao: string;

  @ApiProperty({ description: 'Método de pagamento', required: false })
  metodo?: string;

  @ApiProperty({ description: 'Origem do movimento' })
  origem: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Informações da venda relacionada', required: false })
  venda?: {
    id: string;
    valorTotal: number;
    status: string;
  };

  @ApiProperty({ description: 'Informações do pagamento relacionado', required: false })
  pagamento?: {
    id: string;
    valor: number;
    metodoPagamento: string;
  };
}

export class MovimentosSessaoResponseDto {
  @ApiProperty({ description: 'Informações da sessão' })
  sessao: {
    id: string;
    openedAt: Date;
    closedAt?: Date;
    valorAbertura: string;
  };

  @ApiProperty({ description: 'Lista de movimentos', type: [MovimentoSessaoResponseDto] })
  movimentos: MovimentoSessaoResponseDto[];

  @ApiProperty({ description: 'Resumo financeiro' })
  resumo: {
    totalEntradas: string;
    totalSaidas: string;
    saldoAtual: string;
    quantidadeMovimentos: number;
  };
}