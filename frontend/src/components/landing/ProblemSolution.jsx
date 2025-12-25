import { XCircle, CheckCircle, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import AnimatedSection from './AnimatedSection';

const ProblemSolution = () => {
  const { t } = useTranslation('landing');
  const { isRtl } = useLanguage();

  const problems = t('problemSolution.problems', { returnObjects: true });
  const solutions = t('problemSolution.solutions', { returnObjects: true });

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('problemSolution.title')}
            </h2>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Problems */}
          <AnimatedSection direction={isRtl ? 'right' : 'left'}>
            <div className="bg-red-50 rounded-3xl p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-red-900">
                  {t('problemSolution.problemTitle')}
                </h3>
              </div>

              <ul className="space-y-4">
                {problems.map((problem, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3"
                  >
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{problem}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          {/* Solutions */}
          <AnimatedSection direction={isRtl ? 'left' : 'right'}>
            <div className="bg-green-50 rounded-3xl p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-900">
                  {t('problemSolution.solutionTitle')}
                </h3>
              </div>

              <ul className="space-y-4">
                {solutions.map((solution, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{solution}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </AnimatedSection>
        </div>

        {/* Transition Arrow */}
        <AnimatedSection>
          <div className="flex justify-center mt-12">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-gray-300"
            >
              <ArrowDown className="w-8 h-8" />
            </motion.div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default ProblemSolution;
