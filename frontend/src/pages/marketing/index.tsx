import { Heading, Text, VStack, Button } from '@chakra-ui/react';

export default function MarketingPage() {
  return (
    <>
      <Heading size="md" mb={4}>Marketing & Lembretes</Heading>
      <VStack align="start" spacing={3}>
        <Text>Integração com n8n para envio de WhatsApp via webhook.</Text>
        <Button colorScheme="brand">Configurar Webhook n8n</Button>
        <Button>Visualizar Templates de Mensagens</Button>
      </VStack>
    </>
  );
}

MarketingPage.requiresAuth = true;