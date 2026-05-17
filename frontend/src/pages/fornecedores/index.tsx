import { useEffect, useMemo, useState } from 'react';
import { Heading, VStack, HStack, Table, Thead, Tr, Th, Tbody, Td, Button, FormControl, FormLabel, Input, Select, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Text } from '@chakra-ui/react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

type Fornecedor = { id: string; nome: string; whatsapp?: string | null; email?: string | null };
type Produto = { id: string; nome: string; preco?: number | null };

export default function FornecedoresPage() {
  const { barbeariaId } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const criarModal = useDisclosure();
  const compraModal = useDisclosure();
  const [novoNome, setNovoNome] = useState('');
  const [novoWhatsapp, setNovoWhatsapp] = useState('');
  const [novoEmail, setNovoEmail] = useState('');

  const [fornecedorSel, setFornecedorSel] = useState<string>('');
  const [itensCompra, setItensCompra] = useState<{ produtoId?: string; quantidade: number }[]>([{ quantidade: 1 }]);

  const carregar = async () => {
    if (!barbeariaId) return;
    const [fRes, pRes] = await Promise.all([
      api.get(`/fornecedores?barbeariaId=${barbeariaId}`),
      api.get(`/produtos?barbeariaId=${barbeariaId}`),
    ]);
    setFornecedores(fRes.data ?? []);
    setProdutos(pRes.data ?? []);
  };

  useEffect(() => { carregar(); }, [barbeariaId]);

  const criarFornecedor = async () => {
    await api.post('/fornecedores', { barbeariaId, nome: novoNome, whatsapp: novoWhatsapp || undefined, email: novoEmail || undefined });
    criarModal.onClose();
    setNovoNome(''); setNovoWhatsapp(''); setNovoEmail('');
    carregar();
  };

  const adicionarItem = () => setItensCompra((prev) => [...prev, { quantidade: 1 }]);
  const selecionarProduto = (idx: number, produtoId: string) => setItensCompra((prev) => prev.map((it, i) => i === idx ? { ...it, produtoId } : it));
  const atualizarQtd = (idx: number, quantidade: number) => setItensCompra((prev) => prev.map((it, i) => i === idx ? { ...it, quantidade } : it));

  const montarMensagem = (): string => {
    const fornecedor = fornecedores.find((f) => f.id === fornecedorSel);
    const linhas = itensCompra.filter(i => i.produtoId && i.quantidade > 0).map((it) => {
      const prod = produtos.find((p) => p.id === it.produtoId);
      return `• ${prod?.nome} x${it.quantidade}`;
    });
    const cabecalho = `Olá, gostaria de solicitar compra:`;
    return [cabecalho, ...linhas].join('\n');
  };

  const finalizarCompra = () => {
    const fornecedor = fornecedores.find((f) => f.id === fornecedorSel);
    if (!fornecedor?.whatsapp) return;
    const msg = encodeURIComponent(montarMensagem());
    const numero = fornecedor.whatsapp.replace(/\D/g, '');
    const url = `https://wa.me/${numero}?text=${msg}`;
    window.open(url, '_blank');
    compraModal.onClose();
    setItensCompra([{ quantidade: 1 }]);
    setFornecedorSel('');
  };

  return (
    <>
      <Heading size="md" mb={4}>Fornecedores</Heading>
      <HStack mb={4}>
        <Button colorScheme="brand" onClick={criarModal.onOpen}>Novo Fornecedor</Button>
        <Button variant="outline" onClick={compraModal.onOpen} isDisabled={fornecedores.length === 0}>Comprar Produtos</Button>
      </HStack>

      <Table size="sm">
        <Thead><Tr><Th>Nome</Th><Th>WhatsApp</Th><Th>Email</Th></Tr></Thead>
        <Tbody>
          {fornecedores.map((f) => (
            <Tr key={f.id}><Td>{f.nome}</Td><Td>{f.whatsapp ?? '-'}</Td><Td>{f.email ?? '-'}</Td></Tr>
          ))}
        </Tbody>
      </Table>

      {/* Modal Criar */}
      <Modal isOpen={criarModal.isOpen} onClose={criarModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novo Fornecedor</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel>Nome</FormLabel>
                <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>WhatsApp (apenas números)</FormLabel>
                <Input value={novoWhatsapp} onChange={(e) => setNovoWhatsapp(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Email (opcional)</FormLabel>
                <Input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={criarModal.onClose}>Cancelar</Button>
            <Button colorScheme="brand" onClick={criarFornecedor} isDisabled={!novoNome || !barbeariaId}>Salvar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Compra */}
      <Modal isOpen={compraModal.isOpen} onClose={compraModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Comprar Produtos</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel>Fornecedor</FormLabel>
                <Select placeholder="Selecione" value={fornecedorSel} onChange={(e) => setFornecedorSel(e.target.value)}>
                  {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                </Select>
              </FormControl>
              {itensCompra.map((it, idx) => (
                <HStack key={idx}>
                  <FormControl minW="240px">
                    <FormLabel>Produto</FormLabel>
                    <Select placeholder="Selecione o produto" value={it.produtoId ?? ''} onChange={(e) => selecionarProduto(idx, e.target.value)}>
                      {produtos.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Quantidade</FormLabel>
                    <Input type="number" value={it.quantidade} onChange={(e) => atualizarQtd(idx, Number(e.target.value))} />
                  </FormControl>
                </HStack>
              ))}
              <Button size="sm" variant="outline" onClick={adicionarItem}>Adicionar Item</Button>
              <Text fontSize="sm" color="gray.600">Ao finalizar, abriremos o WhatsApp com um resumo da compra.</Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={compraModal.onClose}>Cancelar</Button>
            <Button colorScheme="brand" onClick={finalizarCompra} isDisabled={!fornecedorSel}>Finalizar Compra</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

FornecedoresPage.requiresAuth = true;