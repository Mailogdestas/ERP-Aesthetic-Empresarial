import { useEffect, useState } from 'react';
import { Heading, Table, Thead, Tr, Th, Tbody, Td, TableContainer } from '@chakra-ui/react';
import { api } from '../../lib/api';

export default function FidelidadePage() {
  const [lista, setLista] = useState<any[]>([]);
  useEffect(() => {
    api.get('/fidelidade?barbeariaId=tenant-1').then((r) => setLista(r.data ?? []));
  }, []);
  return (
    <>
      <Heading size="md" mb={4}>Fidelidade</Heading>
      <TableContainer overflowX="auto">
        <Table size="sm" minW="600px">
          <Thead><Tr><Th>Cliente</Th><Th>Pontos</Th><Th>Nível</Th></Tr></Thead>
          <Tbody>
            {lista.map((x, i) => (
              <Tr key={i}><Td>{x.cliente?.nome ?? x.clienteId}</Td><Td>{x.pontos}</Td><Td>{x.nivel}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}

FidelidadePage.requiresAuth = true;