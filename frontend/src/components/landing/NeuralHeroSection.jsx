/**
 * NeuralHeroSection - Stunning hero with neural network visualization
 * Shows AIDEN's learning capabilities in an immersive way
 * Supports Arabic and English localization
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Play, Brain, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { DemoWizard } from './DemoWizard';
import { LanguageToggle } from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';
import NeuralNetworkCanvas from '@/components/learning/NeuralNetworkCanvas';

// Generate demo nodes for the landing page visualization
const generateLandingNodes = () => {
  const nodes = [];
  const links = [];

  // Create central "brain" node
  nodes.push({
    id: 'brain-core',
    type: 'knowledge',
    label: 'AIDEN Core',
    value: 1.0,
  });

  // Create bot nodes around the center
  const botNames = ['Sales Bot', 'Support Bot', 'HR Assistant', 'Analytics'];
  botNames.forEach((name, i) => {
    const botId = `bot-${i}`;
    nodes.push({
      id: botId,
      type: 'bot',
      label: name,
      value: 0.8,
    });
    links.push({
      source: 'brain-core',
      target: botId,
      strength: 0.8,
    });
  });

  // Create pattern nodes
  for (let i = 0; i < 12; i++) {
    const patternId = `pattern-${i}`;
    nodes.push({
      id: patternId,
      type: 'pattern',
      label: `Pattern ${i + 1}`,
      value: 0.4 + Math.random() * 0.4,
    });

    // Link to random bot
    const botIndex = Math.floor(Math.random() * botNames.length);
    links.push({
      source: `bot-${botIndex}`,
      target: patternId,
      strength: 0.5,
    });
  }

  // Create experience nodes (smaller, more numerous)
  for (let i = 0; i < 20; i++) {
    const expId = `exp-${i}`;
    nodes.push({
      id: expId,
      type: 'experience',
      label: `Learning ${i + 1}`,
      value: 0.3 + Math.random() * 0.3,
    });

    // Link to random pattern
    const patternIndex = Math.floor(Math.random() * 12);
    links.push({
      source: `pattern-${patternIndex}`,
      target: expId,
      strength: 0.3,
    });
  }

  return { nodes, links };
};

const NeuralHeroSection = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const { t } = useTranslation('landing');
  const { isRtl } = useLanguage();

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: Math.max(800, window.innerHeight),
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const visualizationData = useMemo(() => generateLandingNodes(), []);

  const stats = [
    { icon: Zap, value: '500K+', label: t('neuralHero.stats.messages') },
    { icon: Brain, value: '<2s', label: t('neuralHero.stats.responseTime') },
    { icon: Sparkles, value: '90%', label: t('neuralHero.stats.costSavings') },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Neural Network Background */}
      <div className="absolute inset-0 z-0">
        <NeuralNetworkCanvas
          data={visualizationData}
          width={dimensions.width}
          height={dimensions.height}
          mode="ambient"
          darkMode={true}
          showLabels={false}
        />
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60" />
      </div>

      {/* Language Switcher */}
      <div className="absolute top-20 end-4 z-20">
        <LanguageToggle className="bg-white/10 text-white border-white/20 hover:bg-white/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-4 sm:px-6 pt-20 pb-12">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>{t('neuralHero.badge')}</span>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          >
            <span className="block">{t('neuralHero.headline1')}</span>
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t('neuralHero.headlineGradient')}
            </span>
            <span className="block">{t('neuralHero.headline2')}</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-4"
          >
            {t('neuralHero.subheadline')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10"
          >
            {t('neuralHero.subheadline2')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Button
              size="lg"
              asChild
              className="text-base px-8 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-xl shadow-purple-500/30 border-0"
            >
              <Link to="/register">
                {t('neuralHero.cta')}
                <ArrowRight className={`${isRtl ? 'me-2 rotate-180' : 'ms-2'} w-5 h-5`} />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 h-14 border-white/30 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
              onClick={() => setIsDemoOpen(true)}
            >
              <Play className={`${isRtl ? 'ms-2' : 'me-2'} w-5 h-5`} />
              {t('neuralHero.watchDemo')}
            </Button>
          </motion.div>

          {/* Trust Line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm text-slate-500 mb-10"
          >
            {t('neuralHero.trustLine')}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="text-center p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <Icon className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400">{stat.label}</div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </motion.div>
        </motion.div>
      </div>

      {/* Demo Wizard Modal */}
      <DemoWizard isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </section>
  );
};

export default NeuralHeroSection;
