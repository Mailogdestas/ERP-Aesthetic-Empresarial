const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAbrirCaixa() {
  try {
    console.log('🧪 Testando abertura de caixa...');

    // Primeiro, vamos buscar uma barbearia existente
    const barbeariasResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        'Authorization': 'Bearer fake-token-for-test'
      }
    }).catch(() => {
      console.log('⚠️ Endpoint /auth/me não disponível, usando ID fixo');
      return null;
    });

    // Usar um ID de barbearia fixo para teste
    const barbeariaId = 'cm3bqvqzh0000uxqzqzqzqzqz'; // ID de exemplo

    const abrirCaixaDto = {
      barbeariaId: barbeariaId,
      valorAbertura: 100.00,
      observacoes: 'Teste de abertura de caixa'
    };

    console.log('📤 Enviando requisição para abrir caixa:', JSON.stringify(abrirCaixaDto, null, 2));

    const response = await axios.post(`${BASE_URL}/caixa/abrir`, abrirCaixaDto, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-test'
      }
    });

    console.log('✅ Caixa aberto com sucesso:', response.data);

  } catch (error) {
    console.error('❌ Erro ao abrir caixa:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Erro:', error.message);
    }
  }
}

testAbrirCaixa();