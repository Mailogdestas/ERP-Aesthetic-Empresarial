import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Spinner,
  VStack,
  HStack,
  Divider,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { api } from '../../lib/api';
import { DonutChartCard } from '../../components/charts/DonutChart';
import { Card } from '../../components/ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip } from 'recharts';

type Agendamento = {
  id: string;
  barbeiroId: string;
  status: string;
  inicio?: string;
  fim?: string;
  valorTotal?: number;
};

type EstoqueItem = {
  id: string;
  nome: string;
  quantidade: number;
  minimoAlerta?: number;
};

function StatCard({ title, value, help }: { title: string; value: string | number; help?: string }) {
  return (
    <Card>
      <VStack align="start" spacing={2}>
        <HStack spacing={2}>
          <Heading size="sm">{title}</Heading>
          {help && (
            <Tooltip label={help} hasArrow placement="top">
              <IconButton aria-label={`info-${title}`} icon={<InfoOutlineIcon />} size="xs" variant="ghost" />
            </Tooltip>
          )}
        </HStack>
        <Text fontSize="2xl" fontWeight="bold" color="brand.700">{value}</Text>
      </VStack>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Heading size="md">{title}</Heading>
        <Badge colorScheme="purple">Insights</Badge>
      </HStack>
      {children}
    </Box>
  );
}

