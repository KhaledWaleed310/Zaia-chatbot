import { Brain, Moon, Users, Calendar, BarChart3, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedSection from './AnimatedSection';

const Features = () => {
  const { t } = useTranslation('landing');

  const features = [
    {
      icon: Brain,
      title: t('features.items.memory.title'),
      description: t('features.items.memory.description'),
      color: 'blue',
      highlight: t('features.items.memory.badge'),
    },
    {
      icon: Moon,
      title: t('features.items.bilingual.title'),
      description: t('features.items.bilingual.description'),
      color: 'indigo',
      highlight: t('features.items.bilingual.badge'),
    },
    {
      icon: Users,
      title: t('features.items.handoff.title'),
      description: t('features.items.handoff.description'),
      color: 'purple',
      highlight: t('features.items.handoff.badge'),
    },
    {
      icon: Calendar,
      title: t('features.items.booking.title'),
      description: t('features.items.booking.description'),
      color: 'green',
      highlight: t('features.items.booking.badge'),
    },
    {
      icon: BarChart3,
      title: t('features.items.leads.title'),
      description: t('features.items.leads.description'),
      color: 'orange',
      highlight: t('features.items.leads.badge'),
    },
    {
      icon: Shield,
      title: t('features.items.security.title'),
      description: t('features.items.security.description'),
      color: 'cyan',
      highlight: t('features.items.security.badge'),
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      badge: 'bg-green-50 text-green-700 border-green-200',
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-600',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    cyan: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-600',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
  };

  return (
    <section id="features" className="py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-gray-100 group">
                <CardContent className="p-6">
                  {/* Icon */}
                  <div className={`w-14 h-14 ${colorClasses[feature.color].bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-7 h-7 ${colorClasses[feature.color].text}`} />
                  </div>

                  {/* Badge */}
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border mb-3 ${colorClasses[feature.color].badge}`}>
                    {feature.highlight}
                  </span>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
