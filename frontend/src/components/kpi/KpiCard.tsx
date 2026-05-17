import { Box, Heading, Text } from '@chakra-ui/react';
export const KpiCard = ({ title, value }: { title: string; value: string | number }) => (
  <Box p={4} borderWidth="1px" borderRadius="md">
    <Heading size="sm">{title}</Heading>
    <Text fontSize="2xl" fontWeight="bold">{value}</Text>
  </Box>
);