/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR i18n Engine — Multi-language support with lazy-loaded locales
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. In-memory translation engine (no external i18n lib dependency)
 * 2. Lazy-loaded locale bundles
 * 3. ICU-style interpolation and pluralization
 * 4. Browser language detection + manual override
 * 5. localStorage persistence + Worker sync
 * 6. React hook for reactive translations
 */

import { useState, useEffect, useCallback } from 'react';
import { isWorkerConnected } from './worker-api';

// ══════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ar';

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: { decimal: string; thousands: string };
}

export type TranslationMap = Record<string, string>;

// ══════════════════════════════════════════════════════
// Locale Registry
// ══════════════════════════════════════════════════════

export const LOCALES: Record<SupportedLocale, LocaleConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', dateFormat: 'MM/DD/YYYY', numberFormat: { decimal: '.', thousands: ',' } },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: '.' } },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: ' ' } },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', dateFormat: 'DD.MM.YYYY', numberFormat: { decimal: ',', thousands: '.' } },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', dateFormat: 'YYYY/MM/DD', numberFormat: { decimal: '.', thousands: ',' } },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: '٫', thousands: '٬' } },
};

// ══════════════════════════════════════════════════════
// Translation Bundles
// ══════════════════════════════════════════════════════

const EN_TRANSLATIONS: TranslationMap = {
  // Nav
  'nav.home': 'Home',
  'nav.catalog': 'AI Employees',
  'nav.pricing': 'Pricing',
  'nav.dashboard': 'Dashboard',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'nav.integrations': 'Integrations',
  'nav.agents': 'Agents',
  'nav.voice': 'Voice',
  'nav.login': 'Log In',
  'nav.signup': 'Sign Up',
  'nav.logout': 'Log Out',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Try Again',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.noResults': 'No results found',
  'common.confirm': 'Confirm',
  'common.close': 'Close',

  // Auth
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.login': 'Log In',
  'auth.signup': 'Create Account',
  'auth.forgotPassword': 'Forgot password?',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',

  // Dashboard
  'dashboard.welcome': 'Welcome back, {name}',
  'dashboard.employees': 'Your AI Employees',
  'dashboard.tasks': 'Tasks Completed',
  'dashboard.activeNow': 'Active Now',
  'dashboard.quickStart': 'Quick Start',

  // Workspace
  'workspace.send': 'Send',
  'workspace.typing': '{name} is thinking...',
  'workspace.inputPlaceholder': 'Type your message...',
  'workspace.voiceOn': 'Voice On',
  'workspace.voiceOff': 'Voice Off',

  // Pricing
  'pricing.title': 'Simple, Transparent Pricing',
  'pricing.monthly': 'Monthly',
  'pricing.annual': 'Annual',
  'pricing.annualSave': 'Save {percent}%',
  'pricing.perMonth': '/month',
  'pricing.perYear': '/year',
  'pricing.startTrial': 'Start Free Trial',
  'pricing.currentPlan': 'Current Plan',
  'pricing.upgrade': 'Upgrade',
  'pricing.downgrade': 'Downgrade',
  'pricing.features': 'Features',

  // Trial
  'trial.daysRemaining': '{count, plural, one {# day} other {# days}} remaining',
  'trial.expired': 'Trial expired',
  'trial.upgrade': 'Upgrade now',
  'trial.extendRequest': 'Request extension',

  // Settings
  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeSystem': 'System',
  'settings.language': 'Language',
  'settings.notifications': 'Notifications',
  'settings.billing': 'Billing',
  'settings.security': 'Security',

  // Billing
  'billing.currentPlan': 'Current Plan',
  'billing.usage': 'Usage This Period',
  'billing.invoices': 'Invoice History',
  'billing.paymentMethods': 'Payment Methods',
  'billing.addCard': 'Add Payment Method',

  // Errors
  'error.networkOffline': 'You appear to be offline. Working in local mode.',
  'error.sessionExpired': 'Your session has expired. Please log in again.',
  'error.permissionDenied': 'You don\'t have permission to do that.',
  'error.notFound': 'Page not found',
  'error.serverError': 'Server error. Please try again later.',
};

