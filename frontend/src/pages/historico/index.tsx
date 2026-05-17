import { useEffect, useState } from 'react';
import { Heading, Table, Thead, Tr, Th, Tbody, Td, TableContainer } from '@chakra-ui/react';
import { api } from '../../lib/api';

export default function HistoricoPage() {
  const [lista, setLista] = useState<any[]>([]);
  useEffect(() => {
    api.get('/historico?barbeariaId=tenant-1').then((r) => setLista(r.data ?? []));
  }, []);
  return (
    <>
      <Heading size="md" mb={4}>Histórico de Atendimentos</Heading>
      <TableContainer overflowX="auto">
        <Table size="sm" minW="880px">
          <Thead><Tr><Th>Data</Th><Th>Cliente</Th><Th>Serviço</Th><Th>Barbeiro</Th></Tr></Thead>
          <Tbody>
            {lista.map((x, i) => (
              <Tr key={i}><Td>{new Date(x.data).toLocaleString()}</Td><Td>{x.cliente?.nome ?? x.clienteId}</Td><Td>{x.servico?.nome ?? x.servicoId}</Td><Td>{x.barbeiro?.nome ?? x.barbeiroId}</Td></Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}

HistoricoPage.requiresAuth = true;