import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type SortOrder = 'default' | 'asc' | 'desc';

interface FilterPopoverProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  channelCounts: Record<string, number>;
  totalChannelsCount: number;
  sortBy: SortOrder;
  onSelectSortBy: (sort: SortOrder) => void;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  channelCounts,
  totalChannelsCount,
  sortBy,
  onSelectSortBy
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = selectedCategory !== 'all' || sortBy !== 'default';

  const handleReset = () => {
    onSelectCategory('all');
    onSelectSortBy('default');
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Filter Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Filter channels"
        className={`group p-2 rounded-xl transition-all duration-150 flex items-center justify-center cursor-pointer relative focus:outline-none ${
          isOpen
            ? 'text-white bg-[#151f32]'
            : hasActiveFilters
            ? 'text-indigo-400 hover:text-indigo-300 hover:bg-[#151f32]'
            : 'text-slate-400 hover:text-white hover:bg-[#151f32]'
        }`}
      >
        {/* Filter Funnel Icon */}
        <svg
          className="w-5 h-5 transition-transform duration-150 group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>

        {/* Active Filters Notification Dot */}
        {hasActiveFilters && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-[#0d1527]"></span>
        )}
      </button>

      {/* Filter Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0d1527] border border-[#1e2c47] rounded-2xl shadow-2xl p-4 z-50 space-y-4 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2c47]">
            <div className="flex items-center space-x-1.5 font-bold text-white text-sm">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Filters</span>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Reset all
              </button>
            )}
          </div>

          {/* Filter 1: Category */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {/* "All" Option */}
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-white text-black font-semibold'
                    : 'text-slate-300 hover:bg-[#151f32] hover:text-white'
                }`}
              >
                <span>{t('channels.allGroups')}</span>
                <span className={`text-[10px] ${selectedCategory === 'all' ? 'text-black/70' : 'text-slate-500'}`}>
                  {totalChannelsCount}
                </span>
              </button>

              {/* Individual Categories */}
              {categories.map(cat => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                const count = channelCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer truncate ${
                      isSelected
                        ? 'bg-white text-black font-semibold'
                        : 'text-slate-300 hover:bg-[#151f32] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    <span className={`text-[10px] shrink-0 ${isSelected ? 'text-black/70' : 'text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter 2: Sort Order */}
          <div className="space-y-1.5 pt-2 border-t border-[#1e2c47]">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Sort By
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => onSelectSortBy('default')}
                className={`py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                  sortBy === 'default'
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#151f32] text-slate-400 hover:text-white'
                }`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => onSelectSortBy('asc')}
                className={`py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                  sortBy === 'asc'
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#151f32] text-slate-400 hover:text-white'
                }`}
              >
                A → Z
              </button>
              <button
                type="button"
                onClick={() => onSelectSortBy('desc')}
                className={`py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer ${
                  sortBy === 'desc'
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#151f32] text-slate-400 hover:text-white'
                }`}
              >
                Z → A
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPopover;

