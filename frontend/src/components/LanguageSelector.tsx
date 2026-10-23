import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLanguage } from '../i18n';

interface LanguageOption {
  code: SupportedLanguage;
  label: string;
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' }
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language?.split(/[-_]/)[0] || 'en') as SupportedLanguage;
  const currentOption = languages.find(l => l.code === currentLang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-white bg-black border border-neutral-800 rounded-lg hover:border-neutral-700 hover:bg-neutral-950 transition-colors cursor-pointer"
      >
        <span>{currentOption.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 bg-black border border-neutral-800 rounded-lg shadow-2xl py-1 z-50">
          {languages.map(({ code, label }) => {
            const isSelected = currentLang === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'text-white font-semibold bg-neutral-900'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                }`}
              >
                <span>{label}</span>
                {isSelected && <span className="text-white text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
