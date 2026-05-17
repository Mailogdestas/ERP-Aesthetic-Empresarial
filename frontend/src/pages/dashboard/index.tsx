import { useEffect, useState } from 'react';
import { Grid, GridItem, Heading } from '@chakra-ui/react';
import { api } from '../../lib/api';
import { StatCard } from '../../components/kpi/StatCard';
import { RevenueChart } from '../../components/charts/RevenueChart';
import { DonutChartCard } from '../../components/charts/DonutChart';
import { BarChartCard } from '../../components/charts/BarChartCard';
import { Card } from '../../components/ui/Card';

export default function Dashboard() {
  const [kpi, setKpi] = useState<any>({});
  const [chartData, setChartData] = useState<Array<{ date: string; revenue: number }>>([]);
  const [servicosPorDia, setServicosPorDia] = useState<Array<{ dia: string; qtd: number }>>([]);
  const [clientesPorBairro, setClientesPorBairro] = useState<Array<{ bairro: string; clientes: number }>>([]);

  useEffect(() => {
    const inicio = new Date(); inicio.setDate(inicio.getDate() - 7);
    const fim = new Date();
    const params = new URLSearchParams({ barbeariaId: 'tenant-1', inicio: inicio.toISOString(), fim: fim.toISOString() });
    api.get(`/kpi/resumo?${params.toString()}`).then((res) => setKpi(res.data));
    setChartData([
      { date: 'Dia 1', revenue: 100 },
      { date: 'Dia 2', revenue: 200 },
      { date: 'Dia 3', revenue: 150 },
    ]);
    setServicosPorDia([
      { dia: 'Seg', qtd: 12 },
      { dia: 'Ter', qtd: 18 },
      { dia: 'Qua', qtd: 22 },
      { dia: 'Qui', qtd: 15 },
      { dia: 'Sex', qtd: 26 },
      { dia: 'Sáb', qtd: 30 },
    ]);
    setClientesPorBairro([
      { bairro: 'Centro', clientes: 42 },
      { bairro: 'Jardins', clientes: 31 },
      { bairro: 'Vila Nova', clientes: 27 },
      { bairro: 'Industrial', clientes: 18 },
      { bairro: 'Leste', clientes: 15 },
    ]);
  }, []);

  return (
    <> 
      <Heading size="md" mb={4}>Dashboard</Heading>
      {/* Linha 1: KPIs */}
      <Grid templateColumns={{ base: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4} mb={4}>
        <GridItem><StatCard title="Cortes hoje" value={38} delta={4.2} actionHref="#" /></GridItem>
        <GridItem><StatCard title="Agendamentos" value={56} delta={1.8} actionHref="#" /></GridItem>
        <GridItem><StatCard title="Ticket médio" value={'R$ 62,40'} delta={-0.7} actionHref="#" /></GridItem>
        <GridItem><StatCard title="Produtos vendidos" value={29} delta={3.1} actionHref="#" /></GridItem>
      </Grid>

      {/* Linha 2: Mapa/Status e Lista */}
      <Grid templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' }} gap={4} mb={4}>
        <GridItem colSpan={{ base: 1, md: 2 }}>
          <BarChartCard title="Clientes por bairro" data={clientesPorBairro} xKey="bairro" yKey="clientes" orientation="horizontal" color="#3182CE" />
        </GridItem>
        <GridItem>
          <DonutChartCard title="Status dos agendamentos" data={[
            { name: 'Aguardando', value: 25 },
            { name: 'Em atendimento', value: 35 },
            { name: 'Concluído', value: 30 },
            { name: 'Cancelado', value: 10 },
          ]} />
        </GridItem>
      </Grid>

      {/* Linha 3: Gráficos */}
      <Grid templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }} gap={4}>
        <GridItem>
          <BarChartCard title="Serviços por dia da semana" data={servicosPorDia} xKey="dia" yKey="qtd" color="#5D0C95" />
        </GridItem>
        <GridItem>
          <Card>
            <Heading size="sm" mb={2}>Receita total</Heading>
            <RevenueChart data={chartData} />
          </Card>
        </GridItem>
      </Grid>
    </>
  );
}

// @ts-expect-error augment next page
Dashboard.requiresAuth = true;