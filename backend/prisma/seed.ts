import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 🏢 Criar Barbearia
  const barbearia = await prisma.barbearia.create({
    data: {
      nome: 'Maciotha Barber Shop',
      cnpj: '12.345.678/0001-90',
      telefone: '(11) 99999-9999',
      email: 'contato@maciothabarber.com',
      endereco: 'Rua das Barbearias, 123, São Paulo, SP, 01234-567',
      ativo: true,
    },
  });

  // 🔐 Hash das senhas
  const senhaHashAdmin = await bcrypt.hash('admin123', 10);
  const senhaHashGerente = await bcrypt.hash('gerente123', 10);
  const senhaHashBarbeiro = await bcrypt.hash('barbeiro123', 10);

  // 👤 Criar Usuários
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Admin Sistema',
      email: 'admin@maciotha.com',
      senha: 'admin123',
      role: 'ADMIN',
      barbeariaId: barbearia.id,
    },
  });

  const gerente = await prisma.usuario.create({
    data: {
      nome: 'João Gerente',
      email: 'gerente@maciotha.com',
      senha: 'gerente123',
      role: 'MANAGER',
      barbeariaId: barbearia.id,
    },
  });

  const barbeiro = await prisma.usuario.create({
    data: {
      nome: 'Carlos Barbeiro',
      email: 'barbeiro@maciotha.com',
      senha: 'barbeiro123',
      role: 'BARBER',
      barbeariaId: barbearia.id,
    },
  });

  // 💇‍♂️ Criar Barbeiros
  const barbeiro1 = await prisma.barbeiro.create({
    data: {
      nome: 'Carlos Barbeiro',
      telefone: '(11) 99999-0003',
      comissaoPadrao: 0.4,
      usuarioId: barbeiro.id,
      barbeariaId: barbearia.id,
    },
  });

  const barbeiro2 = await prisma.barbeiro.create({
    data: {
      nome: 'Pedro Silva',
      telefone: '(11) 99999-0004',
      comissaoPadrao: 0.35,
      barbeariaId: barbearia.id,
    },
  });

  // 🏷️ Criar Categoria de Serviços
  const categoria = await prisma.categoriaServico.create({
    data: {
      nome: 'Serviços Básicos',
      barbeariaId: barbearia.id,
    },
  });

  // 🎯 Criar Serviços
  const servicoCorte = await prisma.servico.create({
    data: {
      nome: 'Corte Masculino',
      preco: 35.00,
      duracaoMin: 30,
      barbeariaId: barbearia.id,
      categoriaId: categoria.id,
    },
  });

  const servicoBarba = await prisma.servico.create({
    data: {
      nome: 'Barba Completa',
      preco: 25.00,
      duracaoMin: 20,
      barbeariaId: barbearia.id,
      categoriaId: categoria.id,
    },
  });

  // 🛍️ Criar Produtos
  const produto1 = await prisma.produto.create({
    data: {
      nome: 'Pomada Modeladora',
      preco: 45.00,
      barbeariaId: barbearia.id,
    },
  });

  const produto2 = await prisma.produto.create({
    data: {
      nome: 'Óleo para Barba',
      preco: 35.00,
      barbeariaId: barbearia.id,
    },
  });

  // 📦 Criar Pacotes
  const pacoteCompleto = await prisma.pacote.create({
    data: {
      nome: 'Pacote Completo',
      valor: 120.00,
      itens: [
        {
          servicoId: servicoCorte.id,
          quantidade: 2,
          valorUnitario: 35.00,
        },
        {
          servicoId: servicoBarba.id,
          quantidade: 2,
          valorUnitario: 25.00,
        },
      ],
      ativo: true,
      barbeariaId: barbearia.id,
      createdByUsuarioId: admin.id,
    },
  });

  const pacoteBasico = await prisma.pacote.create({
    data: {
      nome: 'Pacote Básico',
      valor: 60.00,
      itens: [
        {
          servicoId: servicoCorte.id,
          quantidade: 2,
          valorUnitario: 35.00,
        },
      ],
      ativo: true,
      barbeariaId: barbearia.id,
      createdByUsuarioId: admin.id,
    },
  });

  // 👥 Criar Clientes
  const cliente1 = await prisma.cliente.create({
    data: {
      nome: 'Pedro Silva',
      telefone: '(11) 98888-1111',
      email: 'pedro@email.com',
      ativo: true,
      barbeariaId: barbearia.id,
    },
  });

  const cliente2 = await prisma.cliente.create({
    data: {
      nome: 'João Santos',
      telefone: '(11) 98888-2222',
      email: 'joao@email.com',
      ativo: true,
      barbeariaId: barbearia.id,
    },
  });

  // 📅 Criar Agendamentos
  await prisma.agendamento.create({
    data: {
      clienteId: cliente1.id,
      barbeiroId: barbeiro1.id,
      servicoId: servicoCorte.id,
      barbeariaId: barbearia.id,
      inicio: new Date('2024-11-01T10:00:00'),
      fim: new Date('2024-11-01T10:30:00'),
      status: 'CONFIRMADO',
      observacoes: 'Cliente preferencial',
    },
  });

  await prisma.agendamento.create({
    data: {
      clienteId: cliente2.id,
      barbeiroId: barbeiro2.id,
      servicoId: servicoBarba.id,
      barbeariaId: barbearia.id,
      inicio: new Date('2024-11-01T14:00:00'),
      fim: new Date('2024-11-01T14:45:00'),
      status: 'PENDENTE',
      observacoes: 'Primeira visita',
    },
  });

  // 💰 Criar Caixa
  await prisma.caixa.create({
    data: {
      barbeariaId: barbearia.id,
      saldo: 1000.0,
    },
  });

  // 📊 Criar Sessão de Caixa
  await prisma.caixaSessao.create({
    data: {
      barbeariaId: barbearia.id,
      openedByUserId: admin.id,
      valorAbertura: 100.0,
    },
  });

  // 💰 Criar Vendas primeiro
  const venda1 = await prisma.venda.create({
    data: {
      clienteId: cliente1.id,
      barbeariaId: barbearia.id,
      valorTotal: 35.00,
      status: 'FINALIZADA',
    },
  });

  const venda2 = await prisma.venda.create({
    data: {
      clienteId: cliente2.id,
      barbeariaId: barbearia.id,
      valorTotal: 25.00,
      status: 'FINALIZADA',
    },
  });

  // 💳 Criar Pagamentos
  await prisma.pagamento.create({
    data: {
      vendaId: venda1.id,
      valor: 35,
      metodo: 'DINHEIRO',
      status: 'APROVADO',
      pagoEm: new Date(),
    },
  });

  await prisma.pagamento.create({
    data: {
      vendaId: venda2.id,
      valor: 25,
      metodo: 'CARTAO',
      status: 'APROVADO',
      pagoEm: new Date(),
    },
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('🏢 Barbearia criada:', barbearia.nome);
  console.log('👤 Usuários criados: Admin, Gerente, Barbeiro');
  console.log('🎯 Serviços criados: Corte Masculino, Barba Completa');
  console.log('📦 Pacotes criados: Pacote Completo, Pacote Básico');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });