const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLancamentos() {
  try {
    const lancamentos = await prisma.lancamentoCaixa.findMany({
      where: { 
        barbeariaId: 'cmhc360oe00009hfboakqwbvv',
        descricao: { contains: 'Pagamento despesa' }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    console.log('Últimos lançamentos de despesa:', JSON.stringify(lancamentos, null, 2));
    
    // Verificar também a despesa atualizada
    const despesa = await prisma.despesa.findUnique({
      where: { id: 'cmhdl5imm0001jr2x9pg961wb' }
    });
    console.log('Status da despesa:', JSON.stringify(despesa, null, 2));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLancamentos();