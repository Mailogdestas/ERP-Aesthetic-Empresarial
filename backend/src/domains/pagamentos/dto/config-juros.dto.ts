import { IsNumber, IsOptional, IsInt, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateConfigJurosDto {
  @ApiProperty({
    description: 'Percentual base de juros',
    example: 2.90,
    type: Number
  })
  @IsNumber()
  jurosPercentual: number

  @ApiProperty({
    description: 'Juros adicional por parcela',
    example: 0.19,
    type: Number
  })
  @IsNumber()
  jurosPorParcela: number

  @ApiPropertyOptional({
    description: 'Desconto à vista (opcional)',
    example: 5.00,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  descontoAvista?: number

  @ApiPropertyOptional({
    description: 'Valor mínimo por parcela',
    example: 5.00,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  minValorParcela?: number

  @ApiPropertyOptional({
    description: 'Máximo de parcelas permitidas',
    example: 12,
    minimum: 1,
    maximum: 24
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  maxParcelas?: number
}

export class UpdateConfigJurosDto {
  @ApiPropertyOptional({
    description: 'Percentual base de juros',
    example: 2.90,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  jurosPercentual?: number

  @ApiPropertyOptional({
    description: 'Juros adicional por parcela',
    example: 0.19,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  jurosPorParcela?: number

  @ApiPropertyOptional({
    description: 'Desconto à vista (opcional)',
    example: 5.00,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  descontoAvista?: number

  @ApiPropertyOptional({
    description: 'Valor mínimo por parcela',
    example: 5.00,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  minValorParcela?: number

  @ApiPropertyOptional({
    description: 'Máximo de parcelas permitidas',
    example: 12,
    minimum: 1,
    maximum: 24
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  maxParcelas?: number
}

export class ConfigJurosResponseDto {
  @ApiProperty({
    description: 'ID da configuração',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  id: string

  @ApiProperty({
    description: 'ID da barbearia',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  })
  barbeariaId: string

  @ApiProperty({
    description: 'Percentual base de juros',
    example: 2.90,
    type: Number
  })
  jurosPercentual: number

  @ApiProperty({
    description: 'Juros adicional por parcela',
    example: 0.19,
    type: Number
  })
  jurosPorParcela: number

  @ApiProperty({
    description: 'Desconto à vista',
    example: 5.00,
    type: Number,
    nullable: true
  })
  descontoAvista: number | null

  @ApiProperty({
    description: 'Valor mínimo por parcela',
    example: 5.00,
    type: Number,
    nullable: true
  })
  minValorParcela: number | null

  @ApiProperty({
    description: 'Máximo de parcelas permitidas',
    example: 12,
    nullable: true
  })
  maxParcelas: number | null

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00Z',
    type: Date
  })
  createdAt: Date

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-15T10:30:00Z',
    type: Date
  })
  updatedAt: Date

  @ApiProperty({
    description: 'Data de exclusão (soft delete)',
    example: null,
    type: Date,
    nullable: true
  })
  deletedAt: Date | null

  @ApiProperty({
    description: 'ID do usuário que criou',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    nullable: true
  })
  createdByUsuarioId: string | null

  @ApiProperty({
    description: 'ID do usuário que atualizou',
    example: 'clxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    nullable: true
  })
  updatedByUsuarioId: string | null
}
