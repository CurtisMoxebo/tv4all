import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './components/LanguageSelector';

export const App: React.FC = () => {
  const { t } = useTranslation();
  const [count, setCount] = useState<number>(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      {/* Top right language selector */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/50 rounded-full">
          Tailwind CSS + React 18 + i18next
        </span>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t('app.title')}
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            {t('app.subtitle')}
          </p>
        </div>

        <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl text-left space-y-2 text-xs text-slate-300">
          <div className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
            {t('common.language')} Showcase
          </div>
          <p>• {t('channels.title')}: <span className="text-indigo-300">{t('channels.watchLive')}</span></p>
          <p>• {t('channels.viewCount', { count: 3 })}</p>
          <p>• {t('auth.tokenValid12h')}</p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setCount(prev => prev + 1)}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition-all duration-150 cursor-pointer"
          >
            {t('common.refresh')} ({count})
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
