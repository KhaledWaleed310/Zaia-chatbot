import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Play, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import { DemoWizard } from './DemoWizard';
import { LanguageToggle } from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

const HeroSection = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const { t } = useTranslation('landing');
  const { isRtl } = useLanguage();

  const stats = [
    { value: 500000, suffix: '+', label: t('hero.stats.messages') },
    { value: 2, prefix: '<', suffix: 's', label: t('hero.stats.responseTime') },
    { value: 90, suffix: '%', label: t('hero.stats.costSavings') },
  ];

  return (
    <section className="pt-28 pb-16 sm:pt-32 sm:pb-24 bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden relative">
      {/* Language Switcher - Fixed position top right */}
      <div className="absolute top-4 end-4 z-20">
        <LanguageToggle className="bg-white/90 text-gray-700 border-gray-200 hover:bg-gray-100" />
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -end-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -start-40 w-80 h-80 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center">
          {/* MENA Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-blue-200 bg-white/80 backdrop-blur">
              <Globe className={`w-4 h-4 ${isRtl ? 'ms-2' : 'me-2'} text-blue-600`} />
              {t('hero.badge')}
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {t('hero.headline')}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('hero.headlineHighlight')}
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-4"
            dangerouslySetInnerHTML={{ __html: t('hero.subheadline') }}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-8"
          >
            {t('hero.subheadline2')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
          >
            <Button size="lg" asChild className="text-base px-8 h-12 shadow-lg shadow-blue-500/25">
              <Link to="/register">
                {t('hero.cta')}
                <ArrowRight className={`${isRtl ? 'me-2 rotate-180' : 'ms-2'} w-5 h-5`} />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 h-12 group"
              onClick={() => setIsDemoOpen(true)}
            >
              <Play className={`${isRtl ? 'ms-2' : 'me-2'} w-5 h-5 group-hover:text-blue-600 transition-colors`} />
              {t('hero.watchDemo')}
            </Button>
          </motion.div>

          {/* Trust Line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-sm text-gray-500 mb-8"
            dangerouslySetInnerHTML={{ __html: t('hero.trustLine') }}
          />

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-4 rounded-2xl bg-white/80 backdrop-blur shadow-sm border border-gray-100"
              >
                <div className="text-2xl sm:text-4xl font-bold text-blue-600 mb-1">
                  {stat.prefix}
                  <AnimatedCounter end={stat.value} duration={2} />
                  {stat.suffix}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Demo Wizard Modal */}
      <DemoWizard isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </section>
  );
};

export default HeroSection;
