import { useEffect, useState } from 'react';
import { Heading, Table, Thead, Tr, Th, Tbody, Td, HStack, Button, TableContainer, useDisclosure } from '@chakra-ui/react';
import { api } from '../../lib/api';
import { CreateBarbeiroModal, NewBarbeiro } from '../../components/modals/CreateBarbeiroModal';

export default function BarbeirosPage() {
  const [lista, setLista] = useState<any[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  useEffect(() => {
    api.get('/barbeiros?barbeariaId=tenant-1').then((r) => setLista(r.data ?? []));
  }, []);
  return (
    <>
      <Heading size="md" mb={4}>Barbeiros & Comissões</Heading>
      <HStack mb={4}><Button colorScheme="brand" onClick={onOpen}>Novo Barbeiro</Button><Button colorScheme="brand" variant="outline">Definir Comissão</Button></HStack>
      <TableContainer overflowX="auto">
        <Table size="sm" minW="720px">
          <Thead><Tr><Th>Nome</Th><Th>Email</Th><Th>Comissão (%)</Th></Tr></Thead>
          <Tbody>
            {lista.map((x, i) => (
              <Tr key={i}><Td>{x.nome}</Td><Td>{x.email}</Td><Td>{x.comissao ?? 0}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <CreateBarbeiroModal
        isOpen={isOpen}
        onClose={onClose}
        onCreate={async (b: NewBarbeiro) => {
          try {
            const payload = { ...b, barbeariaId: 'tenant-1' };
            const res = await api.post('/barbeiros', payload);
            const created = res.data ?? payload;
            setLista((prev) => [...prev, { nome: created.nome, email: created.email, comissao: created.comissao ?? 0 }]);
          } catch (e) {
            setLista((prev) => [...prev, { nome: b.nome, email: b.email, comissao: b.comissao ?? 0 }]);
          }
        }}
      />
    </>
  );
}

// @ts-expect-error augment next page
BarbeirosPage.requiresAuth = true;