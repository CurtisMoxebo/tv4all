import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { Logo } from '../components/Logo';
import { Footer } from '../components/Footer';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to target page
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || t('auth.invalidCredentials'));
    }
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-white flex flex-col justify-between items-center relative">
      {/* Top right language switch */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      <div className="flex-1 flex flex-col justify-center items-center w-full px-4 py-12">
        <div className="w-full max-w-sm border border-[#1e2c47] rounded-2xl p-8 bg-[#0d1527] shadow-2xl shadow-indigo-950/40 space-y-6">
          {/* Header with Logo */}
          <div className="text-center">
            <Logo size="lg" />
          </div>

          {/* Error notification */}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-500 text-xs text-center font-semibold tracking-wide">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.username')}
              </label>
              <input
                id="username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#151f32] border border-[#263756] text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-sm transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#151f32] border border-[#263756] text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-sm transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-sm shadow-md"
              >
                {loading ? t('auth.signingIn') : t('auth.loginButton')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LoginPage;

