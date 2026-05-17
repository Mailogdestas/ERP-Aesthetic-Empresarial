const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDespesas() {
  try {
    const despesas = await prisma.despesa.findMany({
      where: { barbeariaId: 'cmhc360oe00009hfboakqwbvv' }
    });
    console.log('Despesas encontradas:', JSON.stringify(despesas, null, 2));
    
    if (despesas.length === 0) {
      console.log('Nenhuma despesa encontrada. Vamos criar uma para teste...');
      
      const novaDespesa = await prisma.despesa.create({
        data: {
          descricao: 'Compra de produtos para barbearia',
          valor: 120.00,
          tipo: 'OPERACIONAL',
          vencimento: new Date(),
          status: 'PENDENTE',
          barbeariaId: 'cmhc360oe00009hfboakqwbvv',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('Nova despesa criada:', JSON.stringify(novaDespesa, null, 2));
    }
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDespesas();