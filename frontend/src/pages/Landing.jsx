import { Link } from 'react-router-dom';
import { Bot, Menu, X, ArrowRight, Check, Sparkles, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { marketing } from '@/utils/api';
import { trackEvent, EVENTS } from '@/utils/tracking';

// Landing page sections
import HeroSection from '@/components/landing/HeroSection';
import ProblemSolution from '@/components/landing/ProblemSolution';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import IndustrySolutions from '@/components/landing/IndustrySolutions';
import ROICalculator from '@/components/landing/ROICalculator';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import TrustSection from '@/components/landing/TrustSection';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import IntegrationsHub from '@/components/landing/IntegrationsHub';

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentLanguage, toggleLanguage } = useLanguage();

  // Track landing page view
  useEffect(() => {
    trackEvent(EVENTS.LANDING_VIEW, { language: currentLanguage });
  }, []);

  // Track CTA clicks
  const handleCtaClick = (ctaName, destination) => {
    trackEvent(EVENTS.CTA_CLICKED, { cta: ctaName, destination });
  };

  // Inject marketing tracking codes
  useEffect(() => {
    const injectTrackingCodes = async () => {
      try {
        const response = await marketing.getEmbedCodes();
        const { head_code, body_code, enabled } = response.data;

        if (!enabled) return;

        // Inject head code
        if (head_code) {
          const headScript = document.createElement('div');
          headScript.id = 'marketing-head-tracking';
          headScript.innerHTML = head_code;

          // Move script tags to actually execute
          const scripts = headScript.querySelectorAll('script');
          scripts.forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
              newScript.src = script.src;
              newScript.async = script.async;
            } else {
              newScript.textContent = script.textContent;
            }
            document.head.appendChild(newScript);
          });

          // Add non-script elements
          const nonScripts = headScript.querySelectorAll(':not(script)');
          nonScripts.forEach(el => {
            document.head.appendChild(el.cloneNode(true));
          });
        }

        // Inject body code
        if (body_code) {
          const bodyDiv = document.createElement('div');
          bodyDiv.id = 'marketing-body-tracking';
          bodyDiv.innerHTML = body_code;
          document.body.appendChild(bodyDiv);
        }
      } catch (err) {
        // Silently fail - tracking is optional
        console.debug('Marketing tracking not configured');
      }
    };

    injectTrackingCodes();

    // Cleanup on unmount
    return () => {
      const headTracking = document.getElementById('marketing-head-tracking');
      const bodyTracking = document.getElementById('marketing-body-tracking');
      if (headTracking) headTracking.remove();
      if (bodyTracking) bodyTracking.remove();
    };
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Aiden Link</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm font-medium"
                aria-label={currentLanguage === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              >
                <Globe className="w-4 h-4" />
                <span>{currentLanguage === 'en' ? 'ع' : 'EN'}</span>
              </button>
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Button asChild size="sm" className="shadow-sm">
                <Link to="/register" onClick={() => handleCtaClick('nav_free_trial', '/register')}>
                  Start Free Trial
                  <ArrowRight className="ms-1 w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden py-4 border-t"
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-gray-600 hover:text-gray-900 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-4 border-t flex flex-col gap-3">
                  {/* Language Toggle - Mobile */}
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                  >
                    <Globe className="w-5 h-5" />
                    <span>{currentLanguage === 'en' ? 'العربية' : 'English'}</span>
                  </button>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Button asChild className="w-full">
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                      Start Free Trial
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Problem → Solution */}
      <ProblemSolution />

      {/* How It Works */}
      <HowItWorks />

      {/* Features */}
      <Features />

      {/* Industry Solutions */}
      <IndustrySolutions />

      {/* Integrations */}
      <IntegrationsHub />

      {/* ROI Calculator */}
      <ROICalculator />

      {/* Testimonials */}
      <Testimonials />

      {/* Pricing */}
      <Pricing />

      {/* Trust & Security */}
      <TrustSection />

      {/* FAQ */}
      <FAQ />

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm font-medium">Limited Time: 20% off yearly plans</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your
              <br />Customer Support?
            </h2>

            <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join 1,000+ businesses in the MENA region saving time and money with AI-powered support.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="text-base shadow-xl hover:shadow-2xl transition-shadow"
              >
                <Link to="/register" onClick={() => handleCtaClick('footer_free_trial', '/register')}>
                  Start Your Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-base border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <a href="mailto:sales@aidenlink.cloud" onClick={() => handleCtaClick('demo_request', 'email')}>
                  Schedule a Demo
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-blue-100 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Landing;
