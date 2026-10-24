import React from 'react';
import { useTranslation } from 'react-i18next';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      data-testid="app-footer"
      className="w-full border-t border-[#1e2c47]/60 bg-[#080c14]/80 backdrop-blur-sm py-4 px-4 sm:px-6 lg:px-8 mt-auto"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-1.5 text-xs text-slate-400">
        <span>&copy; {currentYear}</span>
        <span className="font-semibold text-white tracking-tight">
          tv<span className="text-indigo-400">4</span>all
        </span>
        <span className="text-slate-500">&bull;</span>
        <span>{t('footer.copyright')}</span>
      </div>
    </footer>
  );
};

export default Footer;
