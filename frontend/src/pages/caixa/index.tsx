import { useEffect, useMemo, useState } from 'react';
import {
  Heading,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Stat,
  StatLabel,
  StatNumber,
  Grid,
  GridItem,
  Button,
  HStack,
  VStack,
  Input,
  Select,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Text,
} from '@chakra-ui/react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

type Sessao = { id: string; status: string; abertoEm: string; fechadoEm?: string | null };
type Lancamento = { id: string; criadoEm: string; tipo: string; metodo?: string | null; origem?: string | null; valor: number; descricao?: string | null };

export default function CaixaPage() {
  const { barbeariaId, userId } = useAuth();
  const [saldo, setSaldo] = useState<number>(0);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string | null>(null);

  const abrirModalSessao = useDisclosure();
  const abrirModalLanc = useDisclosure();

  // Form states
  const [abertoPorUsuarioId, setAbertoPorUsuarioId] = useState<string>('');
  const [saldoInicial, setSaldoInicial] = useState<string>('0');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [origem, setOrigem] = useState<string>('VENDA');
  const [metodo, setMetodo] = useState<string>('dinheiro');
  const [valor, setValor] = useState<string>('0');
  const [descricao, setDescricao] = useState<string>('');

  const sessaoAbertaId = useMemo(() => {
    const s = sessoes.find((s) => s.status === 'ABERTA');
    return s?.id ?? null;
  }, [sessoes]);

  useEffect(() => {
    if (!barbeariaId) return;
    api.get(`/caixa/saldo-atual?barbeariaId=${barbeariaId}`).then((r) => setSaldo(r.data?.saldo ?? 0));
    api.get(`/caixa/sessoes?barbeariaId=${barbeariaId}`).then((r) => setSessoes(r.data ?? []));
  }, [barbeariaId]);

  useEffect(() => {
    if (userId) setAbertoPorUsuarioId(userId);
  }, [userId]);

  const carregarLancamentosDaSessao = async (sessaoId: string) => {
    // Não existe endpoint dedicado na API; em cenários reais, criar um GET de lançamentos por sessão.
    // Por ora, após registrar, só mostramos o último registro localmente.
    // Mantemos a lista como "apenas adicionada" para feedback.
    setSessaoSelecionada(sessaoId);
  };

  const onAbrirSessao = async () => {
    if (!barbeariaId || !abertoPorUsuarioId) return;
    await api.post('/caixa/sessoes', { barbeariaId, abertoPorUsuarioId, saldoInicial: Number(saldoInicial) });
    abrirModalSessao.onClose();
    api.get(`/caixa/sessoes?barbeariaId=${barbeariaId}`).then((r) => setSessoes(r.data ?? []));
  };

  const onFecharSessao = async (id: string) => {
    await api.patch(`/caixa/sessoes/${id}/fechar`);
    api.get(`/caixa/sessoes?barbeariaId=${barbeariaId}`).then((r) => setSessoes(r.data ?? []));
  };

  const onRegistrarLancamento = async () => {
    if (!sessaoAbertaId) return;
    const payload = {
      caixaSessaoId: sessaoAbertaId,
      barbeariaId,
      tipo,
      origem,
      metodo,
      valor: Number(valor),
      descricao: descricao || null,
    };
    const res = await api.post('/caixa/lancamentos', payload);
    setLancamentos((prev) => [{
      id: res.data?.id ?? Math.random().toString(36).slice(2),
      criadoEm: res.data?.criadoEm ?? new Date().toISOString(),
      tipo,
      origem,
      metodo,
      valor: Number(valor),
      descricao: descricao || null,
    }, ...prev]);
    abrirModalLanc.onClose();
    api.get(`/caixa/saldo-atual?barbeariaId=${barbeariaId}`).then((r) => setSaldo(r.data?.saldo ?? 0));
  };

  return (
    <>
      <Heading size="md" mb={4}>Caixa</Heading>

      <VStack align="stretch" spacing={4} mb={4}>

        <Grid templateColumns="repeat(3, 1fr)" gap={4}>
          <GridItem>
            <Stat><StatLabel>Saldo Atual</StatLabel><StatNumber>R$ {saldo.toFixed(2)}</StatNumber></Stat>
          </GridItem>
          <GridItem>
            <Stat>
              <StatLabel>Sessão Aberta</StatLabel>
              <StatNumber>{sessaoAbertaId ? 'SIM' : 'NÃO'}</StatNumber>
            </Stat>
          </GridItem>
          <GridItem>
            <HStack>
              <Button colorScheme="brand" onClick={abrirModalSessao.onOpen} isDisabled={!!sessaoAbertaId}>Abrir Sessão</Button>
              <Button colorScheme="red" onClick={() => sessaoAbertaId && onFecharSessao(sessaoAbertaId)} isDisabled={!sessaoAbertaId}>Fechar Sessão</Button>
            </HStack>
          </GridItem>
        </Grid>
      </VStack>

      <HStack mb={4}>
        <Button colorScheme="brand" onClick={abrirModalLanc.onOpen} isDisabled={!sessaoAbertaId}>Registrar Lançamento</Button>
      </HStack>

      <Heading size="sm" mb={2}>Sessões Recentes</Heading>
      <Table size="sm" mb={6}>
        <Thead><Tr><Th>Aberto Em</Th><Th>Status</Th><Th>Fechado Em</Th><Th>Ações</Th></Tr></Thead>
        <Tbody>
          {sessoes.map((s) => (
            <Tr key={s.id}>
              <Td>{new Date(s.abertoEm).toLocaleString()}</Td>
              <Td>{s.status}</Td>
              <Td>{s.fechadoEm ? new Date(s.fechadoEm).toLocaleString() : '-'}</Td>
              <Td>
                <Button size="xs" variant="outline" onClick={() => carregarLancamentosDaSessao(s.id)}>Selecionar</Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Heading size="sm" mb={2}>Lançamentos (últimos locais)</Heading>
      {lancamentos.length === 0 && <Text fontSize="sm" color="gray.500">Sem lançamentos locais nesta sessão. Registre um para visualizar aqui.</Text>}
      <Table size="sm">
        <Thead><Tr><Th>Data</Th><Th>Tipo</Th><Th>Origem</Th><Th>Método</Th><Th>Valor</Th><Th>Descrição</Th></Tr></Thead>
        <Tbody>
          {lancamentos.map((l) => (
            <Tr key={l.id}>
              <Td>{new Date(l.criadoEm).toLocaleString()}</Td>
              <Td>{l.tipo}</Td>
              <Td>{l.origem ?? '-'}</Td>
              <Td>{l.metodo ?? '-'}</Td>
              <Td>R$ {l.valor.toFixed(2)}</Td>
              <Td>{l.descricao ?? '-'}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Modal Abrir Sessão */}
      <Modal isOpen={abrirModalSessao.isOpen} onClose={abrirModalSessao.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Abrir Sessão de Caixa</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel>Usuário (ID)</FormLabel>
                <Input value={abertoPorUsuarioId} onChange={(e) => setAbertoPorUsuarioId(e.target.value)} placeholder="abertoPorUsuarioId" />
              </FormControl>
              <FormControl>
                <FormLabel>Saldo Inicial</FormLabel>
                <Input type="number" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={abrirModalSessao.onClose}>Cancelar</Button>
            <Button colorScheme="brand" onClick={onAbrirSessao} isDisabled={!abertoPorUsuarioId}>Abrir</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Registrar Lançamento */}
      <Modal isOpen={abrirModalLanc.isOpen} onClose={abrirModalLanc.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Registrar Lançamento</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel>Tipo</FormLabel>
                <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'ENTRADA' | 'SAIDA')}>
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="SAIDA">SAIDA</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Origem</FormLabel>
                <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="VENDA, AJUSTE, etc." />
              </FormControl>
              <FormControl>
                <FormLabel>Método</FormLabel>
                <Select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="dinheiro">dinheiro</option>
                  <option value="cartao">cartão</option>
                  <option value="pix">pix</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Valor</FormLabel>
                <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Descrição</FormLabel>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={abrirModalLanc.onClose}>Cancelar</Button>
            <Button colorScheme="brand" onClick={onRegistrarLancamento} isDisabled={!sessaoAbertaId}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// @ts-expect-error augment next page
CaixaPage.requiresAuth = true;