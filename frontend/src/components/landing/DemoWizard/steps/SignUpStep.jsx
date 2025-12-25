import { motion } from 'framer-motion';
import { Mail, Check, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDemoWizard } from '../index';

export const SignUpStep = () => {
  const { demoData, updateData, currentStepData } = useDemoWizard();

  const benefits = [
    '14-day free trial',
    'No credit card required',
    'Setup in 5 minutes',
    'Cancel anytime'
  ];

  const StepIcon = currentStepData.icon;

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-center">
      {/* Left: Description */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 mb-4">
            <StepIcon className="w-4 h-4 mr-2" />
            {currentStepData.estimatedTime}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {currentStepData.title}
          </h2>

          <p className="text-lg text-gray-600 mb-6">{currentStepData.description}</p>

          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <motion.li
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center text-gray-700"
              >
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                {benefit}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Right: Form Mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-xl border p-6 sm:p-8"
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          Create Your Account
        </h3>

        {/* Social Buttons */}
        <div className="space-y-3 mb-6">
          <Button variant="outline" className="w-full h-12 justify-center" disabled>
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full h-12 justify-center" disabled>
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6L11.4 0H24v12.6L11.4 24z" opacity="0.6" />
              <path d="M24 12.6V0H11.4L0 12.6V24h12.6L24 12.6z" />
            </svg>
            Continue with Microsoft
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">or</span>
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="you@company.com"
                className="pl-11 h-12"
                value={demoData.email}
                onChange={(e) => updateData({ email: e.target.value })}
              />
            </div>
          </div>

          <Button className="w-full h-12" disabled>
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          By signing up, you agree to our Terms and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
};

export default SignUpStep;
