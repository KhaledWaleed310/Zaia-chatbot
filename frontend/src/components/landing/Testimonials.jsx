import { Star, Quote, Users, Globe, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedSection from './AnimatedSection';
import AnimatedCounter from './AnimatedCounter';

const Testimonials = () => {
  const { t } = useTranslation('landing');

  const testimonials = [
    {
      quote: t('testimonials.items.hotel.quote'),
      author: t('testimonials.items.hotel.author'),
      role: t('testimonials.items.hotel.role'),
      company: t('testimonials.items.hotel.company'),
      avatar: null,
      rating: 5,
    },
    {
      quote: t('testimonials.items.ecommerce.quote'),
      author: t('testimonials.items.ecommerce.author'),
      role: t('testimonials.items.ecommerce.role'),
      company: t('testimonials.items.ecommerce.company'),
      avatar: null,
      rating: 5,
    },
    {
      quote: t('testimonials.items.realestate.quote'),
      author: t('testimonials.items.realestate.author'),
      role: t('testimonials.items.realestate.role'),
      company: t('testimonials.items.realestate.company'),
      avatar: null,
      rating: 5,
    },
  ];

  const stats = [
    { value: 1000, suffix: '+', label: t('testimonials.stats.businesses'), icon: Users },
    { value: 15, suffix: '+', label: t('testimonials.stats.countries'), icon: Globe },
    { value: 4.9, suffix: '', label: t('testimonials.stats.rating'), icon: Award, decimals: 1 },
  ];

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('testimonials.subtitle')}
            </p>
          </div>
        </AnimatedSection>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  {/* Quote Icon */}
                  <div className="mb-4">
                    <Quote className="w-8 h-8 text-blue-200" />
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Quote Text */}
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.avatar ? (
                        <img src={testimonial.avatar} alt={testimonial.author} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(testimonial.author)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                      <p className="text-sm text-blue-600">{testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats Bar */}
        <AnimatedSection>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 sm:p-12">
            <div className="grid grid-cols-3 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-3">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                    <AnimatedCounter
                      end={stat.value}
                      duration={2}
                      suffix={stat.suffix}
                      decimals={stat.decimals || 0}
                    />
                  </div>
                  <div className="text-blue-100 text-sm sm:text-base">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default Testimonials;
