import React from 'react';
import { Box, VStack, Link as ChakraLink, Text, HStack, Icon, useColorModeValue } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import {
  StarIcon,
  CalendarIcon,
  InfoIcon,
  TimeIcon,
  SettingsIcon,
  UnlockIcon,
  DownloadIcon,
  EmailIcon,
  ArrowUpDownIcon,
  CheckCircleIcon,
  RepeatIcon,
} from '@chakra-ui/icons';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: StarIcon },
  { href: '/agenda', label: 'Agenda', icon: CalendarIcon },
  { href: '/clientes', label: 'Clientes', icon: InfoIcon },
  { href: '/historico', label: 'Histórico', icon: TimeIcon },
  { href: '/barbeiros', label: 'Barbeiros & Comissões', icon: SettingsIcon },
  { href: '/caixa', label: 'Caixa', icon: UnlockIcon },
  { href: '/pacotes', label: 'Pacotes', icon: DownloadIcon },
  { href: '/planos', label: 'Planos', icon: SettingsIcon },
  { href: '/marketing', label: 'Marketing', icon: EmailIcon },
  { href: '/vendas', label: 'Vendas', icon: ArrowUpDownIcon },
  { href: '/fidelidade', label: 'Fidelidade', icon: CheckCircleIcon },
  { href: '/estoque', label: 'Estoque', icon: RepeatIcon },
  { href: '/insights', label: 'Insights', icon: StarIcon },
];

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const sidebarBorder = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('brand.50', 'whiteAlpha.200');
  const headerText = useColorModeValue('brand.700', 'whiteAlpha.900');
  const modulesLabel = useColorModeValue('gray.600', 'gray.300');
  return (
    <Box
      w={{ base: '100%', md: '260px' }}
      borderRightWidth={{ base: '0', md: '1px' }}
      borderRightColor={sidebarBorder}
      p={4}
      bg={sidebarBg}
      minH={{ base: 'auto', md: '100vh' }}
    >
      <Box mb={4} p={3} borderRadius="md" bg={headerBg}>
        <Text fontWeight="bold" color={headerText}>ERP Barbearia</Text>
      </Box>
      <Text fontWeight="bold" mb={2} color={modulesLabel}>Módulos</Text>
      <VStack align="stretch" spacing={1}>
        {navItems.map((item) => {
          const isActive = router.pathname.startsWith(item.href);
          const bgActive = useColorModeValue('brand.100', 'whiteAlpha.200');
          const bgHover = useColorModeValue('brand.50', 'whiteAlpha.100');
          const colorActive = useColorModeValue('brand.800', 'brand.100');
          const colorDefault = useColorModeValue('gray.700', 'gray.200');
          const iconColorActive = useColorModeValue('brand.600', 'brand.200');
          const iconColorDefault = useColorModeValue('gray.500', 'gray.400');
          return (
              <ChakraLink
                key={item.href}
                as={NextLink}
                href={item.href}
                px={3}
                py={2}
                borderRadius="md"
                bg={isActive ? bgActive : 'transparent'}
                color={isActive ? colorActive : colorDefault}
                _hover={{ textDecoration: 'none', bg: bgHover }}
              >
                <HStack spacing={3}>
                  <Icon as={item.icon} color={isActive ? iconColorActive : iconColorDefault} />
                  <Text>{item.label}</Text>
                </HStack>
              </ChakraLink>
          );
        })}
      </VStack>
    </Box>
  );
};