import { Table, Thead, Tr, Th, Tbody, Td, TableContainer } from '@chakra-ui/react';
export const ClientsTable = ({ clients }: { clients: Array<{ nome: string; telefone?: string; ativo: boolean }> }) => (
  <TableContainer overflowX="auto">
    <Table variant="simple" minW="600px">
      <Thead><Tr><Th>Nome</Th><Th>Telefone</Th><Th>Status</Th></Tr></Thead>
      <Tbody>
        {clients.map((c, i) => (
          <Tr key={i}><Td>{c.nome}</Td><Td>{c.telefone ?? '-'}</Td><Td>{c.ativo ? 'Ativo' : 'Inativo'}</Td></Tr>
        ))}
      </Tbody>
    </Table>
  </TableContainer>
);