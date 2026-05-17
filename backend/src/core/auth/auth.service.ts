import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Role } from './role.enum';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, senha: string) {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role as Role, barbeariaId: user.barbeariaId },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' },
    );
    return { accessToken: token };
  }
}
