import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingDown, DollarSign, Users, MessageSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

const ROICalculator = () => {
  const { t } = useTranslation('landing');
  const { isRtl } = useLanguage();
  const [teamSize, setTeamSize] = useState(10);
  const [ticketsPerMonth, setTicketsPerMonth] = useState(1000);
  const [costPerTicket, setCostPerTicket] = useState(15);

  // Calculate savings
  const monthlySavings = Math.round(ticketsPerMonth * 0.8 * costPerTicket);
  const yearlySavings = monthlySavings * 12;
  const hoursSaved = Math.round(ticketsPerMonth * 0.8 * 0.25);

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Calculator className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t('roi.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('roi.subtitle')}
            </p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Calculator Inputs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-8">{t('roi.yourNumbers')}</h3>

            {/* Team Size Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center text-gray-700 font-medium">
                  <Users className={`w-5 h-5 ${isRtl ? 'ms-2' : 'me-2'} text-blue-600`} />
                  {t('roi.teamSize')}
                </label>
                <span className="text-2xl font-bold text-blue-600">{teamSize}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            {/* Tickets Per Month Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center text-gray-700 font-medium">
                  <MessageSquare className={`w-5 h-5 ${isRtl ? 'ms-2' : 'me-2'} text-blue-600`} />
                  {t('roi.ticketsPerMonth')}
                </label>
                <span className="text-2xl font-bold text-blue-600">
                  {ticketsPerMonth.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={ticketsPerMonth}
                onChange={(e) => setTicketsPerMonth(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100</span>
                <span>10,000</span>
              </div>
            </div>

            {/* Cost Per Ticket Slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center text-gray-700 font-medium">
                  <DollarSign className={`w-5 h-5 ${isRtl ? 'ms-2' : 'me-2'} text-blue-600`} />
                  {t('roi.costPerTicket')}
                </label>
                <span className="text-2xl font-bold text-blue-600">${costPerTicket}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={costPerTicket}
                onChange={(e) => setCostPerTicket(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$5</span>
                <span>$50</span>
              </div>
            </div>
          </motion.div>

          {/* Results Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-8 text-white"
          >
            <div className="flex items-center mb-6">
              <TrendingDown className={`w-8 h-8 ${isRtl ? 'ms-3' : 'me-3'}`} />
              <h3 className="text-2xl font-bold">{t('roi.potentialSavings')}</h3>
            </div>

            <div className="space-y-6 mb-8">
              {/* Monthly Savings */}
              <motion.div
                key={monthlySavings}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-100 font-medium">{t('roi.monthlySavings')}</span>
                  <DollarSign className="w-5 h-5 text-green-100" />
                </div>
                <div className="text-4xl font-bold">
                  ${monthlySavings.toLocaleString()}
                </div>
              </motion.div>

              {/* Yearly Savings */}
              <motion.div
                key={yearlySavings}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-100 font-medium">{t('roi.yearlySavings')}</span>
                  <DollarSign className="w-5 h-5 text-green-100" />
                </div>
                <div className="text-4xl font-bold">
                  ${yearlySavings.toLocaleString()}
                </div>
              </motion.div>

              {/* Hours Saved */}
              <motion.div
                key={hoursSaved}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-100 font-medium">{t('roi.hoursSaved')}</span>
                  <TrendingDown className="w-5 h-5 text-green-100" />
                </div>
                <div className="text-4xl font-bold">
                  {hoursSaved.toLocaleString()}h
                </div>
              </motion.div>
            </div>

            {/* CTA Button */}
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white text-green-600 font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center justify-center group"
              >
                {t('roi.startSaving')}
                <ArrowRight className={`w-5 h-5 ${isRtl ? 'me-2 rotate-180' : 'ms-2'} group-hover:translate-x-1 transition-transform duration-300`} />
              </motion.button>
            </Link>

            <p className="text-center text-green-100 text-sm mt-4">
              {t('roi.noCreditCard')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ROICalculator;
