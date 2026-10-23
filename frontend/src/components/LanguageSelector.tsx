import React from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLanguage } from '../i18n';

interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' }
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language?.split(/[-_]/)[0] || 'en') as SupportedLanguage;

  const handleLanguageChange = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
      {languages.map(({ code, label, flag }) => {
        const isActive = currentLang === code;
        return (
          <button
            key={code}
            onClick={() => handleLanguageChange(code)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${
              isActive
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={label}
          >
            <span>{flag}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSelector;

