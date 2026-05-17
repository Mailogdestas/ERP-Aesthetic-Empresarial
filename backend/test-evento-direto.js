const { PrismaClient } = require('@prisma/client');
const { EventEmitter2 } = require('@nestjs/event-emitter');

const prisma = new PrismaClient();

async function testarEventoDireto() {
  try {
    console.log('🧪 TESTE DIRETO: Verificando dados no banco');
    console.log('==========================================\n');

    // 1. Verificar se existe barbearia
    console.log('1️⃣ Verificando barbearias...');
    const barbearias = await prisma.barbearia.findMany({
      take: 1
    });
    
    if (barbearias.length === 0) {
      console.log('   ❌ Nenhuma barbearia encontrada no banco');
      return;
    }
    
    const barbeariaId = barbearias[0].id;
    console.log(`   ✅ Barbearia: ${barbearias[0].nome} (${barbeariaId})\n`);

    // 2. Verificar sessões de caixa
    console.log('2️⃣ Verificando sessões de caixa...');
    const sessoes = await prisma.caixaSessao.findMany({
      where: { barbeariaId },
      include: {
        movimentos: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`   📊 Sessões encontradas: ${sessoes.length}`);
    
    if (sessoes.length > 0) {
      const sessaoAtiva = sessoes.find(s => s.closedAt === null);
      if (sessaoAtiva) {
        console.log(`   ✅ Sessão ativa: ${sessaoAtiva.id}`);
        console.log(`   💰 Saldo: R$ ${sessaoAtiva.saldoAtual}`);
        console.log(`   📋 Movimentos: ${sessaoAtiva.movimentos.length}`);
        
        if (sessaoAtiva.movimentos.length > 0) {
          console.log('   📋 Últimos movimentos:');
          sessaoAtiva.movimentos.slice(-3).forEach((mov, i) => {
            console.log(`      ${i + 1}. ${mov.tipo} - R$ ${mov.valor} (${mov.origem || 'N/A'})`);
          });
        }
      } else {
        console.log('   ⚠️ Nenhuma sessão aberta');
      }
    }
    console.log();

    // 3. Verificar vendas
    console.log('3️⃣ Verificando vendas...');
    const vendas = await prisma.venda.findMany({
      where: { barbeariaId },
      include: {
        itens: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`   📊 Vendas encontradas: ${vendas.length}`);
    
    if (vendas.length > 0) {
      console.log('   📋 Últimas vendas:');
      vendas.forEach((venda, i) => {
        console.log(`      ${i + 1}. ${venda.status} - R$ ${venda.valorTotal || '0.00'} (${venda.id})`);
      });
    }
    console.log();

    // 4. Verificar movimentos de caixa relacionados a vendas
    console.log('4️⃣ Verificando movimentos de venda no caixa...');
    const movimentosVenda = await prisma.caixaMovimento.findMany({
      where: {
        origem: 'VENDA',
        tipo: 'ENTRADA'
      },
      include: {
        sessao: {
          select: {
            id: true,
            barbeariaId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`   📊 Movimentos de venda: ${movimentosVenda.length}`);
    
    if (movimentosVenda.length > 0) {
      console.log('   📋 Últimos movimentos de venda:');
      movimentosVenda.slice(0, 5).forEach((mov, i) => {
        console.log(`      ${i + 1}. R$ ${mov.valor} - Sessão: ${mov.sessao?.id || 'N/A'} (${mov.createdAt.toISOString()})`);
      });
    }
    console.log();

    // 5. Análise
    console.log('🎯 ANÁLISE:');
    
    const vendasFinalizadas = vendas.filter(v => v.status === 'FINALIZADA');
    console.log(`   📈 Vendas finalizadas: ${vendasFinalizadas.length}`);
    console.log(`   💰 Movimentos de venda no caixa: ${movimentosVenda.length}`);
    
    if (vendasFinalizadas.length > 0 && movimentosVenda.length === 0) {
      console.log('   ❌ PROBLEMA: Existem vendas finalizadas mas nenhum movimento no caixa');
      console.log('   💡 O evento VENDA_FINALIZADA não está sendo processado');
    } else if (vendasFinalizadas.length > 0 && movimentosVenda.length > 0) {
      console.log('   ✅ SUCESSO: Vendas finalizadas geraram movimentos no caixa');
      console.log('   🎉 O evento VENDA_FINALIZADA está funcionando');
    } else if (vendasFinalizadas.length === 0) {
      console.log('   ⚠️ INFO: Nenhuma venda finalizada para testar');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testarEventoDireto();