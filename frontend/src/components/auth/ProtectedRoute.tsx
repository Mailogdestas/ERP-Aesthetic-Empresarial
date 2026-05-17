import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/router';
import { Center, Spinner } from '@chakra-ui/react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 🔥 BYPASS DE DEMO
  const isDemo = true;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDemo) {
      localStorage.setItem('accessToken', 'demo');
      return; // não redireciona nunca na demo
    }

    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  // evita render antes de montar
  if (!mounted) {
    return (
      <Center minH="100vh">
        <Spinner />
      </Center>
    );
  }

  // 🔥 na demo nunca bloqueia
  if (!isDemo && !token) {
    return (
      <Center minH="100vh">
        <Spinner />
      </Center>
    );
  }

  return <>{children}</>;
};