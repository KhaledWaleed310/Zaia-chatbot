import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Clock,
  TrendingDown,
  ArrowRight,
  Check,
  Globe,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const benefits = [
    {
      icon: TrendingDown,
      stat: '80%',
      title: 'Cost Reduction',
      description: 'Automate responses to common questions and reduce your support team workload dramatically.',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Clock,
      stat: '24/7',
      title: 'Always Available',
      description: 'Your AI assistant works round the clock with instant responses. Never miss a customer query.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Zap,
      stat: '5 min',
      title: 'Quick Setup',
      description: 'Upload your docs, customize the look, and embed anywhere. Works on any website.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const pricingTiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for testing',
      features: [
        '100 messages/month',
        '1 chatbot',
        '10 document uploads',
        'Basic customization',
        'Email support',
      ],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'Best for businesses',
      features: [
        'Unlimited messages',
        '5 chatbots',
        'Unlimited documents',
        'All integrations',
        'Custom branding',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large teams',
      features: [
        'Everything in Pro',
        'Unlimited chatbots',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Aiden</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#benefits" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Benefits
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Pricing
              </a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Sign In
              </Link>
              <Button asChild size="sm">
                <Link to="/register">
                  Start Free Trial
                </Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-4">
                <a href="#benefits" className="text-gray-600 hover:text-gray-900 font-medium">
                  Benefits
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">
                  Pricing
                </a>
                <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                  Sign In
                </Link>
                <Button asChild className="w-full">
                  <Link to="/register">Start Free Trial</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 sm:pt-32 sm:pb-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="secondary" className="mb-6">
            Trusted by 1,000+ businesses
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Turn Your Docs Into
            <br />
            <span className="text-blue-600">24/7 Support Magic</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Save 80% on support costs with AI that actually understands your business.
            Setup in 5 minutes. No coding required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild className="text-base">
              <Link to="/register">
                Start Free 14-Day Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <a href="#pricing">View Pricing</a>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600">1,000+</div>
              <div className="text-sm text-gray-600">Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600">500K+</div>
              <div className="text-sm text-gray-600">Conversations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600">&lt;2s</div>
              <div className="text-sm text-gray-600">Response Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Businesses Choose Aiden
            </h2>
            <p className="text-lg text-gray-600">
              Transform your customer support with AI-powered conversations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <div className={`w-16 h-16 ${benefit.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                  </div>
                  <div className={`text-4xl font-bold ${benefit.color} mb-2`}>
                    {benefit.stat}
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={`relative ${tier.highlighted ? 'border-2 border-blue-600 shadow-xl' : ''}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && <span className="text-gray-600">{tier.period}</span>}
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full"
                    variant={tier.highlighted ? 'default' : 'outline'}
                  >
                    <Link to="/register">{tier.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Support?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8">
            Join 1,000+ businesses saving time and money with AI-powered support.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-base">
            <Link to="/register">
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <p className="text-sm text-blue-200 mt-4">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">Aiden</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <Link to="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
              <a href="mailto:info@zaiasystems.com" className="hover:text-gray-900">Contact</a>
            </div>
            <p className="text-sm text-gray-500">
              &copy; 2024 ZAIA Systems
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
