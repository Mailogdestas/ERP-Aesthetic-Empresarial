import React from 'react';
import { HStack, VStack, Text, Badge, Link as ChakraLink } from '@chakra-ui/react';
import { Card } from '../ui/Card';

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  delta?: number; // percentual, positivo ou negativo
  actionHref?: string;
}> = ({ title, value, delta, actionHref }) => {
  const isUp = (delta ?? 0) >= 0;
  return (
    <Card>
      <HStack justify="space-between" mb={2}>
        <Text fontSize="xs" color="gray.500">{title.toUpperCase()}</Text>
        {actionHref && <ChakraLink href={actionHref} fontSize="xs">DETALHES</ChakraLink>}
      </HStack>
      <HStack align="end" spacing={3}>
        <Text fontSize="2xl" fontWeight="bold">{value}</Text>
        {typeof delta === 'number' && (
          <Badge colorScheme={isUp ? 'green' : 'red'}>{isUp ? '+' : ''}{delta}%</Badge>
        )}
      </HStack>
      <VStack align="start" mt={2}>
        <Text fontSize="xs" color="gray.400">Atualizado há 10 min</Text>
      </VStack>
    </Card>
  );
};