import { Upload, Brain, Rocket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import AnimatedSection from './AnimatedSection';

const HowItWorks = () => {
  const { t } = useTranslation('landing');
  const { isRtl } = useLanguage();

  const steps = [
    {
      number: '1',
      icon: Upload,
      title: t('howItWorks.steps.upload.title'),
      description: t('howItWorks.steps.upload.description'),
      color: 'blue',
    },
    {
      number: '2',
      icon: Brain,
      title: t('howItWorks.steps.learn.title'),
      description: t('howItWorks.steps.learn.description'),
      color: 'purple',
    },
    {
      number: '3',
      icon: Rocket,
      title: t('howItWorks.steps.live.title'),
      description: t('howItWorks.steps.live.description'),
      color: 'green',
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-blue-600',
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      border: 'border-purple-200',
      gradient: 'from-purple-500 to-purple-600',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      border: 'border-green-200',
      gradient: 'from-green-500 to-green-600',
    },
  };

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>
        </AnimatedSection>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (desktop) */}
          <div className="hidden md:block absolute top-24 start-[16.5%] end-[16.5%] h-0.5 bg-gray-200" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <AnimatedSection key={index} direction="up">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="relative text-center"
                >
                  {/* Step Number */}
                  <div className="relative z-10 mx-auto mb-6">
                    <div className={`w-16 h-16 ${colorClasses[step.color].bg} rounded-2xl flex items-center justify-center mx-auto shadow-lg`}>
                      <step.icon className={`w-8 h-8 ${colorClasses[step.color].text}`} />
                    </div>
                    <div className={`absolute -top-2 -end-2 w-8 h-8 bg-gradient-to-br ${colorClasses[step.color].gradient} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>

                  {/* Arrow (mobile) */}
                  {index < steps.length - 1 && (
                    <div className="md:hidden flex justify-center my-6">
                      <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />
                    </div>
                  )}
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>

        {/* Demo CTA */}
        <AnimatedSection>
          <div className="mt-16 text-center">
            <div className="inline-block bg-white rounded-2xl shadow-lg p-8 border">
              <p className="text-gray-600 mb-4">{t('howItWorks.seeAction')}</p>
              <Button size="lg" variant="outline" className="group" asChild>
                <a href="#demo">
                  {t('howItWorks.tryDemo')}
                  <ArrowRight className={`${isRtl ? 'me-2 rotate-180' : 'ms-2'} w-5 h-5 group-hover:translate-x-1 transition-transform`} />
                </a>
              </Button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default HowItWorks;
