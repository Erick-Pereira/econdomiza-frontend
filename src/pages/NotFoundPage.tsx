import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div className="page page-state" id="not-found-page">
    <h1>Página não encontrada</h1>
    <p className="form-help" style={{ marginTop: '0.5rem' }}>
      O endereço não corresponde a nenhuma rota da aplicação. Verifique o URL ou volte ao painel.
    </p>
    <p style={{ marginTop: '1rem' }}>
      <Link to="/dashboard" className="btn-primary">
        Ir para o dashboard
      </Link>
    </p>
  </div>
);

export default NotFoundPage;
