import { Navigate } from 'react-router-dom';

/** @deprecated Use `/morador` (MoradorHomePage) */
export default function MoradorPage() {
  return <Navigate to="/morador" replace />;
}
