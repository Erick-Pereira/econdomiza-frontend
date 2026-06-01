import { Link } from 'react-router-dom';

type Props = {
  mode: 'login' | 'register';
};

/** Alternância entre ecrãs públicos de login e registo. */
export function AuthScreenSwitch({ mode }: Props) {
  if (mode === 'login') {
    return (
      <p className="form-help auth-screen-switch">
        Não tem conta?{' '}
        <Link to="/register" className="link-accent">
          Criar conta
        </Link>
      </p>
    );
  }

  return (
    <p className="form-help auth-screen-switch">
      Já tem uma conta?{' '}
      <Link to="/login" className="link-accent">
        Faça login
      </Link>
    </p>
  );
}
