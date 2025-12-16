import { motion } from 'framer-motion';
import { Shield, Globe, FileCheck, Award, Lock, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

const TrustSection = () => {
  const certifications = [
    {
      name: 'SOC 2 Ready',
      icon: Shield,
      highlighted: true,
      description: 'Built with SOC 2 controls',
    },
    {
      name: 'GDPR Ready',
      icon: Globe,
      highlighted: true,
      description: 'EU data protection compliant',
    },
    {
      name: 'HIPAA Ready',
      icon: FileCheck,
      highlighted: false,
      description: 'Healthcare data ready',
    },
    {
      name: 'ISO 27001',
      icon: Award,
      highlighted: false,
      description: 'Information security aligned',
    },
  ];

  const securityFeatures = [
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'AES-256 at rest, TLS 1.3 in transit',
      color: 'blue',
    },
    {
      icon: Server,
      title: 'Secure Infrastructure',
      description: 'AWS with multi-region redundancy, 99.9% uptime',
      color: 'blue',
    },
    {
      icon: Shield,
      title: 'Access Controls',
      description: 'RBAC, SSO integration, audit logs',
      color: 'blue',
    },
    {
      icon: FileCheck,
      title: 'Regular Audits',
      description: 'Third-party penetration testing',
      color: 'blue',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-semibold">Enterprise-Grade Security</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for Trust & Compliance
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Enterprise security and compliance standards you can rely on
          </p>
        </motion.div>

        {/* Certification Badges */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {certifications.map((cert, index) => {
            const Icon = cert.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className={`relative group ${
                  cert.highlighted
                    ? 'bg-gradient-to-br from-green-900/50 to-green-800/50 border-2 border-green-500/50'
                    : 'bg-gradient-to-br from-gray-800/50 to-gray-700/50 border-2 border-gray-600/50'
                } rounded-2xl p-6 text-center hover:scale-105 transition-all cursor-pointer`}
              >
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    cert.highlighted
                      ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25'
                      : 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-lg shadow-gray-600/25'
                  }`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">{cert.name}</h3>
                <p className="text-sm text-gray-400">{cert.description}</p>
                {cert.highlighted && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      Ready
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Security Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-8 border border-gray-700/50 hover:border-blue-500/50 transition-all group"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/privacy"
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 font-semibold transition-all shadow-lg shadow-green-500/25"
            >
              View Privacy Policy
            </Link>
            <a
              href="#security"
              className="px-6 py-3 border-2 border-gray-600 text-gray-300 rounded-xl hover:border-blue-500 hover:text-blue-400 font-semibold transition-all"
            >
              Security Documentation
            </a>
          </div>
          <p className="text-gray-500 mt-6 text-sm">
            Questions about our security? <a href="mailto:info@zaiasystems.com" className="text-blue-400 hover:text-blue-300 underline">Contact our security team</a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
