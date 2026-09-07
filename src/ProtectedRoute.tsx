import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient'; // Seu arquivo de configuração do Supabase

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Checa se o usuário está logado no Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Carregando...</div>; // Tela de transição rápida
  }

  // Se NÃO estiver autenticado, manda de volta para a tela de Login
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, libera o acesso à tela da Proprietária
  return children;
}