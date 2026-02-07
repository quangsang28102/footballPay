'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search, Minus, Plus } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  enableQuantity?: boolean;
}

export default function MultiSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Chọn...', 
  label,
  className = '',
  enableQuantity = false
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const toggleOption = (optValue: string) => {
    if (enableQuantity) {
        // If enabling quantity mode, clicking row acts as toggle 0 <-> 1 (like checkbox) if clicking outside buttons
        // But better to let user click buttons. Clicking row can default to add 1 if 0, or do nothing.
        // Let's implement simple toggle for row click: if 0 set 1, else do nothing (let buttons handle)
        const count = value.filter(v => v === optValue).length;
        if (count === 0) updateQuantity(optValue, 1);
    } else {
        const newValue = value.includes(optValue)
        ? value.filter(v => v !== optValue)
        : [...value, optValue];
        onChange(newValue);
    }
  };

  const getQuantity = (optValue: string) => value.filter(v => v === optValue).length;

  const updateQuantity = (optValue: string, delta: number) => {
    const currentCount = getQuantity(optValue);
    const newCount = Math.max(0, currentCount + delta);
    
    // Remove all current instances
    const others = value.filter(v => v !== optValue);
    
    // Add new instances
    const newInstances = Array(newCount).fill(optValue);
    
    onChange([...others, ...newInstances]);
  };

  const handleSelectAll = () => {
    const visibleValues = filteredOptions.map(o => o.value);
    
    if (enableQuantity) {
        // For quantity mode: Ensure every visible option has AT LEAST 1
        // If already selected, leave as is? User req: "mặc định số lượng sẽ là 1".
        // It implies setting all visible items to exactly 1.
        // Or adding 1 to empty ones?
        // "Khi bấm chọn tất cả, mặc định số lượng sẽ là 1" -> Set to 1 if 0. If >1, maybe keep?
        // Usually Select All means "Make everything selected".
        // Let's set everything to 1 for consistency and as per user "quantity will be 1".
        
        let newValue = [...value];
        // Remove duplicate invisible ones? No, keep invisible ones.
        // Filter out visible ones from current value first to reset them?
        const invisibleValues = value.filter(v => !visibleValues.includes(v));
        
        // Add 1 for each visible option
        const newVisibleValues = visibleValues; // Since visibleValues is array of IDs, and we want 1 of each
        
        onChange([...invisibleValues, ...newVisibleValues]);
    } else {
        const newValue = Array.from(new Set([...value, ...visibleValues]));
        onChange(newValue);
    }
  };

  const handleDeselectAll = () => {
    const visibleValues = filteredOptions.map(o => o.value);
    const newValue = value.filter(v => !visibleValues.includes(v));
    onChange(newValue);
  };

  // Format display text
  let displayText = placeholder;
  
  if (enableQuantity) {
      // Show unique count or total slots?
      const uniqueCount = new Set(value).size;
      const totalSlots = value.length;
      if (totalSlots > 0) {
           displayText = `${uniqueCount} người (${totalSlots} slot)`;
      }
  } else {
      const selectedLabels = options
        .filter(o => value.includes(o.value))
        .map(o => o.label);
      if (selectedLabels.length > 0) {
        if (selectedLabels.length <= 3) {
          displayText = selectedLabels.join(', ');
        } else {
          displayText = `${selectedLabels.length} người đã chọn`;
        }
      }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm text-slate-400 mb-2">{label}</label>}
      
      <button 
        type="button"
        className="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl px-4 py-2.5 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setSearch(''); }}
      >
        <span className={`truncate ${value.length ? "text-white" : "text-slate-500"}`}>
          {displayText}
        </span>
        <ChevronDown size={16} className={`text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {/* Search */}
            <div className="p-2 border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full bg-white/5 border-none rounded-lg py-1.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        autoFocus
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex border-b border-white/10 text-xs font-medium">
                <button type="button" onClick={handleSelectAll} className="flex-1 py-2 text-indigo-400 hover:bg-white/5 text-center transition-colors">
                  Chọn tất cả
                </button>
                <div className="w-px bg-white/10"></div>
                <button type="button" onClick={handleDeselectAll} className="flex-1 py-2 text-red-400 hover:bg-white/5 text-center transition-colors">
                  Bỏ chọn
                </button>
            </div>

            {/* Options */}
            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {filteredOptions.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-sm">Không tìm thấy kết quả</div>
                ) : (
                    filteredOptions.map(option => {
                        const isSelected = value.includes(option.value);
                        const qty = getQuantity(option.value);

                        return (
                        <div 
                          key={option.value} 
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors select-none ${isSelected ? 'bg-indigo-500/10' : ''}`}
                          onClick={() => !enableQuantity && toggleOption(option.value)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden" onClick={() => enableQuantity && qty === 0 && updateQuantity(option.value, 1)}>
                                {!enableQuantity && (
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrinking-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                        {isSelected && <Check size={12} className="text-white" />}
                                    </div>
                                )}
                                <span className={`text-sm truncate ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>
                                    {option.label}
                                </span>
                            </div>

                            {enableQuantity && (
                                <div className="flex items-center bg-[#0f172a] rounded-lg border border-white/10 p-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button 
                                        type="button"
                                        onClick={() => updateQuantity(option.value, -1)}
                                        className={`w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${qty === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300'}`}
                                        disabled={qty === 0}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className={`w-8 text-center text-sm font-medium ${qty > 0 ? 'text-white' : 'text-slate-500'}`}>
                                        {qty}
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => updateQuantity(option.value, 1)}
                                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>
             <div className="p-2 border-t border-white/10 bg-white/0 text-xs text-slate-500 text-right">
                Đã chọn: <span className="text-indigo-400 font-bold">{value.length}</span> {enableQuantity ? 'slot' : ''} / {enableQuantity ? options.length + '+' : options.length}
            </div>
        </div>
      )}
    </div>
  );
}
