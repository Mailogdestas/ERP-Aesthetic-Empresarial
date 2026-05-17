import { useEffect, useState } from 'react';
import { Heading, Table, Thead, Tr, Th, Tbody, Td, Button, HStack, TableContainer } from '@chakra-ui/react';
import { api } from '../../lib/api';

export default function PacotesPage() {
  const [lista, setLista] = useState<any[]>([]);
  useEffect(() => {
    api.get('/pacotes?barbeariaId=tenant-1').then((r) => setLista(r.data ?? []));
  }, []);
  return (
    <>
      <Heading size="md" mb={4}>Pacotes</Heading>
      <HStack mb={4}><Button colorScheme="teal">Novo Pacote</Button></HStack>
      <TableContainer overflowX="auto">
        <Table size="sm" minW="680px">
          <Thead><Tr><Th>Nome</Th><Th>Preço</Th><Th>Ativo</Th></Tr></Thead>
          <Tbody>
            {lista.map((x, i) => (
              <Tr key={i}><Td>{x.nome}</Td><Td>R$ {x.preco}</Td><Td>{x.ativo ? 'Sim' : 'Não'}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}

// @ts-expect-error augment next page
PacotesPage.requiresAuth = true;