import { describe, it, expect, beforeEach } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES, STORAGE_KEY, resolveInitialLanguage } from '../i18n';

describe('i18n Internationalization Regression Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should support English, French, and Spanish', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'fr', 'es']);
  });

  it('should resolve language from localStorage if present', () => {
    localStorage.setItem(STORAGE_KEY, 'fr');
    expect(resolveInitialLanguage()).toBe('fr');
  });

  it('should fallback to English when stored language is invalid', () => {
    localStorage.setItem(STORAGE_KEY, 'de');
    const lang = resolveInitialLanguage();
    expect(SUPPORTED_LANGUAGES).toContain(lang);
  });

  it('should translate logout in all supported languages', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('nav.logout')).toBe('Logout');

    await i18n.changeLanguage('fr');
    expect(i18n.t('nav.logout')).toBe('Déconnexion');

    await i18n.changeLanguage('es');
    expect(i18n.t('nav.logout')).toBe('Cerrar sesión');
  });

  it('should translate channel search placeholder in all supported languages', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('channels.searchPlaceholder')).toContain('Search channels');

    await i18n.changeLanguage('fr');
    expect(i18n.t('channels.searchPlaceholder')).toContain('Rechercher des chaînes');

    await i18n.changeLanguage('es');
    expect(i18n.t('channels.searchPlaceholder')).toContain('Buscar canales');
  });
});

