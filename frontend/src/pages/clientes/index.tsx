import { useEffect, useState } from 'react';
import { Heading, HStack, Button, useDisclosure } from '@chakra-ui/react';
import { api } from '../../lib/api';
import { ClientsTable } from '../../components/tables/ClientsTable';
import { SearchBar } from '../../components/forms/SearchBar';
import { CreateClienteModal, NewCliente } from '../../components/modals/CreateClienteModal';

export default function ClientesPage() {
  const [clients, setClients] = useState<Array<{ nome: string; telefone?: string; ativo: boolean }>>([]);
  const [q, setQ] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  useEffect(() => {
    api.get('/clientes?barbeariaId=tenant-1').then((r) => setClients(r.data ?? []));
  }, []);

  const filtered = clients.filter((c) => c.nome.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Heading size="md" mb={4}>Clientes</Heading>
      <HStack mb={4}>
        <SearchBar value={q} onChange={setQ} placeholder="Buscar clientes" />
        <Button colorScheme="brand" onClick={onOpen}>Novo Cliente</Button>
      </HStack>
      <ClientsTable clients={filtered} />
      <CreateClienteModal
        isOpen={isOpen}
        onClose={onClose}
        onCreate={async (c: NewCliente) => {
          try {
            const payload = { ...c, barbeariaId: 'tenant-1' };
            const res = await api.post('/clientes', payload);
            const created = res.data ?? payload;
            setClients((prev) => [...prev, { nome: created.nome, telefone: created.whatsapp || created.telefone, ativo: true }]);
          } catch (e) {
            setClients((prev) => [...prev, { nome: c.nome, telefone: c.whatsapp || c.telefone, ativo: true }]);
          }
        }}
      />
    </>
  );
}

// @ts-expect-error augment next page
ClientesPage.requiresAuth = true;