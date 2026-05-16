import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
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
            className={`
              w-full px-4 py-2.5 
              ${icon ? 'pl-10' : ''}
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

Input.displayName = 'Input';