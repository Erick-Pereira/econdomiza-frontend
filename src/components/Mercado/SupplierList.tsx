import React, { useState, useEffect } from 'react';
import mercadoService, { Supplier } from '../../services/MercadoService';

interface SupplierListProps {
  onSelectSupplier: (supplier: Supplier) => void;
  className?: string;
}

export const SupplierList: React.FC<SupplierListProps> = ({ 
  onSelectSupplier,
  className = ''
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar fornecedores
  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const result = await mercadoService.listarFornecedores();
      setSuppliers(result);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <div className={`supplier-list ${className}`}>
      <h3>Fornecedores</h3>
      
      {loading ? (
        <div className="loading">Carregando fornecedores...</div>
      ) : (
        <div className="supplier-grid">
          {suppliers.length === 0 ? (
            <p className="no-data">Nenhum fornecedor disponível</p>
          ) : (
            suppliers.map(supplier => (
              <div 
                key={supplier.id} 
                className="supplier-card"
                onClick={() => onSelectSupplier(supplier)}
              >
                <div className="supplier-icon">🏭</div>
                <div className="supplier-info">
                  <h4>{supplier.name}</h4>
                  <p>{supplier.email}</p>
                  <p className="supplier-phone">{supplier.phone}</p>
                </div>
                <div className="supplier-badge">{supplier.status === 'active' ? 'Ativo' : 'Inativo'}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SupplierList;