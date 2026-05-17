import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Textarea, Button, HStack
} from '@chakra-ui/react';

export type NewCliente = {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  bairro?: string;
  observacoes?: string;
};

export function CreateClienteModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (c: NewCliente) => void }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [bairro, setBairro] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const onlyDigits = (v: string) => v.replace(/\D/g, '');
  const maskPhone = (v: string) => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => [a && `(${a})`, b && ` ${b}`, c && `-${c}`].filter(Boolean).join(''));
    }
    return d.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (m, a, b, c) => [a && `(${a})`, b && ` ${b}`, c && `-${c}`].filter(Boolean).join(''));
  };

  const submit = () => {
    const id = `cli-${Math.random().toString(36).slice(2)}`;
    const novo: NewCliente = { id, nome, telefone, whatsapp, email, bairro, observacoes };
    onCreate(novo);
    onClose();
    setNome(''); setTelefone(''); setWhatsapp(''); setEmail(''); setBairro(''); setObservacoes('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Novo cliente</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={3} isRequired>
            <FormLabel>Nome</FormLabel>
            <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
          </FormControl>
          <HStack mb={3} spacing={3}>
            <FormControl>
              <FormLabel>Telefone</FormLabel>
              <Input placeholder="(00) 0000-0000" value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} />
            </FormControl>
            <FormControl>
              <FormLabel>WhatsApp</FormLabel>
              <Input placeholder="(00) 00000-0000" value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} />
            </FormControl>
          </HStack>
          <HStack mb={3} spacing={3}>
            <FormControl>
              <FormLabel>E-mail</FormLabel>
              <Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Bairro</FormLabel>
              <Input placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            </FormControl>
          </HStack>
          <FormControl>
            <FormLabel>Observações</FormLabel>
            <Textarea placeholder="Alergias, barba difícil, preferências…" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
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