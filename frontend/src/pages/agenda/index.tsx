import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import {
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Select,
  Button,
  Badge,
  Box,
  VStack,
  List,
  ListItem,
  SimpleGrid,
  useToast,
  IconButton,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';
import { AddIcon, PhoneIcon, ChatIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { CreateAgendaModal, NewAgendamento } from '../../components/modals/CreateAgendaModal';

type Agendamento = {
  id: string;
  clienteId: string;
  barbeiroId: string;
  servicoId?: string;
  sala?: string;
  status: 'aguardando' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | string;
  inicio: string;
  fim?: string;
};

const statusColor: Record<string, string> = {
  aguardando: 'gray',
  confirmado: 'purple',
  em_atendimento: 'blue',
  concluido: 'green',
  cancelado: 'red',
};

export default function AgendaPage() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [ag, setAg] = useState<Agendamento[]>([]);
  const [barbeiro, setBarbeiro] = useState<string>('');
  const [servico, setServico] = useState<string>('');
  const [sala, setSala] = useState<string>('');

  // Carrega agenda do dia por padrão
  useEffect(() => {
    const inicio = new Date(); inicio.setHours(0,0,0,0);
    const fim = new Date(); fim.setHours(23,59,59,999);
    const params = new URLSearchParams({ barbeariaId: 'tenant-1', inicio: inicio.toISOString(), fim: fim.toISOString() });
    api.get(`/agendamentos?${params.toString()}`).then((r) => setAg(r.data ?? []));
  }, []);

  const barbeiros = useMemo(() => Array.from(new Set(ag.map((x) => x.barbeiroId))), [ag]);
  const servicos = useMemo(() => Array.from(new Set(ag.map((x) => x.servicoId).filter(Boolean))), [ag]);
  const salas = useMemo(() => Array.from(new Set(ag.map((x) => x.sala).filter(Boolean))), [ag]);

  const filtrados = useMemo(() =>
    ag.filter((x) =>
      (!barbeiro || x.barbeiroId === barbeiro) &&
      (!servico || x.servicoId === servico) &&
      (!sala || x.sala === sala)
    ), [ag, barbeiro, servico, sala]
  );

  const ordenarPorHora = (lista: Agendamento[]) =>
    [...lista].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  const enviarWhatsapp = (item: Agendamento) => {
    toast({ title: 'Confirmação enviada via WhatsApp', description: `Agendamento ${item.id}`, status: 'success', duration: 2500 });
  };
  const enviarSms = (item: Agendamento) => {
    toast({ title: 'Confirmação enviada via SMS', description: `Agendamento ${item.id}`, status: 'success', duration: 2500 });
  };

  const criarAgendamento = async (novo: NewAgendamento) => {
    try {
      const payload = { ...novo, barbeariaId: 'tenant-1' };
      const res = await api.post('/agendamentos', payload);
      const created: Agendamento = res.data ?? (payload as Agendamento);
      setAg((prev) => [...prev, created]);
      toast({ title: 'Agendamento criado', status: 'success', duration: 2500 });
    } catch (e: any) {
      // Fallback local para demo
      setAg((prev) => [...prev, novo as Agendamento]);
      toast({ title: 'Falha ao salvar no servidor', description: 'Adicionado localmente', status: 'warning', duration: 3000 });
    }
  };

  // Helpers de apresentação
  const StatusBadge = ({ s }: { s: string }) => (
    <Badge colorScheme={statusColor[s] ?? 'gray'} textTransform="capitalize">{s.replace('_', ' ')}</Badge>
  );

  const ItemAgenda = ({ item }: { item: Agendamento }) => (
    <HStack justify="space-between" p={2} borderWidth="1px" borderRadius="md">
      <Box>
        <HStack>
          <StatusBadge s={item.status} />
          <Box fontWeight="semibold">{new Date(item.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Box>
        </HStack>
        <Box fontSize="sm" color="gray.600">Cliente {item.clienteId} • Barbeiro {item.barbeiroId}</Box>
      </Box>
      <HStack>
        <Tooltip label="Enviar confirmação via WhatsApp">
          <IconButton aria-label="WhatsApp" icon={<ChatIcon />} size="sm" colorScheme="purple" onClick={() => enviarWhatsapp(item)} />
        </Tooltip>
        <Tooltip label="Enviar confirmação via SMS">
          <IconButton aria-label="SMS" icon={<PhoneIcon />} size="sm" onClick={() => enviarSms(item)} />
        </Tooltip>
      </HStack>
    </HStack>
  );

  // Visão semanal: agrupa por dia (dom->sab)
  const startOfWeek = (d: Date) => {
    const s = new Date(d); const day = s.getDay(); // 0=Dom
    s.setDate(s.getDate() - day);
    s.setHours(0,0,0,0);
    return s;
  };
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weeklyColumns = useMemo(() => {
    const now = new Date();
    const s = startOfWeek(now);
    return weekDays.map((_, i) => {
      const day = new Date(s); day.setDate(s.getDate() + i);
      const sameDay = filtrados.filter((x) => new Date(x.inicio).toDateString() === day.toDateString());
      return { day, list: ordenarPorHora(sameDay) };
    });
  }, [filtrados]);

  // Visão mensal: contagem simples por dia do mês atual
  const monthGrid = useMemo(() => {
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
    const first = new Date(y, m, 1); const last = new Date(y, m + 1, 0);
    const days = Array.from({ length: last.getDate() }, (_, i) => new Date(y, m, i + 1));
    return days.map((d) => ({
      date: d,
      count: filtrados.filter((x) => new Date(x.inicio).toDateString() === d.toDateString()).length,
    }));
  }, [filtrados]);

  return (
    <>
      <Heading size="md" mb={4}>Agenda</Heading>

      {/* Filtros */}
      <HStack spacing={3} mb={4}>
        <Select placeholder="Filtrar por barbeiro" value={barbeiro} onChange={(e) => setBarbeiro(e.target.value)} maxW="240px" icon={<ChevronDownIcon />} sx={{ backgroundImage: 'none' }}>
          {barbeiros.map((b) => (<option key={b} value={b}>{b}</option>))}
        </Select>
        <Select placeholder="Filtrar por serviço" value={servico} onChange={(e) => setServico(e.target.value)} maxW="240px" icon={<ChevronDownIcon />} sx={{ backgroundImage: 'none' }}>
          {servicos.map((s) => (<option key={s} value={s as string}>{s as string}</option>))}
        </Select>
        <Select placeholder="Filtrar por sala" value={sala} onChange={(e) => setSala(e.target.value)} maxW="240px" icon={<ChevronDownIcon />} sx={{ backgroundImage: 'none' }}>
          {salas.map((s) => (<option key={s} value={s as string}>{s as string}</option>))}
        </Select>
        <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={onOpen}>Novo agendamento</Button>
      </HStack>

      {/* Abas: Dia / Semana / Mês */}
      <Tabs variant="enclosed" colorScheme="brand">
        <TabList>
          <Tab>Dia</Tab>
          <Tab>Semana</Tab>
          <Tab>Mês</Tab>
        </TabList>
        <TabPanels>
          {/* Dia */}
          <TabPanel>
            <VStack align="stretch" spacing={3}>
              {ordenarPorHora(filtrados).map((item) => (
                <ItemAgenda key={item.id} item={item} />
              ))}
              {filtrados.length === 0 && <Box color="gray.500">Nenhum agendamento para os filtros selecionados.</Box>}
            </VStack>
          </TabPanel>
          {/* Semana */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 7 }} spacing={3}>
              {weeklyColumns.map((col, idx) => (
                <Box key={idx} p={3} borderWidth="1px" borderRadius="md">
                  <Heading size="xs" mb={2}>{weekDays[idx]} • {col.day.toLocaleDateString()}</Heading>
                  <VStack align="stretch" spacing={2}>
                    {col.list.map((item) => (<ItemAgenda key={item.id} item={item} />))}
                    {col.list.length === 0 && <Box color="gray.500">Sem registros</Box>}
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </TabPanel>
          {/* Mês */}
          <TabPanel>
            <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 7 }} spacing={3}>
              {monthGrid.map((d, i) => (
                <Box key={i} p={3} borderWidth="1px" borderRadius="md">
                  <Heading size="xs" mb={1}>{d.date.toLocaleDateString()}</Heading>
                  <Box fontSize="sm" color="gray.600">Agendamentos: {d.count}</Box>
                </Box>
              ))}
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <CreateAgendaModal
        isOpen={isOpen}
        onClose={onClose}
        barbeiros={barbeiros}
        servicos={servicos}
        salas={salas}
        onCreate={criarAgendamento}
      />
    </>
  );
}

// @ts-expect-error augment next page
AgendaPage.requiresAuth = true;