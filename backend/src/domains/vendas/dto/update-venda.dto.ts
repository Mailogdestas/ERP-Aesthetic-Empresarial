import { PartialType } from '@nestjs/swagger';
import { CreateVendaDto } from './create-venda.dto';
import { VendaStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateVendaDto extends PartialType(CreateVendaDto) {
  @IsOptional()
  @IsEnum(VendaStatus)
  status?: VendaStatus;
}