const ES_TRANSLATIONS: TranslationMap = {
  'nav.home': 'Inicio',
  'nav.catalog': 'Empleados IA',
  'nav.pricing': 'Precios',
  'nav.dashboard': 'Panel',
  'nav.settings': 'Ajustes',
  'nav.login': 'Iniciar Sesión',
  'nav.signup': 'Registrarse',
  'nav.logout': 'Cerrar Sesión',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.loading': 'Cargando...',
  'common.error': 'Algo salió mal',
  'common.retry': 'Intentar de nuevo',
  'common.search': 'Buscar',
  'common.noResults': 'Sin resultados',
  'auth.email': 'Correo electrónico',
  'auth.password': 'Contraseña',
  'auth.login': 'Iniciar Sesión',
  'auth.signup': 'Crear Cuenta',
  'dashboard.welcome': 'Bienvenido, {name}',
  'dashboard.employees': 'Tus Empleados IA',
  'dashboard.tasks': 'Tareas Completadas',
  'workspace.send': 'Enviar',
  'workspace.typing': '{name} está pensando...',
  'workspace.inputPlaceholder': 'Escribe tu mensaje...',
  'pricing.title': 'Precios Simples y Transparentes',
  'pricing.monthly': 'Mensual',
  'pricing.annual': 'Anual',
  'pricing.startTrial': 'Prueba Gratuita',
  'pricing.currentPlan': 'Plan Actual',
  'pricing.upgrade': 'Mejorar Plan',
  'settings.title': 'Ajustes',
  'settings.theme': 'Tema',
  'settings.themeLight': 'Claro',
  'settings.themeDark': 'Oscuro',
  'settings.themeSystem': 'Sistema',
  'settings.language': 'Idioma',
  'trial.daysRemaining': '{count, plural, one {# día} other {# días}} restantes',
  'trial.expired': 'Prueba expirada',
  'error.networkOffline': 'Pareces estar sin conexión. Trabajando en modo local.',
};

const FR_TRANSLATIONS: TranslationMap = {
  'nav.home': 'Accueil',
  'nav.catalog': 'Employés IA',
  'nav.pricing': 'Tarifs',
  'nav.dashboard': 'Tableau de bord',
  'nav.settings': 'Paramètres',
  'nav.login': 'Connexion',
  'nav.signup': 'Inscription',
  'nav.logout': 'Déconnexion',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.loading': 'Chargement...',
  'common.search': 'Rechercher',
  'dashboard.welcome': 'Bienvenue, {name}',
  'workspace.send': 'Envoyer',
  'workspace.typing': '{name} réfléchit...',
  'pricing.title': 'Tarification Simple et Transparente',
  'pricing.startTrial': 'Essai Gratuit',
  'settings.theme': 'Thème',
  'settings.themeLight': 'Clair',
  'settings.themeDark': 'Sombre',
  'settings.themeSystem': 'Système',
  'settings.language': 'Langue',
  'trial.daysRemaining': '{count, plural, one {# jour} other {# jours}} restants',
};

const DE_TRANSLATIONS: TranslationMap = {
  'nav.home': 'Startseite',
  'nav.catalog': 'KI-Mitarbeiter',
  'nav.pricing': 'Preise',
  'nav.dashboard': 'Dashboard',
  'nav.settings': 'Einstellungen',
  'nav.login': 'Anmelden',
  'nav.signup': 'Registrieren',
  'common.save': 'Speichern',
  'common.cancel': 'Abbrechen',
  'common.loading': 'Laden...',
  'dashboard.welcome': 'Willkommen zurück, {name}',
  'workspace.send': 'Senden',
  'pricing.title': 'Einfache, transparente Preise',
  'pricing.startTrial': 'Kostenlos testen',
  'settings.theme': 'Design',
  'settings.themeLight': 'Hell',
  'settings.themeDark': 'Dunkel',
  'settings.themeSystem': 'System',
  'settings.language': 'Sprache',
};

const JA_TRANSLATIONS: TranslationMap = {
  'nav.home': 'ホーム',
  'nav.catalog': 'AI社員',
  'nav.pricing': '料金',
  'nav.dashboard': 'ダッシュボード',
  'nav.settings': '設定',
  'nav.login': 'ログイン',
  'nav.signup': '新規登録',
  'common.save': '保存',
  'common.cancel': 'キャンセル',
  'common.loading': '読み込み中...',
  'dashboard.welcome': 'おかえりなさい、{name}',
  'workspace.send': '送信',
  'pricing.title': 'シンプルで透明な料金体系',
  'pricing.startTrial': '無料トライアル',
  'settings.theme': 'テーマ',
  'settings.themeLight': 'ライト',
  'settings.themeDark': 'ダーク',
  'settings.themeSystem': 'システム',
  'settings.language': '言語',
};

const AR_TRANSLATIONS: TranslationMap = {
  'nav.home': 'الرئيسية',
  'nav.catalog': 'موظفو الذكاء الاصطناعي',
  'nav.pricing': 'الأسعار',
  'nav.dashboard': 'لوحة التحكم',
  'nav.settings': 'الإعدادات',
  'nav.login': 'تسجيل الدخول',
  'nav.signup': 'إنشاء حساب',
  'common.save': 'حفظ',
  'common.cancel': 'إلغاء',
  'common.loading': 'جارٍ التحميل...',
  'dashboard.welcome': 'مرحبًا بعودتك، {name}',
  'workspace.send': 'إرسال',
  'pricing.title': 'أسعار بسيطة وشفافة',
  'settings.theme': 'المظهر',
  'settings.themeLight': 'فاتح',
  'settings.themeDark': 'داكن',
  'settings.themeSystem': 'النظام',
  'settings.language': 'اللغة',
};

