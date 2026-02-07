'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  value: string; // Value in yyyy-mm-dd format
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

// Convert yyyy-mm-dd to dd/mm/yyyy
function toDisplayFormat(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Convert dd/mm/yyyy to yyyy-mm-dd
function toISOFormat(displayDate: string): string {
  if (!displayDate) return '';
  const parts = displayDate.split('/');
  if (parts.length !== 3) return displayDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export default function DateInput({ value, onChange, required, className = '', placeholder }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(toDisplayFormat(value));
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(toDisplayFormat(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    
    // Remove all non-digit characters except /
    input = input.replace(/[^\d/]/g, '');
    
    // Auto-add slashes
    if (input.length === 2 && !input.includes('/')) {
      input = input + '/';
    } else if (input.length === 5 && input.split('/').length === 2) {
      input = input + '/';
    }
    
    // Limit to dd/mm/yyyy format (10 characters)
    if (input.length > 10) {
      input = input.slice(0, 10);
    }
    
    setDisplayValue(input);
    
    // If complete date, update the value
    if (input.length === 10) {
      const iso = toISOFormat(input);
      // Validate the date
      const date = new Date(iso);
      if (!isNaN(date.getTime())) {
        onChange(iso);
      }
    }
  };

  const openDatePicker = () => {
    hiddenInputRef.current?.showPicker();
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setDisplayValue(toDisplayFormat(newValue));
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        placeholder={placeholder || 'dd/mm/yyyy'}
        required={required}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={openDatePicker}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
      >
        <Calendar size={18} />
      </button>
      <input
        ref={hiddenInputRef}
        type="date"
        value={value}
        onChange={handleDatePickerChange}
        className="absolute opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
