import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

// Compact toggle version (for header/navbar)
export const LanguageToggle = ({ className }) => {
  const { currentLanguage, toggleLanguage, isRtl } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-white/10 hover:bg-white/20 backdrop-blur-sm',
        'border border-white/20 transition-all duration-200',
        'text-sm font-medium',
        className
      )}
      aria-label={`Switch to ${currentLanguage === 'en' ? 'Arabic' : 'English'}`}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">
        {currentLanguage === 'en' ? 'العربية' : 'English'}
      </span>
      <span className="sm:hidden">
        {currentLanguage === 'en' ? 'ع' : 'EN'}
      </span>
    </button>
  );
};

// Dropdown version (for footer/settings)
export const LanguageDropdown = ({ className, variant = 'default' }) => {
  const { currentLanguage, languages, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const variants = {
    default: {
      button: 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700',
      dropdown: 'bg-white border border-gray-200 shadow-lg',
      item: 'hover:bg-gray-50',
      itemActive: 'bg-blue-50 text-blue-700'
    },
    dark: {
      button: 'bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-200',
      dropdown: 'bg-gray-800 border border-gray-700 shadow-xl',
      item: 'hover:bg-gray-700 text-gray-300',
      itemActive: 'bg-blue-900/50 text-blue-400'
    },
    transparent: {
      button: 'bg-white/10 border border-white/20 hover:bg-white/20 text-white backdrop-blur-sm',
      dropdown: 'bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl',
      item: 'hover:bg-gray-50 text-gray-700',
      itemActive: 'bg-blue-50 text-blue-700'
    }
  };

  const styles = variants[variant] || variants.default;

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
          styles.button
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{currentLang.nativeName}</span>
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full mt-2 end-0 min-w-[160px] rounded-lg overflow-hidden z-50',
              styles.dropdown
            )}
            role="listbox"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                  styles.item,
                  currentLanguage === lang.code && styles.itemActive
                )}
                role="option"
                aria-selected={currentLanguage === lang.code}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex-1 text-start">
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-xs opacity-60">{lang.name}</div>
                </div>
                {currentLanguage === lang.code && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Simple text link version (for minimal UI)
export const LanguageLink = ({ className }) => {
  const { currentLanguage, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'text-sm font-medium hover:underline transition-colors',
        className
      )}
      aria-label={`Switch to ${currentLanguage === 'en' ? 'Arabic' : 'English'}`}
    >
      {currentLanguage === 'en' ? 'العربية' : 'English'}
    </button>
  );
};

// Default export is the dropdown
export default LanguageDropdown;
