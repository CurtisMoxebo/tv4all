import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center items-center text-center">
      <div className="max-w-2xl space-y-6">
        <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/70 border border-indigo-800/50 text-indigo-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>IPTV Single-Source Restreamer</span>
        </span>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          {t('app.title')}
        </h1>

        <p className="text-lg text-slate-400 leading-relaxed">
          {t('app.subtitle')}
        </p>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-left space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              System Status
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isAuthenticated
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
              }`}
            >
              {isAuthenticated ? 'Authenticated' : 'Guest'}
            </span>
          </div>

          {isAuthenticated ? (
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                👋 {t('auth.loggedInAs', { username: user?.username || 'tv4all' })}
              </p>
              <p className="text-xs text-slate-500">
                {t('auth.tokenValid12h')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Please sign in to access live streams and channels.
              </p>
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-md"
              >
                {t('nav.login')} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;

