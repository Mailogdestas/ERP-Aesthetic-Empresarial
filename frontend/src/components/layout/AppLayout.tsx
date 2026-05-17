import React from 'react';
import { Box, Flex, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, useDisclosure, useColorModeValue } from '@chakra-ui/react';
import { Sidebar } from '../nav/Sidebar';
import { Topbar } from './Topbar';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  return (
    <>
      {/* Drawer para navegação em mobile */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menu</DrawerHeader>
          <DrawerBody p={0}>
            <Sidebar />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex minH="100vh" direction={{ base: 'column', md: 'row' }}>
        {/* Sidebar visível em md+ e sticky no desktop */}
        <Box
          display={{ base: 'none', md: 'block' }}
          position="sticky"
          top={0}
          h="100vh"
          overflowY="auto"
          flexShrink={0}
          borderRightWidth="1px"
          borderRightColor={borderColor}
        >
          <Sidebar />
        </Box>
        <Box flex="1" p={{ base: 4, md: 6 }}>
          <Topbar onOpenMenu={onOpen} />
          {children}
        </Box>
      </Flex>
    </>
  );
};