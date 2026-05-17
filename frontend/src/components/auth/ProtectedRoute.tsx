import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/router';
import { Center, Spinner } from '@chakra-ui/react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  // Evita erro de hidratação garantindo que o placeholder seja igual
  // no servidor e no primeiro render no cliente.
  if (!mounted) {
    return (
      <Center minH="100vh">
        <Spinner />
      </Center>
    );
  }

  if (!token) {
    return (
      <Center minH="100vh">
        <Spinner />
      </Center>
    );
  }

  return <>{children}</>;
};