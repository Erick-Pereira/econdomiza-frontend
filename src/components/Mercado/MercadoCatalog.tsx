import React, { useState, useEffect } from 'react';
import mercadoService, { Product, SearchParams } from '../../services/MercadoService';

interface MercadoCatalogProps {
  onProductSelect: (product: Product) => void;
  className?: string;
}

export const MercadoCatalog: React.FC<MercadoCatalogProps> = ({ 
  onProductSelect,
  className = ''
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Carregar produtos
  const loadProducts = async (params?: SearchParams) => {
    setLoading(true);
    try {
      const searchParams: SearchParams = {
        query: undefined,
        category: selectedCategory || undefined,
        supplier_name: undefined
      };
      
      const catalogParams = params || searchParams;
      const result = await mercadoService.buscarProdutos(catalogParams);
      setProducts(result);
    } catch (error) {
      console.error('Erro ao carregar catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar categorias
  const loadCategories = async () => {
    try {
      const categories = await mercadoService.listarCategorias();
      setCategories(categories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  return (
    <div className={`catalog-container ${className}`}>
      <div className="catalog-header">
        <h3>Catálogo de Produtos</h3>
        
        <div className="catalog-filters">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <span className="product-count">
            {products.length} produtos
          </span>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando produtos...</div>
      ) : (
        <div className="catalog-grid">
          {products.map(product => (
            <div 
              key={product.id} 
              className="catalog-card"
              onClick={() => onProductSelect(product)}
            >
              <img 
                src={product.image_url} 
                alt={product.name}
                className="catalog-image"
              />
              <div className="catalog-info">
                <h4>{product.name}</h4>
                <p className="catalog-sku">{product.sku}</p>
                <p className="catalog-price">R$ {product.price.toFixed(2)}</p>
                <p className="catalog-supplier">{product.supplier_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MercadoCatalog;