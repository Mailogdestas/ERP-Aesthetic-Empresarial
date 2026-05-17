const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHistorico() {
  try {
    const agendamentoId = 'cmhcri1ha0009tbfh3uf28s0d';
    
    console.log(`🔍 Verificando histórico para agendamento: ${agendamentoId}`);
    
    const historicos = await prisma.historicoAtendimento.findMany({
      where: { agendamentoId }
    });
    
    console.log(`📊 Históricos encontrados: ${historicos.length}`);
    
    if (historicos.length > 0) {
      console.log('📋 Primeiro histórico:');
      console.log(JSON.stringify(historicos[0], null, 2));
    } else {
      console.log('❌ Nenhum histórico encontrado!');
      
      // Verificar se o agendamento existe
      const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId }
      });
      
      if (agendamento) {
        console.log(`✅ Agendamento existe com status: ${agendamento.status}`);
      } else {
        console.log('❌ Agendamento não encontrado!');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistorico();