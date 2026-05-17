import { useEffect, useMemo, useState } from 'react';
import {
  Heading,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Button,
  HStack,
  TableContainer,
  VStack,
  Input,
  FormControl,
  FormLabel,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Select,
} from '@chakra-ui/react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

type Venda = {
  id: string;
  createdAt: string;
  cliente?: { nome: string } | null;
  valorTotal: number;
};
type Barbeiro = { id: string; nome: string };
type Produto = { id: string; nome: string; preco?: number | null; estoque?: { quantidade: number } | null };

export default function VendasPage() {
  const { barbeariaId } = useAuth();
  const [lista, setLista] = useState<Venda[]>([]);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const novaVendaModal = useDisclosure();
  const pagamentoModal = useDisclosure();
  const [novaItens, setNovaItens] = useState<{ produtoId?: string; quantidade: number; precoUnit: number }[]>([{ quantidade: 1, precoUnit: 0 }]);
  const [clienteId, setClienteId] = useState<string>('');
  const [barbeiroId, setBarbeiroId] = useState<string>('');
  const [vendaSelecionada, setVendaSelecionada] = useState<string>('');
  const [valorPagamento, setValorPagamento] = useState<string>('0');
  const [metodoPagamento, setMetodoPagamento] = useState<string>('dinheiro');

  const carregar = async () => {
    const r = await api.get(`/vendas?barbeariaId=${barbeariaId}`);
    setLista(r.data ?? []);
  };

  const carregarAuxiliares = async () => {
    if (!barbeariaId) return;
    const [b, p] = await Promise.all([
      api.get(`/barbeiros?barbeariaId=${barbeariaId}`),
      api.get(`/produtos?barbeariaId=${barbeariaId}`),
    ]);
    setBarbeiros(b.data ?? []);
    setProdutos(p.data ?? []);
  };

  useEffect(() => {
    if (barbeariaId) {
      carregar();
      carregarAuxiliares();
    }
  }, [barbeariaId]);

  const adicionarItem = () => setNovaItens((prev) => [...prev, { quantidade: 1, precoUnit: 0 }]);
  const atualizarItem = (idx: number, campo: 'quantidade' | 'precoUnit', valor: number) => {
    setNovaItens((prev) => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  };
  const selecionarProduto = (idx: number, produtoId: string) => {
    const prod = produtos.find((p) => p.id === produtoId);
    setNovaItens((prev) => prev.map((it, i) => i === idx ? { ...it, produtoId, precoUnit: prod?.preco ?? it.precoUnit } : it));
  };

  const criarVenda = async () => {
    const payload = {
      barbeariaId,
      clienteId: clienteId || null,
      barbeiroId: barbeiroId || null,
      itens: novaItens.map((i) => ({ quantidade: i.quantidade, precoUnit: i.precoUnit, produtoId: i.produtoId })),
    };
    await api.post('/vendas', payload);
    novaVendaModal.onClose();
    setNovaItens([{ quantidade: 1, precoUnit: 0 }]);
    setClienteId('');
    setBarbeiroId('');
    carregar();
  };

  const abrirPagamento = (vendaId: string) => {
    setVendaSelecionada(vendaId);
    setValorPagamento('0');
    setMetodoPagamento('dinheiro');
    pagamentoModal.onOpen();
  };

  const adicionarPagamento = async () => {
    await api.post(`/vendas/${vendaSelecionada}/pagamentos`, { valor: Number(valorPagamento), metodo: metodoPagamento });
    pagamentoModal.onClose();
    carregar();
  };

  return (
    <>
      <Heading size="md" mb={4}>Vendas</Heading>
      <VStack align="stretch" spacing={3} mb={4}>
        <HStack>
          <Button colorScheme="brand" onClick={novaVendaModal.onOpen}>Nova Venda</Button>
        </HStack>
      </VStack>

      <TableContainer overflowX="auto">
        <Table size="sm" minW="820px">
          <Thead><Tr><Th>Data</Th><Th>Cliente</Th><Th>Total</Th><Th>Ações</Th></Tr></Thead>
          <Tbody>
            {lista.map((x) => (
              <Tr key={x.id}>
                <Td>{new Date(x.createdAt).toLocaleString()}</Td>
                <Td>{x.cliente?.nome ?? '-'}</Td>
                <Td>R$ {x.valorTotal?.toFixed(2) ?? '0.00'}</Td>
                <Td><Button size="xs" variant="outline" onClick={() => abrirPagamento(x.id)}>Adicionar Pagamento</Button></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Modal Nova Venda */}
      <Modal isOpen={novaVendaModal.isOpen} onClose={novaVendaModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nova Venda</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel>Cliente (ID opcional)</FormLabel>
                <Input value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Barbeiro</FormLabel>
                <Select placeholder="Selecione o barbeiro" value={barbeiroId} onChange={(e) => setBarbeiroId(e.target.value)}>
                  {barbeiros.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </Select>
              </FormControl>
              {novaItens.map((it, idx) => (
                <HStack key={idx}>
                  <FormControl minW="220px">
                    <FormLabel>Produto</FormLabel>
                    <Select placeholder="Selecione o produto" value={it.produtoId ?? ''} onChange={(e) => selecionarProduto(idx, e.target.value)}>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome} {typeof p.preco === 'number' ? `(R$ ${p.preco?.toFixed(2)})` : ''} {p.estoque?.quantidade ? `• estoque: ${p.estoque.quantidade}` : ''}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Qtd</FormLabel>
                    <Input type="number" value={it.quantidade} onChange={(e) => atualizarItem(idx, 'quantidade', Number(e.target.value))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Preço Unit</FormLabel>
                    <Input type="number" value={it.precoUnit} onChange={(e) => atualizarItem(idx, 'precoUnit', Number(e.target.value))} />
                  </FormControl>
                </HStack>
              ))}
              <Button size="sm" variant="outline" onClick={adicionarItem}>Adicionar Item</Button>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={novaVendaModal.onClose}>Cancelar</Button>
            <Button colorScheme="brand" onClick={criarVenda}>Criar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Pagamento */}
      <Modal isOpen={pagamentoModal.isOpen} onClose={pagamentoModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Adicionar Pagamento</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel>Valor</FormLabel>
                <Input type="number" value={valorPagamento} onChange={(e) => setValorPagamento(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Método</FormLabel>
                <Select value={metodoPagamento} onChange={(e) => setMetodoPagamento(e.target.value)}>
                  <option value="dinheiro">dinheiro</option>
                  <option value="cartao">cartão</option>
                  <option value="pix">pix</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={pagamentoModal.onClose}>Cancelar</Button>
            <Button colorScheme="brand" onClick={adicionarPagamento} isDisabled={!vendaSelecionada}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

VendasPage.requiresAuth = true;