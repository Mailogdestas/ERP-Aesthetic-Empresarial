import { useEffect, useState } from 'react';
import { Heading, Table, Thead, Tr, Th, Tbody, Td, Badge, TableContainer } from '@chakra-ui/react';
import { api } from '../../lib/api';

export default function EstoquePage() {
  const [lista, setLista] = useState<any[]>([]);
  useEffect(() => {
    api.get('/estoque?barbeariaId=tenant-1').then((r) => setLista(r.data ?? []));
  }, []);
  return (
    <>
      <Heading size="md" mb={4}>Estoque</Heading>
      <TableContainer overflowX="auto">
        <Table size="sm" minW="680px">
          <Thead><Tr><Th>Produto</Th><Th>Quantidade</Th><Th>Alerta</Th></Tr></Thead>
          <Tbody>
            {lista.map((x, i) => (
              <Tr key={i}><Td>{x.produto?.nome ?? x.produtoId}</Td><Td>{x.quantidade}</Td><Td>{x.quantidade <= (x.alerta ?? 0) ? <Badge colorScheme="red">Baixo</Badge> : '-'}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}

EstoquePage.requiresAuth = true;