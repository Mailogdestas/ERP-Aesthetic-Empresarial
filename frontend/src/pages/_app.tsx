import { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { theme } from '../theme';
import { AuthProvider } from '../lib/auth';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

type NextPageWithConfig = AppProps['Component'] & { noLayout?: boolean; requiresAuth?: boolean };

export default function MyApp({ Component, pageProps }: AppProps) {
  const C = Component as NextPageWithConfig;
  const content = C.requiresAuth ? (
    <ProtectedRoute>
      <Component {...pageProps} />
    </ProtectedRoute>
  ) : (
    <Component {...pageProps} />
  );

  const wrapped = C.noLayout ? content : (
    <AppLayout>{content}</AppLayout>
  );

  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>{wrapped}</AuthProvider>
    </ChakraProvider>
  );
}