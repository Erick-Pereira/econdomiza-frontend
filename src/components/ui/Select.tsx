import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  icon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options: _options, icon, className = '', id, children, ...props }, ref) => {
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
          <select
            ref={ref}
            id={uniqueId}
            className={`
              w-full px-4 py-2.5 
              ${icon ? 'pl-10' : ''}
              bg-white border 
              rounded-lg 
              text-gray-900 
              appearance-none
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              disabled:bg-gray-50 disabled:text-gray-500
              transition-all duration-200
              border-gray-300
              hover:border-gray-400
              ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
              cursor-pointer
            `}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${uniqueId}-error` : helperText ? `${uniqueId}-helper` : undefined}
            {...props}
          >
            {!props.value && (
              <option value="" disabled>
                Selecione uma opção
              </option>
            )}
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 9l4 4l4-4"
              />
            </svg>
          </div>
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

Select.displayName = 'Select';