const TRANSLATION_BUNDLES: Record<SupportedLocale, TranslationMap> = {
  en: EN_TRANSLATIONS,
  es: ES_TRANSLATIONS,
  fr: FR_TRANSLATIONS,
  de: DE_TRANSLATIONS,
  ja: JA_TRANSLATIONS,
  ar: AR_TRANSLATIONS,
};

// ══════════════════════════════════════════════════════
// i18n Manager
// ══════════════════════════════════════════════════════

const LOCAL_LOCALE_KEY = 'nexushr_locale';

type LocaleListener = (locale: SupportedLocale) => void;

class I18nManager {
  private locale: SupportedLocale = 'en';
  private translations: TranslationMap = EN_TRANSLATIONS;
  private listeners: Set<LocaleListener> = new Set();

  init(): void {
    const saved = this.loadSavedLocale();
    this.setLocale(saved, false);
  }

  getLocale(): SupportedLocale { return this.locale; }
  getConfig(): LocaleConfig { return LOCALES[this.locale]; }
  getDirection(): 'ltr' | 'rtl' { return LOCALES[this.locale].direction; }

  setLocale(locale: SupportedLocale, persist = true): void {
    this.locale = locale;
    this.translations = { ...EN_TRANSLATIONS, ...TRANSLATION_BUNDLES[locale] };

    // Set document direction
    document.documentElement.dir = LOCALES[locale].direction;
    document.documentElement.lang = locale;

    if (persist) {
      localStorage.setItem(LOCAL_LOCALE_KEY, locale);
      this.syncToWorker(locale);
    }

    this.listeners.forEach(fn => fn(locale));
  }

  t(key: string, params?: Record<string, any>): string {
    let text = this.translations[key] || EN_TRANSLATIONS[key] || key;

    // Handle interpolation: {name}, {count}
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }

      // Handle simple pluralization: {count, plural, one {# item} other {# items}}
      text = text.replace(
        /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
        (_, paramName, one, other) => {
          const count = Number(params[paramName]);
          const template = count === 1 ? one : other;
          return template.replace(/#/g, String(count));
        }
      );
    }

    return text;
  }

  subscribe(listener: LocaleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private loadSavedLocale(): SupportedLocale {
    try {
      const saved = localStorage.getItem(LOCAL_LOCALE_KEY);
      if (saved && saved in LOCALES) return saved as SupportedLocale;
    } catch { /* fallthrough */ }

    // Detect from browser
    const browserLang = navigator.language.split('-')[0] as SupportedLocale;
    if (browserLang in LOCALES) return browserLang;
    return 'en';
  }

  private async syncToWorker(locale: SupportedLocale): Promise<void> {
    if (!isWorkerConnected()) return;
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
    } catch { /* silent fail */ }
  }
}

export const i18n = new I18nManager();

// ══════════════════════════════════════════════════════
// React Hook
// ══════════════════════════════════════════════════════

export function useI18n(): {
  locale: SupportedLocale;
  direction: 'ltr' | 'rtl';
  t: (key: string, params?: Record<string, any>) => string;
  setLocale: (locale: SupportedLocale) => void;
  locales: typeof LOCALES;
} {
  const [locale, setLocaleState] = useState<SupportedLocale>(i18n.getLocale());

  useEffect(() => {
    return i18n.subscribe(setLocaleState);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => i18n.t(key, params),
    [locale] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    locale,
    direction: LOCALES[locale].direction,
    t,
    setLocale: (l: SupportedLocale) => i18n.setLocale(l),
    locales: LOCALES,
  };
}

// ══════════════════════════════════════════════════════
// Formatting Utilities
// ══════════════════════════════════════════════════════

export function formatDate(date: Date | string, locale?: SupportedLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const loc = locale || i18n.getLocale();
  return d.toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatNumber(value: number, locale?: SupportedLocale): string {
  const loc = locale || i18n.getLocale();
  return value.toLocaleString(loc);
}

export function formatRelativeTime(date: Date | string, locale?: SupportedLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const loc = locale || i18n.getLocale();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
    if (days > 0) return rtf.format(-days, 'day');
    if (hours > 0) return rtf.format(-hours, 'hour');
    if (minutes > 0) return rtf.format(-minutes, 'minute');
    return rtf.format(-seconds, 'second');
  }

  // Fallback
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}
