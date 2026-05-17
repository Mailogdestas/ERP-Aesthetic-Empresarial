import React from 'react';
import { Flex, HStack, IconButton, Input, Avatar, Text, Box, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { SearchIcon, StarIcon, HamburgerIcon, MoonIcon, SunIcon } from '@chakra-ui/icons';

export const Topbar: React.FC<{ onOpenMenu?: () => void }> = ({ onOpenMenu }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const toggleIcon = useColorModeValue(<MoonIcon />, <SunIcon />);
  const toggleLabel = colorMode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro';
  return (
    <Flex justify="space-between" align="center" mb={4}>
      <HStack spacing={2}>
        {/* Botão de menu visível em mobile */}
        <Box display={{ base: 'block', md: 'none' }}>
          <IconButton aria-label="menu" icon={<HamburgerIcon />} onClick={onOpenMenu} variant="ghost" colorScheme="brand" />
        </Box>
        <IconButton aria-label="favoritos" icon={<StarIcon />} variant="ghost" colorScheme="brand" display={{ base: 'none', md: 'inline-flex' }} />
        <Box>
          <Text fontWeight="bold">Dashboard</Text>
          <Text fontSize="xs" color="gray.500">De: 01/03/2019 - 31/03/2019</Text>
        </Box>
      </HStack>
      <HStack spacing={3}>
        <Input size="sm" placeholder="Buscar..." maxW={{ base: '140px', md: '240px' }} />
        <IconButton aria-label="buscar" icon={<SearchIcon />} colorScheme="brand" />
        <IconButton aria-label={toggleLabel} icon={toggleIcon} variant="ghost" onClick={toggleColorMode} />
        <Avatar size="sm" name="Usuário" />
      </HStack>
    </Flex>
  );
};