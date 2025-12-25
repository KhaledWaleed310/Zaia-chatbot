import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedSection from './AnimatedSection';

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { t } = useTranslation('landing');

  const pricingTiers = [
    {
      name: t('pricing.tiers.free.name'),
      description: t('pricing.tiers.free.description'),
      monthlyPrice: 0,
      yearlyPrice: 0,
      period: t('pricing.forever'),
      features: t('pricing.tiers.free.features', { returnObjects: true }),
      cta: t('pricing.tiers.free.cta'),
      ctaLink: '/register',
      highlighted: false,
      badge: null,
    },
    {
      name: t('pricing.tiers.pro.name'),
      description: t('pricing.tiers.pro.description'),
      monthlyPrice: 29,
      yearlyPrice: 23,
      period: t('pricing.perMonth'),
      features: t('pricing.tiers.pro.features', { returnObjects: true }),
      cta: t('pricing.tiers.pro.cta'),
      ctaLink: '/register',
      highlighted: true,
      badge: t('pricing.tiers.pro.badge'),
    },
    {
      name: t('pricing.tiers.business.name'),
      description: t('pricing.tiers.business.description'),
      monthlyPrice: 99,
      yearlyPrice: 79,
      period: t('pricing.perMonth'),
      features: t('pricing.tiers.business.features', { returnObjects: true }),
      cta: t('pricing.tiers.business.cta'),
      ctaLink: '/register',
      highlighted: false,
      badge: t('pricing.tiers.business.badge'),
    },
    {
      name: t('pricing.tiers.enterprise.name'),
      description: t('pricing.tiers.enterprise.description'),
      monthlyPrice: null,
      yearlyPrice: null,
      period: '',
      features: t('pricing.tiers.enterprise.features', { returnObjects: true }),
      cta: t('pricing.tiers.enterprise.cta'),
      ctaLink: 'mailto:sales@aidenlink.cloud',
      highlighted: false,
      badge: null,
    },
  ];

  const getDisplayPrice = (tier) => {
    if (tier.monthlyPrice === null) return 'Custom';
    if (tier.monthlyPrice === 0) return '$0';
    return `$${isYearly ? tier.yearlyPrice : tier.monthlyPrice}`;
  };

  const getSavings = (tier) => {
    if (!isYearly || tier.monthlyPrice === null || tier.monthlyPrice === 0) return null;
    const monthlyCost = tier.monthlyPrice * 12;
    const yearlyCost = tier.yearlyPrice * 12;
    const savings = monthlyCost - yearlyCost;
    return savings;
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {t('pricing.subtitle')}
            </p>

            {/* Yearly Toggle */}
            <div className="inline-flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-sm border">
              <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                {t('pricing.monthly')}
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                {t('pricing.yearly')}
              </span>
              {isYearly && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  {t('pricing.savePercent')}
                </Badge>
              )}
            </div>
          </div>
        </AnimatedSection>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={tier.highlighted ? 'lg:-mt-4 lg:mb-4' : ''}
            >
              <Card
                className={`relative h-full flex flex-col ${
                  tier.highlighted
                    ? 'border-2 border-blue-600 shadow-xl shadow-blue-100'
                    : 'border-gray-200'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={tier.highlighted ? 'bg-blue-600' : 'bg-gray-800'}>
                      {tier.badge === 'Most Popular' && <Sparkles className="w-3 h-3 mr-1" />}
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>

                  <div className="mt-4">
                    <span className="text-4xl font-bold">{getDisplayPrice(tier)}</span>
                    {tier.period && tier.monthlyPrice !== null && (
                      <span className="text-gray-600">{tier.period}</span>
                    )}
                  </div>

                  {getSavings(tier) && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      Save ${getSavings(tier)}/year
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    asChild
                    className="w-full"
                    variant={tier.highlighted ? 'default' : 'outline'}
                    size="lg"
                  >
                    {tier.ctaLink.startsWith('mailto') ? (
                      <a href={tier.ctaLink}>{tier.cta}</a>
                    ) : (
                      <Link to={tier.ctaLink}>{tier.cta}</Link>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust Line */}
        <AnimatedSection>
          <div className="mt-12 text-center">
            <p className="text-gray-600">
              <span className="font-medium">{t('pricing.allPlansInclude')}</span> {t('pricing.trustFeatures')}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {t('pricing.moneyBack')}
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default Pricing;
