import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isRTL, LANGUAGES } from '../i18n';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [isRtl, setIsRtl] = useState(isRTL(i18n.language || 'en'));

  useEffect(() => {
    // Listen for language changes
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng);
      setIsRtl(isRTL(lng));

      // Update HTML attributes
      document.documentElement.dir = isRTL(lng) ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;

      // Add/remove RTL class for custom styling
      if (isRTL(lng)) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    };

    // Set initial state
    handleLanguageChange(i18n.language || 'en');

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'ar' : 'en';
    changeLanguage(newLang);
  };

  const value = {
    currentLanguage,
    isRtl,
    languages: LANGUAGES,
    changeLanguage,
    toggleLanguage,
    t: i18n.t.bind(i18n)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
