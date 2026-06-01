import { useEffect } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

/** Entrada legada `auth.html` — redireciona sempre para o fluxo canónico da SPA. */

export function AuthShell() {
  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    navigate('/login', { replace: true, state: { from: location } });
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Redirecionando para login…</p>
    </div>
  );
}
