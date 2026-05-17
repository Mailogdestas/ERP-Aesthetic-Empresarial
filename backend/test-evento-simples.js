const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testarEventoSimples() {
  try {
    console.log('🧪 TESTE SIMPLES: Evento VENDA_FINALIZADA → Caixa');
    console.log('===============================================\n');

    // 1. Verificar sessão de caixa
    console.log('1️⃣ Verificando sessão de caixa...');
    let sessao;
    try {
      const sessoes = await axios.get(`${BASE_URL}/caixa/sessoes`);
      console.log(`   Sessões encontradas: ${sessoes.data.length}`);
      
      sessao = sessoes.data.find(s => s.status === 'ABERTA');
      
      if (!sessao) {
        console.log('   ⚠️ Nenhuma sessão aberta encontrada');
        console.log('   💡 Crie uma sessão manualmente ou ajuste o teste');
        return;
      }
    } catch (error) {
      console.log('   ❌ Erro ao buscar sessões:', error.response?.data || error.message);
      return;
    }
    
    console.log(`   ✅ Sessão ativa: ${sessao.id}`);
    console.log(`   💰 Saldo inicial: R$ ${sessao.saldoAtual}\n`);

    // 2. Listar vendas existentes
    console.log('2️⃣ Verificando vendas existentes...');
    try {
      const vendas = await axios.get(`${BASE_URL}/vendas`);
      console.log(`   Vendas encontradas: ${vendas.data.length}`);
      
      if (vendas.data.length === 0) {
        console.log('   ⚠️ Nenhuma venda encontrada');
        console.log('   💡 Crie uma venda manualmente ou ajuste o teste');
        return;
      }

      // Pegar a primeira venda que não está finalizada
      const vendaAberta = vendas.data.find(v => v.status === 'ABERTA');
      
      if (!vendaAberta) {
        console.log('   ⚠️ Nenhuma venda aberta encontrada');
        console.log('   💡 Crie uma venda aberta manualmente');
        return;
      }

      const vendaId = vendaAberta.id;
      console.log(`   ✅ Venda selecionada: ${vendaId}`);
      console.log(`   📊 Status: ${vendaAberta.status}`);
      console.log(`   💵 Valor: R$ ${vendaAberta.valorTotal || '0.00'}\n`);

      // 3. Verificar movimentos ANTES de finalizar
      console.log('3️⃣ Movimentos ANTES de finalizar:');
      const sessaoAntes = await axios.get(`${BASE_URL}/caixa/sessoes/${sessao.id}`);
      console.log(`   💰 Saldo: R$ ${sessaoAntes.data.saldoAtual}`);
      console.log(`   📋 Movimentos: ${sessaoAntes.data.movimentos?.length || 0}\n`);

      // 4. FINALIZAR VENDA (aqui que o evento deve ser emitido)
      console.log('4️⃣ 🔥 FINALIZANDO VENDA (evento VENDA_FINALIZADA)...');
      await axios.patch(`${BASE_URL}/vendas/${vendaId}/finalizar`);
      console.log('   ✅ Venda finalizada!\n');

      // 5. Aguardar processamento do evento
      console.log('5️⃣ Aguardando processamento do evento...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 6. Verificar movimentos DEPOIS de finalizar
      console.log('6️⃣ Movimentos DEPOIS de finalizar:');
      const sessaoDepois = await axios.get(`${BASE_URL}/caixa/sessoes/${sessao.id}`);
      console.log(`   💰 Saldo: R$ ${sessaoDepois.data.saldoAtual}`);
      console.log(`   📋 Movimentos: ${sessaoDepois.data.movimentos?.length || 0}`);
      
      if (sessaoDepois.data.movimentos?.length > 0) {
        console.log('\n   📋 Movimentos encontrados:');
        sessaoDepois.data.movimentos.forEach((mov, i) => {
          console.log(`   ${i + 1}. ${mov.tipo} - R$ ${mov.valor} (${mov.origem || 'N/A'}) - ${mov.descricao || 'Sem descrição'}`);
        });
      }

      // 7. Resultado
      console.log('\n🎯 RESULTADO:');
      const movimentosAntes = sessaoAntes.data.movimentos?.length || 0;
      const movimentosDepois = sessaoDepois.data.movimentos?.length || 0;
      
      if (movimentosDepois > movimentosAntes) {
        console.log('✅ SUCESSO! Novo movimento detectado');
        
        const novoMovimento = sessaoDepois.data.movimentos[sessaoDepois.data.movimentos.length - 1];
        console.log(`   📈 Último movimento: ${novoMovimento.tipo} - R$ ${novoMovimento.valor}`);
        
        if (novoMovimento.origem === 'VENDA') {
          console.log('🎉 PERFEITO! Evento VENDA_FINALIZADA processado corretamente');
        } else {
          console.log('⚠️ Movimento criado, mas origem não é VENDA');
        }
      } else {
        console.log('❌ FALHA! Nenhum novo movimento detectado');
        console.log('   O evento VENDA_FINALIZADA não foi processado pelo caixa');
      }

    } catch (error) {
      console.log('   ❌ Erro ao processar vendas:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.response?.data || error.message);
  }
}

testarEventoSimples();