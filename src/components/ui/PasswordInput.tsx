import { forwardRef, useState, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const autoId = useId();
    const uniqueId = id ?? autoId;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={uniqueId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={uniqueId}
            type={showPassword ? 'text' : 'password'}
            className={`
              w-full px-4 py-2.5 
              ${icon ? 'pl-10' : ''}
              pr-10
              bg-white border 
              rounded-lg 
              text-gray-900 
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              disabled:bg-gray-50 disabled:text-gray-500
              transition-all duration-200
              border-gray-300
              hover:border-gray-400
              ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            `}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${uniqueId}-error` : helperText ? `${uniqueId}-helper` : undefined}
            {...props}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 3.293a1 1 0 00-1.414 1.414l1 1a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L3.707 3.293zM17 6.293L18.586 7.879a1 1 0 00.293-.293l-2-2a1 1 0 00-1.414 0l-1 1a1 1 0 101.414 1.414zM8.586 10a1 1 0 010 1.414l-2 2a1 1 0 101.414 1.414l2-2a1 1 0 010-1.414l-2-2a1 1 0 101.414-1.414l2 2a1 1 0 010 1.414zM16 16a1 1 0 001-1V8a1 1 0 00-1-1h-1a1 1 0 100 2h1a1 1 0 001-1v7a1 1 0 00-1 1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 3.293a1 1 0 01-1.414 1.414l3 3a1 1 0 010 1.414l-3 3a1 1 0 011.414 1.415L6.5 10a1 1 0 010-1.414L1 6.707A1 1 0 013.707 3.293zM17 6.293l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0z" clipRule="evenodd" />
                <path d="M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
        {error && (
          <p
            id={`${uniqueId}-error`}
            className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            <span aria-hidden="true">⚠️</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={`${uniqueId}-helper`}
            className="mt-1.5 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';