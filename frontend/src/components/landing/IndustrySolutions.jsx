import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  ShoppingCart,
  Heart,
  GraduationCap,
  Scale,
  Building2,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

const getIndustries = (t) => [
  {
    id: 'saas',
    name: t('industries.saas.name'),
    icon: Monitor,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-100',
    activeColor: 'bg-blue-600',
    metric: t('industries.saas.metric'),
    description: t('industries.saas.description'),
    useCases: t('industries.saas.useCases', { returnObjects: true }),
    testimonial: {
      quote: t('industries.saas.testimonial.quote'),
      author: t('industries.saas.testimonial.author'),
      role: t('industries.saas.testimonial.role'),
    },
  },
  {
    id: 'ecommerce',
    name: t('industries.ecommerce.name'),
    icon: ShoppingCart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-100',
    activeColor: 'bg-green-600',
    metric: t('industries.ecommerce.metric'),
    description: t('industries.ecommerce.description'),
    useCases: t('industries.ecommerce.useCases', { returnObjects: true }),
    testimonial: {
      quote: t('industries.ecommerce.testimonial.quote'),
      author: t('industries.ecommerce.testimonial.author'),
      role: t('industries.ecommerce.testimonial.role'),
    },
  },
  {
    id: 'healthcare',
    name: t('industries.healthcare.name'),
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverColor: 'hover:bg-red-100',
    activeColor: 'bg-red-600',
    metric: t('industries.healthcare.metric'),
    description: t('industries.healthcare.description'),
    useCases: t('industries.healthcare.useCases', { returnObjects: true }),
    testimonial: {
      quote: t('industries.healthcare.testimonial.quote'),
      author: t('industries.healthcare.testimonial.author'),
      role: t('industries.healthcare.testimonial.role'),
    },
  },
  {
    id: 'education',
    name: t('industries.education.name'),
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:bg-purple-100',
    activeColor: 'bg-purple-600',
    metric: t('industries.education.metric'),
    description: t('industries.education.description'),
    useCases: t('industries.education.useCases', { returnObjects: true }),
    testimonial: {
      quote: t('industries.education.testimonial.quote'),
      author: t('industries.education.testimonial.author'),
      role: t('industries.education.testimonial.role'),
    },
  },
  {
    id: 'legal',
    name: t('industries.legal.name'),
    icon: Scale,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverColor: 'hover:bg-amber-100',
    activeColor: 'bg-amber-600',
    metric: t('industries.legal.metric'),
    description: t('industries.legal.description'),
    useCases: t('industries.legal.useCases', { returnObjects: true }),
    testimonial: {
      quote: t('industries.legal.testimonial.quote'),
      author: t('industries.legal.testimonial.author'),
      role: t('industries.legal.testimonial.role'),
    },
  },
  {
    id: 'finance',
    name: t('industries.finance.name'),
    icon: Building2,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    hoverColor: 'hover:bg-cyan-100',
    activeColor: 'bg-cyan-600',
    metric: t('industries.finance.metric'),
    description: t('industries.finance.description'),
    useCases: t('industries.finance.useCases', { returnObjects: true }),
    testimonial: {
      quote: t('industries.finance.testimonial.quote'),
      author: t('industries.finance.testimonial.author'),
      role: t('industries.finance.testimonial.role'),
    },
  },
];

const IndustrySolutions = () => {
  const { t } = useTranslation('landing');
  const { isRtl } = useLanguage();
  const industries = getIndustries(t);
  const [selectedIndustry, setSelectedIndustry] = useState(industries[0]);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t('industries.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('industries.subtitle')}
            </p>
          </motion.div>
        </div>

        {/* Industry Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {industries.map((industry) => {
            const Icon = industry.icon;
            const isSelected = selectedIndustry.id === industry.id;

            return (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry)}
                className={`
                  flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300
                  border-2 ${industry.borderColor}
                  ${
                    isSelected
                      ? `${industry.activeColor} text-white shadow-lg scale-105`
                      : `${industry.bgColor} ${industry.color} ${industry.hoverColor}`
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isRtl ? 'ms-2' : 'me-2'}`} />
                {industry.name}
              </button>
            );
          })}
        </motion.div>

        {/* Industry Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndustry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid lg:grid-cols-2 gap-12 items-start"
          >
            {/* Left Side - Industry Details */}
            <div>
              <div className={`inline-flex items-center ${selectedIndustry.bgColor} ${selectedIndustry.color} px-4 py-2 rounded-full font-semibold mb-6`}>
                {selectedIndustry.metric}
              </div>

              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                {t('industries.solutions', { name: selectedIndustry.name })}
              </h3>

              <p className="text-lg text-gray-600 mb-8">
                {selectedIndustry.description}
              </p>

              <div className="space-y-4 mb-8">
                <h4 className="text-xl font-bold text-gray-900">{t('industries.useCases')}</h4>
                {selectedIndustry.useCases.map((useCase, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start"
                  >
                    <div className={`${selectedIndustry.bgColor} ${selectedIndustry.color} rounded-full p-1 me-3 mt-0.5`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-gray-700">{useCase}</span>
                  </motion.div>
                ))}
              </div>

              <button
                className={`
                  ${selectedIndustry.activeColor} text-white font-bold py-4 px-8 rounded-xl
                  shadow-lg hover:shadow-xl transition-all duration-300
                  flex items-center group
                `}
              >
                {t('industries.seeDemo', { name: selectedIndustry.name })}
                <ArrowRight className={`w-5 h-5 ${isRtl ? 'me-2 rotate-180' : 'ms-2'} group-hover:translate-x-1 transition-transform duration-300`} />
              </button>
            </div>

            {/* Right Side - Testimonial */}
            <div className={`${selectedIndustry.bgColor} rounded-2xl p-8 border-2 ${selectedIndustry.borderColor}`}>
              <div className="mb-6">
                <svg className={`w-12 h-12 ${selectedIndustry.color} opacity-50`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              <blockquote className="text-lg text-gray-700 mb-6 leading-relaxed">
                "{selectedIndustry.testimonial.quote}"
              </blockquote>

              <div className="flex items-center">
                <div className={`${selectedIndustry.activeColor} text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-4`}>
                  {selectedIndustry.testimonial.author
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="font-bold text-gray-900">
                    {selectedIndustry.testimonial.author}
                  </div>
                  <div className="text-gray-600">
                    {selectedIndustry.testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default IndustrySolutions;
