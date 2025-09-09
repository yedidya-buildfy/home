import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const inputClasses = `
    block w-full px-4 py-3 border-2 rounded-xl shadow-sm placeholder-gray-400 
    focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 
    transition-all duration-200 bg-white
    ${error ? 'border-red-300 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 hover:border-gray-300'}
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}