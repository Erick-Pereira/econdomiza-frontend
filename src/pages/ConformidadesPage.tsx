import { Navigate } from 'react-router-dom';

/** @deprecated Use `/conformidades` via ComplianceLayout */
export default function ConformidadesPage() {
  return <Navigate to="/conformidades" replace />;
}
