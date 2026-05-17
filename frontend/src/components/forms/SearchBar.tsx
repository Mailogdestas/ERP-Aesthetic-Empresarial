import React from 'react';
import { Input, InputGroup, InputLeftElement } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

export const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <InputGroup maxW="md">
    <InputLeftElement pointerEvents="none">
      <SearchIcon color="gray.400" />
    </InputLeftElement>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? 'Buscar...'} />
  </InputGroup>
);