'use client';

import { ChangeEvent, KeyboardEvent } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  step?: number;
  required?: boolean;
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder,
  className,
  min = 0,
  step = 10000,
  required = false,
}: CurrencyInputProps) {
  // Format number with thousand separators
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters
    const rawValue = e.target.value.replace(/\D/g, '');

    // Handle empty input
    if (rawValue === '') {
      onChange(0);
      return;
    }

    const numericValue = parseInt(rawValue, 10);
    onChange(numericValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(value + step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = value - step;
      onChange(newValue < min ? min : newValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value === 0 ? '' : formatNumber(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder || '0'}
      className={className}
      required={required}
    />
  );
}
