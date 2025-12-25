import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Twitter, Linkedin, Youtube, Mail, MapPin, Phone } from 'lucide-react';
import { LanguageDropdown } from '@/components/shared/LanguageSwitcher';

const Footer = () => {
  const { t } = useTranslation('landing');
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: {
      title: t('footer.sections.product.title'),
      links: [
        { label: t('footer.sections.product.features'), href: '#features' },
        { label: t('footer.sections.product.pricing'), href: '#pricing' },
        { label: t('footer.sections.product.integrations'), href: '#integrations' },
        { label: t('footer.sections.product.roiCalculator'), href: '#roi' },
        { label: t('footer.sections.product.demo'), href: '#demo' },
      ],
    },
    company: {
      title: t('footer.sections.company.title'),
      links: [
        { label: t('footer.sections.company.about'), href: '/about' },
        { label: t('footer.sections.company.careers'), href: '/careers' },
        { label: t('footer.sections.company.contact'), href: 'mailto:hello@aidenlink.cloud' },
        { label: t('footer.sections.company.blog'), href: '/blog' },
      ],
    },
    resources: {
      title: t('footer.sections.resources.title'),
      links: [
        { label: t('footer.sections.resources.helpCenter'), href: '/help' },
        { label: t('footer.sections.resources.apiDocs'), href: '/docs' },
        { label: t('footer.sections.resources.status'), href: '/status' },
        { label: t('footer.sections.resources.community'), href: '/community' },
      ],
    },
    legal: {
      title: t('footer.sections.legal.title'),
      links: [
        { label: t('footer.sections.legal.privacy'), href: '/privacy' },
        { label: t('footer.sections.legal.terms'), href: '/terms' },
        { label: t('footer.sections.legal.security'), href: '/security' },
        { label: t('footer.sections.legal.gdpr'), href: '/gdpr' },
      ],
    },
  };

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/aidenlink', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/aidenlink', label: 'LinkedIn' },
    { icon: Youtube, href: 'https://youtube.com/@aidenlink', label: 'YouTube' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Aiden Link</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-xs">
              {t('footer.tagline')}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="mailto:hello@aidenlink.cloud"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm">hello@aidenlink.cloud</span>
              </a>
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Dubai, UAE</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') || link.href.startsWith('mailto') ? (
                      <a
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              {t('footer.copyright', { year: currentYear })}
            </p>
            <div className="flex items-center gap-6">
              <LanguageDropdown variant="dark" />
              <p className="text-gray-500 text-sm flex items-center gap-1">
                {t('footer.madeWith')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
