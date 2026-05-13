import React, { createContext, useContext, useState } from 'react';
import { Product } from '../../services/MercadoService';

interface ComponentContext {
  selectedProduct: Product | null;
  selectedSupplier: Supplier | null;
  setSelectedProduct: (product: Product | null) => void;
  setSelectedSupplier: (supplier: Supplier | null) => void;
  onProductSelect: (product: Product) => void;
  onSupplierSelect: (supplier: Supplier) => void;
  onProductDeselect: () => void;
  onSupplierDeselect: () => void;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
}

const ComponentContext = createContext<ComponentContext | undefined>(undefined);

export function ComponentProvider({ children }: { children: React.ReactNode }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const onProductSelect = (product: Product) => {
    setSelectedProduct(product);
    console.log('Produto selecionado:', product.name);
  };

  const onSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    console.log('Fornecedor selecionado:', supplier.name);
  };

  const onProductDeselect = () => {
    setSelectedProduct(null);
  };

  const onSupplierDeselect = () => {
    setSelectedSupplier(null);
  };

  const value = {
    selectedProduct,
    selectedSupplier,
    setSelectedProduct,
    setSelectedSupplier,
    onProductSelect,
    onSupplierSelect,
    onProductDeselect,
    onSupplierDeselect
  };

  return (
    <ComponentContext.Provider value={value}>
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponent() {
  const context = useContext(ComponentContext);
  if (context === undefined) {
    throw new Error('useComponent must be used within a ComponentProvider');
  }
  return context;
}

export default ComponentProvider;