import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

const NotFoundPage: React.FC = () => (
  <div
    className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center"
    id="not-found-page"
  >
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">404</p>
    <h1 className="mt-2 text-2xl font-bold text-text-main">Página não encontrada</h1>
    <p className="mt-2 max-w-md text-sm text-text-muted">
      O endereço não corresponde a nenhuma rota da aplicação. Verifique o URL ou volte ao painel.
    </p>
    <Link to="/dashboard" className="mt-6">
      <Button variant="primary">Ir para o painel</Button>
    </Link>
  </div>
);

export default NotFoundPage;