function InsightsContent() {
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        // Últimos 30 dias de agendamentos
        const now = new Date();
        const past = new Date();
        past.setDate(now.getDate() - 30);
        const params = new URLSearchParams({
          inicio: past.toISOString(),
          fim: now.toISOString(),
        });
        const [agRes, estRes] = await Promise.all([
          api.get(`/agendamentos?${params.toString()}`),
          api.get(`/estoque`),
        ]);
        if (!mounted) return;
        setAgendamentos(agRes.data || []);
        setEstoque(estRes.data || []);
      } catch (e) {
        // Mantém placeholders mesmo se falhar
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const cortesConcluidos = useMemo(
    () =>
      agendamentos.filter((a) => a.status?.toLowerCase() === 'concluido' && a.inicio && a.fim),
    [agendamentos]
  );

  const tempoMedioPorCorteMin = useMemo(() => {
    if (!cortesConcluidos.length) return 0;
    const totalMin = cortesConcluidos.reduce((acc, a) => {
      const start = new Date(a.inicio as string).getTime();
      const end = new Date(a.fim as string).getTime();
      const diffMin = Math.max(0, (end - start) / 60000);
      return acc + diffMin;
    }, 0);
    return Math.round(totalMin / cortesConcluidos.length);
  }, [cortesConcluidos]);

  const cortesHoje = useMemo(() => {
    const today = new Date().toDateString();
    return agendamentos.filter((a) => (a.inicio ? new Date(a.inicio).toDateString() === today : false)).length;
  }, [agendamentos]);

  const agendamentosTotal = agendamentos.length;

  const receitaTotal = useMemo(() => {
    return agendamentos.reduce((acc, a) => acc + (a.valorTotal || 0), 0);
  }, [agendamentos]);

  const ticketMedio = useMemo(() => {
    const pagos = agendamentos.filter((a) => typeof a.valorTotal === 'number' && a.valorTotal! > 0);
    if (!pagos.length) return 0;
    const total = pagos.reduce((acc, a) => acc + (a.valorTotal as number), 0);
    return Math.round((total / pagos.length) * 100) / 100;
  }, [agendamentos]);

  const estoqueBaixo = useMemo(() => {
    return estoque.filter((e) => e.minimoAlerta != null && e.quantidade <= (e.minimoAlerta as number));
  }, [estoque]);

  // Mock de valores para placeholders
  const taxaOcupacao = 78; // %
  const faturamentoPorBarbeiro = 'R$ 12.340';
  const clientesAtivosVsInativos = '124 / 32';
  const retorno306090 = '42% / 38% / 29%';
  const pontosGanhosResgatados = '894 / 560';
  const receitaVsDespesa = 'R$ 23.400 vs R$ 17.050';
  const lembretesEnviados = 143;
  const taxaConfirmacao = '72%';
  const cliquesPromocoes = 386;
  const produtoMaisVendido = 'Pomada X';
  const margemPorProduto = '45%';
  const servicoMaisLucrativo = 'Combo Corte + Barba';
  const previsaoReceita = 'R$ 12.400';

  const receitaPorServicoData = [
    { name: 'Corte', value: 5400 },
    { name: 'Barba', value: 2700 },
    { name: 'Combo', value: 3800 },
  ];

  const receitaPorCanalData = [
    { name: 'PIX', value: 6200 },
    { name: 'Cartão', value: 8400 },
    { name: 'Dinheiro', value: 1800 },
  ];

  const horariosMovimentadosData = [
    { faixa: '09h', qtd: 12 },
    { faixa: '10h', qtd: 18 },
    { faixa: '11h', qtd: 22 },
    { faixa: '12h', qtd: 15 },
    { faixa: '13h', qtd: 20 },
    { faixa: '14h', qtd: 26 },
    { faixa: '15h', qtd: 28 },
    { faixa: '16h', qtd: 24 },
  ];

  return (
    <VStack align="stretch" spacing={6} p={4}>
      <Heading size="lg">Insights</Heading>
      {loading && (
        <HStack>
          <Spinner />
          <Text>Carregando KPIs…</Text>
        </HStack>
      )}

      <Section title="KPIs Principais">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <StatCard title="Cortes hoje" value={cortesHoje} />
          <StatCard title="Agendamentos (30 dias)" value={agendamentosTotal} />
          <StatCard title="Ticket médio" value={`R$ ${ticketMedio}`} />
          <StatCard title="Receita total (30 dias)" value={`R$ ${receitaTotal}`} />
        </SimpleGrid>
      </Section>

      <Divider />

      <Section title="Performance de Barbeiros">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <StatCard
            title="Tempo médio por corte"
            value={`${tempoMedioPorCorteMin} min`}
            help="Calculado de início até finalizar corte"
          />
          <StatCard title="Taxa de ocupação" value={`${taxaOcupacao}%`} help="Horas ocupadas versus horas disponíveis na agenda" />
          <StatCard title="Faturamento por barbeiro" value={faturamentoPorBarbeiro} help="Total de receita atribuída a cada barbeiro" />
        </SimpleGrid>
      </Section>

      <Divider />

      <Section title="Fidelidade e Retenção">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <StatCard title="Clientes ativos vs inativos" value={clientesAtivosVsInativos} help="Ativos: último corte recente; Inativos: sem corte no período" />
          <StatCard title="Taxa de retorno 30/60/90 dias" value={retorno306090} help="Percentual de clientes que retornaram em 30, 60 e 90 dias" />
          <StatCard title="Pontos ganhos/resgatados" value={pontosGanhosResgatados} help="Programa de fidelidade: pontos acumulados e usados" />
        </SimpleGrid>
      </Section>

      <Divider />

      <Section title="Financeiro Detalhado">
        {/* Row 1: apenas gráficos */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
          <DonutChartCard title="Receita por serviço" data={receitaPorServicoData} />
          <DonutChartCard title="Receita por forma de pagamento" data={receitaPorCanalData} />
        </SimpleGrid>
        {/* Row 2: cards de métricas */}
        <SimpleGrid columns={{ base: 1 }} spacing={4}>
          <StatCard title="Receita vs despesa" value={receitaVsDespesa} help="Comparativo do período atual para fluxo de caixa" />
        </SimpleGrid>
      </Section>

      <Divider />

      <Section title="Marketing & Engajamento">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <StatCard title="Lembretes enviados" value={lembretesEnviados} help="Mensagens disparadas via WhatsApp/SMS para confirmar horários" />
          <StatCard title="Taxa de confirmação" value={taxaConfirmacao} help="Percentual de agendamentos confirmados após lembrete" />
          <StatCard title="Cliques em promoções" value={cliquesPromocoes} help="Interações em links/QR Code de campanhas" />
        </SimpleGrid>
      </Section>

      <Divider />

      <Section title="Estoque / Produtos">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <StatCard title="Produtos com estoque baixo" value={estoqueBaixo.length} />
          <StatCard title="Produtos mais vendidos" value={produtoMaisVendido} help="Produto com maior volume de vendas no período" />
          <StatCard title="Margem por produto" value={margemPorProduto} help="Margem bruta média do item" />
        </SimpleGrid>
      </Section>

      <Divider />

      <Section title="Insights Estratégicos">
        {/* Row 1: gráfico sozinho */}
        <SimpleGrid columns={{ base: 1 }} spacing={4} mb={4}>
          <Card>
            <Heading size="sm" mb={2}>Horários mais movimentados</Heading>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={horariosMovimentadosData}>
                <XAxis dataKey="faixa" />
                <YAxis />
                <RTooltip />
                <Bar dataKey="qtd" fill="#5D0C95" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </SimpleGrid>
        {/* Row 2: cards */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <StatCard title="Serviços mais lucrativos" value={servicoMaisLucrativo} help="Serviço/pacote com maior margem e receita" />
          <StatCard title="Previsão de receita" value={previsaoReceita} help="Estimativa baseada em agendamentos futuros" />
        </SimpleGrid>
      </Section>
    </VStack>
  );
}

function InsightsPage() {
  return <InsightsContent />;
}

export default InsightsPage;

InsightsPage.requiresAuth = true;