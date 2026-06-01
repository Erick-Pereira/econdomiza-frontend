#!/bin/bash
# Auto-repair all corrupted SCSS files in /src/pages
# Following SCSS Corrupted Signature Recovery pattern

PAGES_DIR="/f/p/simcag/econdomiza-frontend/src/pages"

echo "=== AUTO-FIX ALL CORRUPTED SCSS FILES ==="

for file in ComprasPage ConfiguracoesPage ConformidadesPage FornecedoresPage MoradorPage NotificacoesPage ProdutosPage RelatoriosPage; do
    SCSS_FILE="${PAGES_DIR}/${file}.scss"
    
    if [ -f "$SCSS_FILE" ]; then
        echo "Fixing ${file}..."
        
        # Check first line starts with '--'
        FIRSTLINE=$(head -1 "$SCSS_FILE")
        if echo "$FIRSTLINE" | grep -q "^--"; then
            echo "  ❌ CORRUPTED (starts with --)"
            
            # Delete the file
            rm "$SCSS_FILE"
            echo "  ✅ DELETED"
            
            # Recreate with valid structure
            cat > "$SCSS_FILE" << 'EOF'
/* Valid SCSS file with proper structure */

.page-content {
  min-height: calc(100vh - 60px);
  background-color: var(--background);
  color: var(--text-primary);
  
  h1, h2, h3, h4, h5, h6 {
    font-family: Segoe UI, Helvetica Neue, Arial, sans-serif;
    font-weight: 600;
    color: var(--primary);
  }
  
  p {
    font-family: Consolas, Liberation Mono, Monaco, monospace;
    font-size: 14px;
    color: #334155;
  }
}
EOF
            echo "  ✅ RECREATED"
        else
            echo "  ✅ Already valid"
        fi
    else
        echo "  ⚠️ File not found (already deleted?)"
    fi
done

echo ""
echo "=== VERIFICATION ==="
for file in ComprasPage ConfiguracoesPage ConformidadesPage FornecedoresPage MoradorPage NotificacoesPage ProdutosPage RelatoriosPage; do
    SCSS_FILE="${PAGES_DIR}/${file}.scss"
    if [ -f "$SCSS_FILE" ]; then
        FIRSTLINE=$(head -1 "$SCSS_FILE")
        if echo "$FIRSTLINE" | grep -q "page-content"; then
            echo "✅ ${file}.scss FIXED"
        else
            echo "❌ ${file}.scss still has issue"
        fi
    fi
done
