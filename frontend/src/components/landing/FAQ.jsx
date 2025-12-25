import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedSection from './AnimatedSection';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const { t } = useTranslation('landing');

  const faqs = [
    {
      question: t('faq.items.setup.question'),
      answer: t('faq.items.setup.answer'),
    },
    {
      question: t('faq.items.arabic.question'),
      answer: t('faq.items.arabic.answer'),
    },
    {
      question: t('faq.items.trial.question'),
      answer: t('faq.items.trial.answer'),
    },
    {
      question: t('faq.items.handoff.question'),
      answer: t('faq.items.handoff.answer'),
    },
    {
      question: t('faq.items.security.question'),
      answer: t('faq.items.security.answer'),
    },
    {
      question: t('faq.items.unanswered.question'),
      answer: t('faq.items.unanswered.answer'),
    },
    {
      question: t('faq.items.customize.question'),
      answer: t('faq.items.customize.answer'),
    },
    {
      question: t('faq.items.refund.question'),
      answer: t('faq.items.refund.answer'),
    },
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6">
              <HelpCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('faq.title')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('faq.subtitle')}
            </p>
          </div>
        </AnimatedSection>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <AnimatedSection>
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-2">{t('faq.contactCta')}</p>
            <a
              href="mailto:support@aidenlink.cloud"
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              {t('faq.contactLink')}
            </a>
          </div>
        </AnimatedSection>
      </div>

      {/* FAQ Schema for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        })
      }} />
    </section>
  );
};

export default FAQ;
