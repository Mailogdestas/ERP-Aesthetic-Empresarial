import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';
import { VendaStatus } from '@prisma/client';

export class CreateVendaDto {
  @ApiProperty({ description: 'ID da barbearia', example: 'uuid' })
  @IsUUID()
  barbeariaId: string;

  @ApiProperty({ description: 'ID do cliente', example: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiProperty({ description: 'ID do barbeiro', example: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  barbeiroId?: string;

  @ApiProperty({ description: 'ID do agendamento', example: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  agendamentoId?: string;

  @ApiProperty({ description: 'Status da venda', enum: VendaStatus, required: false })
  @IsOptional()
  status?: VendaStatus;
}
