import React, { useState, useEffect } from 'react';
import mercadoService, { Product, Supplier, Category, SearchParams } from '../../services/MercadoService';
import { useComponent } from './ComponentProvider';

interface MercadoSearchProps {
  className?: string;
}

export const MercadoSearch: React.FC<MercadoSearchProps> = ({ className = '' }) => {
  const { onProductSelect } = useComponent();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  // Buscar categorias
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await mercadoService.listarCategorias();
      setCategories(cats);
    };
    loadCategories();
  }, []);

  // Buscar fornecedores
  useEffect(() => {
    const loadSuppliers = async () => {
      const sups = await mercadoService.listarFornecedores();
      setSuppliers(sups);
    };
    loadSuppliers();
  }, []);

  // Buscar produtos
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    const params: SearchParams = {
      query: query || undefined,
      category: selectedCategory || undefined,
      supplier_name: selectedSupplier || undefined
    };
    
    try {
      const results = await mercadoService.buscarProdutos(params);
      setSearchResults(results);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`search-container ${className}`}>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="filter-select"
        >
          <option value="">Todas as categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos os fornecedores</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
          ))}
        </select>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="results-grid">
          {searchResults.map(product => (
            <div 
              key={product.id} 
              className="result-card" 
              onClick={() => onProductSelect(product)}
            >
              <img 
                src={product.image_url} 
                alt={product.name}
                className="product-image"
              />
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="product-sku">{product.sku}</p>
                <p className="product-price">R$ {product.price.toFixed(2)}</p>
                <p className="product-supplier">Fornecedor: {product.supplier_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MercadoSearch;