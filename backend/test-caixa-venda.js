const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testarCaixaVenda() {
  try {
    console.log('🧪 TESTANDO INTEGRAÇÃO CAIXA ↔ VENDA...\n');

    // 1. Buscar dados necessários
    console.log('📋 1. Buscando dados necessários...');
    
    const barbearias = await axios.get(`${BASE_URL}/barbearias`);
    const barbearia = barbearias.data[0];
    console.log(`✅ Barbearia: ${barbearia.nome}`);

    const clientes = await axios.get(`${BASE_URL}/clientes?barbeariaId=${barbearia.id}`);
    const cliente = clientes.data[0];
    console.log(`✅ Cliente: ${cliente.nome}`);

    const servicos = await axios.get(`${BASE_URL}/servicos?barbeariaId=${barbearia.id}`);
    const servico = servicos.data[0];
    console.log(`✅ Serviço: ${servico.nome} - R$ ${servico.preco}`);

    const barbeiros = await axios.get(`${BASE_URL}/barbeiros?barbeariaId=${barbearia.id}`);
    const barbeiro = barbeiros.data[0];
    console.log(`✅ Barbeiro: ${barbeiro.nome}`);

    // 2. Verificar sessão de caixa
    console.log('\n💰 2. Verificando sessão de caixa...');
    let caixaSessoes = await axios.get(`${BASE_URL}/caixa/sessoes?barbeariaId=${barbearia.id}`);
    let sessaoAtiva = caixaSessoes.data.find(s => !s.closedAt);
    
    if (!sessaoAtiva) {
      console.log('📦 Abrindo nova sessão de caixa...');
      const novaSessao = await axios.post(`${BASE_URL}/caixa/abrir`, {
        barbeariaId: barbearia.id,
        valorAbertura: 100
      });
      sessaoAtiva = novaSessao.data;
    }
    console.log(`✅ Sessão ativa: ${sessaoAtiva.id}`);

    // 3. Criar venda
    console.log('\n🛒 3. Criando venda...');
    const novaVenda = await axios.post(`${BASE_URL}/vendas`, {
      barbeariaId: barbearia.id,
      clienteId: cliente.id,
      barbeiroId: barbeiro.id
    });
    const venda = novaVenda.data;
    console.log(`✅ Venda criada: ${venda.id}`);

    // 4. Adicionar item à venda
    console.log('\n📦 4. Adicionando serviço à venda...');
    await axios.post(`${BASE_URL}/vendas/${venda.id}/itens`, {
      servicoId: servico.id,
      quantidade: 1
    });
    console.log(`✅ Serviço adicionado: ${servico.nome}`);

    // 5. Verificar movimentos ANTES da finalização
    console.log('\n🔍 5. Verificando movimentos ANTES da finalização...');
    caixaSessoes = await axios.get(`${BASE_URL}/caixa/sessoes?barbeariaId=${barbearia.id}`);
    sessaoAtiva = caixaSessoes.data.find(s => s.id === sessaoAtiva.id);
    console.log(`📊 Movimentos antes: ${sessaoAtiva.movimentos?.length || 0}`);

    // 6. Finalizar venda
    console.log('\n🏁 6. Finalizando venda...');
    const vendaFinalizada = await axios.patch(`${BASE_URL}/vendas/${venda.id}/finalizar`);
    console.log(`✅ Venda finalizada! Status: ${vendaFinalizada.data.status}`);
    console.log(`💰 Valor total: R$ ${vendaFinalizada.data.valorTotal}`);

    // 7. Aguardar processamento do evento (pequena pausa)
    console.log('\n⏳ 7. Aguardando processamento do evento...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 8. Verificar movimentos DEPOIS da finalização
    console.log('\n🔍 8. Verificando movimentos DEPOIS da finalização...');
    caixaSessoes = await axios.get(`${BASE_URL}/caixa/sessoes?barbeariaId=${barbearia.id}`);
    sessaoAtiva = caixaSessoes.data.find(s => s.id === sessaoAtiva.id);
    console.log(`📊 Movimentos depois: ${sessaoAtiva.movimentos?.length || 0}`);

    if (sessaoAtiva.movimentos && sessaoAtiva.movimentos.length > 0) {
      console.log('\n📋 Movimentos encontrados:');
      sessaoAtiva.movimentos.forEach((mov, index) => {
        console.log(`  ${index + 1}. ${mov.tipo} - R$ ${mov.valor} - ${mov.descricao} (${mov.origem})`);
      });

      // Verificar se existe movimento da venda
      const movimentoVenda = sessaoAtiva.movimentos.find(m => 
        m.referenciaId === venda.id && m.origem === 'VENDA'
      );

      if (movimentoVenda) {
        console.log('\n✅ SUCESSO! Movimento da venda encontrado no caixa!');
        console.log(`   💰 Valor: R$ ${movimentoVenda.valor}`);
        console.log(`   📝 Descrição: ${movimentoVenda.descricao}`);
      } else {
        console.log('\n❌ FALHA! Movimento da venda NÃO encontrado no caixa!');
      }
    } else {
      console.log('\n❌ FALHA! Nenhum movimento encontrado no caixa!');
    }

    console.log('\n🎯 Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Resposta da API:', error.response.data);
    }
  }
}

testarCaixaVenda();