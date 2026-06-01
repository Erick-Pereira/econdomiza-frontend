/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ============================================
      // DESIGN TOKENS SEMÂNTICOS — GOVERNANÇA VISUAL
      // ============================================
      
      // Escala de espaçamento baseada em múltiplos de 4px (grade atômica)
      spacing: {
        'xs': '0.25rem',   // 4px
        'sm': '0.5rem',    // 8px
        'md': '1rem',      // 16px
        'lg': '1.5rem',    // 24px
        'xl': '2rem',      // 32px
        '2xl': '3rem',     // 48px
        '3xl': '4rem',     // 64px
      },

      // Escala tipográfica geométrica (Perfect Fourth: 1:1.333)
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],    // 12px / 16px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px / 20px
        'base': ['1rem', { lineHeight: '1.5rem' }],   // 16px / 24px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px / 30px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }], // 20px / 34px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px / 40px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px / 48px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px / 60px
        '5xl': ['3rem', { lineHeight: '1' }],         // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
        '7xl': ['4.5rem', { lineHeight: '1' }],       // 72px
      },

      // Escala de peso tipográfico (hierarquia baseada em font-weight)
      fontWeight: {
        'header': 700,   // Bold para títulos principais
        'title': 600,    // Semibold para subtítulos
        'body': 400,     // Regular para corpo de texto
        'muted': 300,    // Light para texto secundário
      },

      // Arredondamento de bordas — faixa atômica (6-8px) e macroscópica (12-16px)
      borderRadius: {
        'atomic-sm': '6px',   // Componentes atômicos (botões, inputs)
        'atomic-md': '8px',   // Componentes atômicos padrão
        'macro-sm': '12px',   // Componentes macroscópicos menores
        'macro-md': '16px',   // Componentes macroscópicos (cartões, modais)
        'full': '9999px',
      },

      // Sombras de alta dispersão — baixa opacidade (4%-8%) com matização cromática
      boxShadow: {
        'atomic': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',           // Sombra mínima para elementos atômicos
        'macro-sm': '0 4px 6px -1px rgba(26, 54, 93, 0.1), 0 2px 4px -1px rgba(26, 54, 93, 0.06)',
        'macro-md': '0 10px 15px -3px rgba(26, 54, 93, 0.12), 0 4px 6px -2px rgba(26, 54, 93, 0.06)',
        'macro-lg': '0 25px 50px -12px rgba(26, 54, 93, 0.16), 0 8px 10px -6px rgba(26, 54, 93, 0.08)',
        'ring': '0 0 0 3px rgba(44, 82, 130, 0.35)',
      },

      // ============================================
      // PALETA DE CORES SEMÂNTICAS
      // ============================================
      
      colors: {
        // Marca — Identidade visual da aplicação
        brand: {
          primary: '#1a365d',
          secondary: '#2c5282',
          accent: '#e9d8fd',
        },

        surface: {
          background: '#f8fafc',
          muted: '#f1f5f9',
          border: '#e2e8f0',
          card: '#ffffff',
          elevation1: 'rgba(26, 54, 93, 0.04)',
          elevation2: 'rgba(26, 54, 93, 0.08)',
        },

        text: {
          main: '#0f172a',
          muted: '#334155',
          disabled: '#64748b',
        },

        status: {
          success: {
            DEFAULT: '#319795',
            light: '#e6fffa',
          },
          warning: {
            DEFAULT: '#ecc94b',
            light: '#fefcbf',
          },
          error: {
            DEFAULT: '#f56565',
            light: '#fed7d7',
          },
          info: {
            DEFAULT: '#2c5282',
            light: '#ebf8ff',
          },
        },

        // ============================================
        // PALETA UTILITÁRIA (mantida para compatibilidade)
        // ============================================
      },

      fontFamily: {
        primary: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        secondary: ['Georgia', 'serif'],
      },

      // Animações — Micro-interações suaves
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out forwards',
        'fade-out': 'fadeOut 0.2s ease-in-out forwards',
        'scale-in': 'scaleIn 0.2s ease-in-out forwards',
        'scale-out': 'scaleOut 0.2s ease-in-out forwards',
      },

      keyframes: {
        shimmer: {
          '0%': { backgroundColor: '#f3f4f6' },
          '50%': { backgroundColor: '#e5e7eb' },
          '100%': { backgroundColor: '#f3f4f6' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
      },
    },
  },
  plugins: [],
};
