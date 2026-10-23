import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CategorySelectorProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  channelCounts: Record<string, number>;
  totalChannelsCount: number;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  channelCounts,
  totalChannelsCount
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAll = selectedCategory === 'all';
  const displayLabel = isAll ? t('channels.allGroups') : selectedCategory;
  const currentCount = isAll ? totalChannelsCount : (channelCounts[selectedCategory] || 0);

  const handleSelect = (cat: string) => {
    onSelectCategory(cat);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#151f32] border border-[#263756] text-white hover:border-slate-500 hover:bg-[#1a263d] transition-all duration-150 cursor-pointer shadow-sm"
      >
        <div className="flex items-center space-x-2 truncate">
          <span className="text-xs font-semibold truncate text-white">
            {displayLabel}
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0d1527] text-slate-400 border border-[#1e2c47]">
            {currentCount}
          </span>
        </div>

        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-[#0d1527] border border-[#1e2c47] rounded-xl shadow-2xl py-1.5 z-50 custom-scrollbar">
          {/* "All" Category Option */}
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
              isAll
                ? 'text-white font-bold bg-[#151f32]'
                : 'text-slate-300 hover:text-white hover:bg-[#151f32]/60'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span>{t('channels.allGroups')}</span>
              <span className="text-[10px] text-slate-400 font-medium">({totalChannelsCount})</span>
            </div>
            {isAll && <span className="text-white text-xs font-bold">✓</span>}
          </button>

          {/* Category List */}
          {categories.map(cat => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            const count = channelCounts[cat] || 0;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelect(cat)}
                className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'text-white font-bold bg-[#151f32]'
                    : 'text-slate-300 hover:text-white hover:bg-[#151f32]/60'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="truncate">{cat}</span>
                  <span className="text-[10px] text-slate-400 font-medium">({count})</span>
                </div>
                {isSelected && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
