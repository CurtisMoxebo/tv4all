import React from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLanguage } from '../i18n';

interface LanguageOption {
  code: SupportedLanguage;
  label: string;
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' }
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language?.split(/[-_]/)[0] || 'en') as SupportedLanguage;

  const handleLanguageChange = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="inline-flex items-center bg-black border border-neutral-800 rounded-lg p-0.5">
      {languages.map(({ code, label }) => {
        const isActive = currentLang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => handleLanguageChange(code)}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
              isActive
                ? 'bg-white text-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSelector;
