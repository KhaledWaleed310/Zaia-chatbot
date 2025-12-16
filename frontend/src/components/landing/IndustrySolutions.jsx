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

const industries = [
  {
    id: 'saas',
    name: 'SaaS',
    icon: Monitor,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:bg-blue-100',
    activeColor: 'bg-blue-600',
    metric: '73% ticket reduction',
    description: 'Automate customer onboarding, technical support, and feature requests with AI that understands your product.',
    useCases: [
      'Automated onboarding and product tours',
      'Technical troubleshooting and bug triage',
      'Feature request collection and routing',
      'Integration support and API guidance',
    ],
    testimonial: {
      quote: 'Our support team went from drowning in tickets to focusing on high-value customer relationships. Response times dropped from hours to seconds.',
      author: 'Sarah Chen',
      role: 'Head of Customer Success, CloudFlow',
    },
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    icon: ShoppingCart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-100',
    activeColor: 'bg-green-600',
    metric: '45% faster resolution',
    description: 'Handle order inquiries, returns, and product questions instantly while increasing customer satisfaction.',
    useCases: [
      'Order tracking and status updates',
      'Return and exchange processing',
      'Product recommendations and inquiries',
      'Shipping and delivery support',
    ],
    testimonial: {
      quote: 'During Black Friday, ZAIA handled 10,000+ customer inquiries without breaking a sweat. Our human team focused on complex cases and sales.',
      author: 'Marcus Rodriguez',
      role: 'COO, StyleHub',
    },
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverColor: 'hover:bg-red-100',
    activeColor: 'bg-red-600',
    metric: '60% admin time saved',
    description: 'Streamline patient scheduling, insurance verification, and administrative tasks while maintaining HIPAA compliance.',
    useCases: [
      'Appointment scheduling and reminders',
      'Insurance verification and billing inquiries',
      'Patient intake and form collection',
      'Prescription refill requests',
    ],
    testimonial: {
      quote: 'ZAIA freed up our front desk staff to focus on patient care. Appointment scheduling is now 24/7, and no-shows dropped by 40%.',
      author: 'Dr. Emily Watson',
      role: 'Practice Manager, HealthFirst Clinic',
    },
  },
  {
    id: 'education',
    name: 'Education',
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverColor: 'hover:bg-purple-100',
    activeColor: 'bg-purple-600',
    metric: '2x enrollment conversion',
    description: 'Support prospective students, answer admissions questions, and guide enrollment processes around the clock.',
    useCases: [
      'Admissions inquiry and program information',
      'Application status and deadline tracking',
      'Financial aid and scholarship guidance',
      'Student onboarding and orientation',
    ],
    testimonial: {
      quote: 'Prospective students get instant answers at 2 AM. Our enrollment rate doubled because we never miss a lead.',
      author: 'James Mitchell',
      role: 'Director of Admissions, TechU',
    },
  },
  {
    id: 'legal',
    name: 'Legal',
    icon: Scale,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverColor: 'hover:bg-amber-100',
    activeColor: 'bg-amber-600',
    metric: '5x intake efficiency',
    description: 'Qualify leads, schedule consultations, and collect case information while maintaining client confidentiality.',
    useCases: [
      'Initial case evaluation and qualification',
      'Consultation scheduling and coordination',
      'Document collection and intake forms',
      'Client communication and updates',
    ],
    testimonial: {
      quote: 'We went from manually screening every inquiry to having qualified leads delivered to our attorneys. Intake process is now 5x faster.',
      author: 'Rachel Thompson',
      role: 'Managing Partner, Thompson & Associates',
    },
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: Building2,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    hoverColor: 'hover:bg-cyan-100',
    activeColor: 'bg-cyan-600',
    metric: '90% compliance accuracy',
    description: 'Provide account support, transaction assistance, and financial guidance with bank-level security.',
    useCases: [
      'Account balance and transaction inquiries',
      'Fraud detection and security alerts',
      'Loan application and status tracking',
      'Investment and portfolio guidance',
    ],
    testimonial: {
      quote: 'ZAIA handles routine inquiries with perfect compliance while our advisors focus on complex financial planning. Security is never compromised.',
      author: 'David Park',
      role: 'VP of Operations, SecureBank',
    },
  },
];

const IndustrySolutions = () => {
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
              Built for Your Industry
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Industry-specific AI solutions that understand your unique challenges and workflows
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
                <Icon className="w-5 h-5 mr-2" />
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
                {selectedIndustry.name} Solutions
              </h3>

              <p className="text-lg text-gray-600 mb-8">
                {selectedIndustry.description}
              </p>

              <div className="space-y-4 mb-8">
                <h4 className="text-xl font-bold text-gray-900">Key Use Cases</h4>
                {selectedIndustry.useCases.map((useCase, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start"
                  >
                    <div className={`${selectedIndustry.bgColor} ${selectedIndustry.color} rounded-full p-1 mr-3 mt-0.5`}>
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
                See {selectedIndustry.name} Demo
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
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
