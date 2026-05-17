import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

export const Card: React.FC<{ children: React.ReactNode } & { p?: number | string }>
  = ({ children, p = 4 }) => {
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  return (
    <Box p={p} borderWidth="1px" borderColor={border} borderRadius="lg" bg={bg} boxShadow="md">
      {children}
    </Box>
  );
};