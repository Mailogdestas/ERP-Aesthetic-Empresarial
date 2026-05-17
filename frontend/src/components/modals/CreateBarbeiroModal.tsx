import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Button, HStack
} from '@chakra-ui/react';

export type NewBarbeiro = {
  id: string;
  nome: string;
  email?: string;
  contato?: string;
  especialidades?: string;
  comissao?: number;
};

export function CreateBarbeiroModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (b: NewBarbeiro) => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [contato, setContato] = useState('');
  const [especialidades, setEspecialidades] = useState('');
  const [comissao, setComissao] = useState('');

  const submit = () => {
    const id = `barb-${Math.random().toString(36).slice(2)}`;
    const novo: NewBarbeiro = { id, nome, email, contato, especialidades, comissao: comissao ? Number(comissao) : undefined };
    onCreate(novo);
    onClose();
    setNome(''); setEmail(''); setContato(''); setEspecialidades(''); setComissao('');
  };

  const onlyDigits = (v: string) => v.replace(/\D/g, '');
  const maskPhone = (v: string) => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => [a && `(${a})`, b && ` ${b}`, c && `-${c}`].filter(Boolean).join(''));
    }
    return d.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (m, a, b, c) => [a && `(${a})`, b && ` ${b}`, c && `-${c}`].filter(Boolean).join(''));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Novo barbeiro</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={3} isRequired>
            <FormLabel>Nome</FormLabel>
            <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </FormControl>
          <HStack spacing={3} mb={3}>
            <FormControl>
              <FormLabel>E-mail</FormLabel>
              <Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Contato</FormLabel>
              <Input placeholder="Whats/Telefone" value={contato} onChange={(e) => setContato(maskPhone(e.target.value))} />
            </FormControl>
          </HStack>
          <HStack spacing={3} mb={3}>
            <FormControl>
              <FormLabel>Especialidades</FormLabel>
              <Input placeholder="Corte degradê, barba, navalha…" value={especialidades} onChange={(e) => setEspecialidades(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Comissão (%)</FormLabel>
              <Input type="number" step="0.1" placeholder="0" value={comissao} onChange={(e) => setComissao(e.target.value)} />
            </FormControl>
          </HStack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose}>Cancelar</Button>
          <Button colorScheme="brand" onClick={submit}>Criar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}