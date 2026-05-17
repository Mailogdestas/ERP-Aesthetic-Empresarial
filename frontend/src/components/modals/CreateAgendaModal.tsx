import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Select, HStack, Button
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';

export type NewAgendamento = {
  id: string;
  clienteId: string;
  barbeiroId: string;
  servicoId?: string;
  sala?: string;
  status: string;
  inicio: string;
  fim?: string;
};

export function CreateAgendaModal({
  isOpen,
  onClose,
  barbeiros = [],
  servicos = [],
  salas = [],
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  barbeiros?: string[];
  servicos?: (string | undefined)[];
  salas?: (string | undefined)[];
  onCreate: (novo: NewAgendamento) => void;
}) {
  const [clienteId, setClienteId] = useState('');
  const [barbeiroId, setBarbeiroId] = useState('');
  const [servicoId, setServicoId] = useState('');
  const [sala, setSala] = useState('');
  const [status, setStatus] = useState('aguardando');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const submit = () => {
    const id = `ag-${Math.random().toString(36).slice(2)}`;
    const novo: NewAgendamento = { id, clienteId, barbeiroId, servicoId, sala, status, inicio, fim };
    onCreate(novo);
    onClose();
    // reset simples
    setClienteId(''); setBarbeiroId(''); setServicoId(''); setSala(''); setStatus('aguardando'); setInicio(''); setFim('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Novo agendamento</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={3} isRequired>
            <FormLabel>Cliente</FormLabel>
            <Input placeholder="ID/Nome do cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
          </FormControl>
          <FormControl mb={3} isRequired>
            <FormLabel>Barbeiro</FormLabel>
            <Select placeholder="Selecione" value={barbeiroId} onChange={(e) => setBarbeiroId(e.target.value)}>
              {barbeiros.map((b) => (<option key={b} value={b}>{b}</option>))}
            </Select>
          </FormControl>
          <HStack spacing={3} mb={3}>
            <FormControl>
              <FormLabel>Serviço</FormLabel>
            <Select placeholder="Selecione" value={servicoId} onChange={(e) => setServicoId(e.target.value)} icon={<ChevronDownIcon />} sx={{ backgroundImage: 'none' }}>
              {servicos.filter(Boolean).map((s) => (<option key={s as string} value={s as string}>{s as string}</option>))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Sala</FormLabel>
              <Select placeholder="Selecione" value={sala} onChange={(e) => setSala(e.target.value)} icon={<ChevronDownIcon />} sx={{ backgroundImage: 'none' }}>
                {salas.filter(Boolean).map((s) => (<option key={s as string} value={s as string}>{s as string}</option>))}
              </Select>
            </FormControl>
          </HStack>
          <HStack spacing={3} mb={3}>
            <FormControl isRequired>
              <FormLabel>Início</FormLabel>
            <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Fim</FormLabel>
              <Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
            </FormControl>
          </HStack>
          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} icon={<ChevronDownIcon />} sx={{ backgroundImage: 'none' }}>
              <option value="aguardando">Aguardando</option>
              <option value="confirmado">Confirmado</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose}>Cancelar</Button>
          <Button colorScheme="brand" onClick={submit}>Criar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}