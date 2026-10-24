import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './LanguageSelector';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-lg">TV</span>
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight">tv4all</span>
            <span className="ml-1.5 text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800/40 px-1.5 py-0.5 rounded">
              Relay
            </span>
          </div>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center space-x-4">
          <nav className="flex items-center space-x-2 mr-2">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'text-white bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {t('nav.channels')}
            </Link>

            {!isAuthenticated ? (
              <Link
                to="/login"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/login'
                    ? 'text-white bg-slate-800'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {t('nav.login')}
              </Link>
            ) : null}
          </nav>

          {/* Language Switcher */}
          <LanguageSelector />

          {/* User profile / Logout */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/50 border border-rose-800/50 hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
