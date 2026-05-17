const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testarEventoCaixa() {
  try {
    console.log('🧪 TESTE: Evento VENDA_FINALIZADA → Caixa');
    console.log('==========================================\n');

    // 1. Buscar dados necessários
    console.log('1️⃣ Buscando dados...');
    
    const barbearias = await axios.get(`${BASE_URL}/barbearias`);
    const barbeariaId = barbearias.data[0]?.id;
    console.log(`   Barbearia: ${barbeariaId}`);

    const clientes = await axios.get(`${BASE_URL}/clientes`);
    const clienteId = clientes.data[0]?.id;
    console.log(`   Cliente: ${clienteId}`);

    const servicos = await axios.get(`${BASE_URL}/servicos`);
    const servicoId = servicos.data[0]?.id;
    const servicoValor = servicos.data[0]?.preco;
    console.log(`   Serviço: ${servicoId} (R$ ${servicoValor})`);

    const barbeiros = await axios.get(`${BASE_URL}/barbeiros`);
    const barbeiroId = barbeiros.data[0]?.id;
    console.log(`   Barbeiro: ${barbeiroId}\n`);

    // 2. Verificar sessão de caixa
    console.log('2️⃣ Verificando sessão de caixa...');
    let sessao;
    try {
      const sessoes = await axios.get(`${BASE_URL}/caixa/sessoes`);
      sessao = sessoes.data.find(s => s.status === 'ABERTA');
      
      if (!sessao) {
        console.log('   Abrindo nova sessão...');
        const novaSessao = await axios.post(`${BASE_URL}/caixa/sessoes`, {
          barbeariaId,
          valorInicial: 0
        });
        sessao = novaSessao.data;
      }
    } catch (error) {
      console.log('   Abrindo nova sessão...');
      const novaSessao = await axios.post(`${BASE_URL}/caixa/sessoes`, {
        barbeariaId,
        valorInicial: 0
      });
      sessao = novaSessao.data;
    }
    
    console.log(`   Sessão ativa: ${sessao.id}`);
    console.log(`   Saldo inicial: R$ ${sessao.saldoAtual}\n`);

    // 3. Criar venda
    console.log('3️⃣ Criando venda...');
    const venda = await axios.post(`${BASE_URL}/vendas`, {
      barbeariaId,
      clienteId,
      barbeiroId
    });
    const vendaId = venda.data.id;
    console.log(`   Venda criada: ${vendaId}\n`);

    // 4. Adicionar serviço
    console.log('4️⃣ Adicionando serviço...');
    await axios.post(`${BASE_URL}/vendas/${vendaId}/itens`, {
      servicoId,
      quantidade: 1,
      precoUnitario: servicoValor
    });
    console.log(`   Serviço adicionado: ${servicoId}\n`);

    // 5. Verificar movimentos ANTES de finalizar
    console.log('5️⃣ Movimentos ANTES de finalizar:');
    const sessaoAntes = await axios.get(`${BASE_URL}/caixa/sessoes/${sessao.id}`);
    console.log(`   Saldo: R$ ${sessaoAntes.data.saldoAtual}`);
    console.log(`   Movimentos: ${sessaoAntes.data.movimentos?.length || 0}\n`);

    // 6. FINALIZAR VENDA (aqui que o evento deve ser emitido)
    console.log('6️⃣ 🔥 FINALIZANDO VENDA (evento VENDA_FINALIZADA)...');
    await axios.patch(`${BASE_URL}/vendas/${vendaId}/finalizar`);
    console.log('   ✅ Venda finalizada!\n');

    // 7. Aguardar processamento do evento
    console.log('7️⃣ Aguardando processamento do evento...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 8. Verificar movimentos DEPOIS de finalizar
    console.log('8️⃣ Movimentos DEPOIS de finalizar:');
    const sessaoDepois = await axios.get(`${BASE_URL}/caixa/sessoes/${sessao.id}`);
    console.log(`   Saldo: R$ ${sessaoDepois.data.saldoAtual}`);
    console.log(`   Movimentos: ${sessaoDepois.data.movimentos?.length || 0}`);
    
    if (sessaoDepois.data.movimentos?.length > 0) {
      console.log('\n   📋 Movimentos encontrados:');
      sessaoDepois.data.movimentos.forEach((mov, i) => {
        console.log(`   ${i + 1}. ${mov.tipo} - R$ ${mov.valor} (${mov.origem || 'N/A'})`);
      });
    }

    // 9. Resultado
    console.log('\n🎯 RESULTADO:');
    const movimentoVenda = sessaoDepois.data.movimentos?.find(m => 
      m.tipo === 'ENTRADA' && m.origem === 'VENDA'
    );
    
    if (movimentoVenda) {
      console.log('✅ SUCESSO! Evento processado corretamente');
      console.log(`   Movimento de entrada registrado: R$ ${movimentoVenda.valor}`);
    } else {
      console.log('❌ FALHA! Evento não foi processado');
      console.log('   Nenhum movimento de venda encontrado no caixa');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testarEventoCaixa();