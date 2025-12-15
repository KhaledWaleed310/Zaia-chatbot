import { Link } from 'react-router-dom';
import { Shield, Lock, Database, Eye, Clock, Mail, ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mt-1">Last updated: December 15, 2025</p>
              </div>
            </div>
            <p className="text-gray-600">
              At Zaia, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our chatbot platform.
            </p>
          </div>

          <div className="space-y-8">
            {/* Information We Collect */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
                  <p className="text-sm">
                    When you register for an account, we collect your email address, company name, and password (which is encrypted and stored securely).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Business Information</h3>
                  <p className="text-sm">
                    We may collect information about your business including company size, industry, use case, country, and referral source to better understand our users and improve our services.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Usage Data</h3>
                  <p className="text-sm">
                    We automatically collect information about how you use our platform, including chatbot interactions, features used, and analytics data to improve service quality.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Documents and Content</h3>
                  <p className="text-sm">
                    We process and store documents you upload to train your chatbots, as well as conversations between your chatbots and end users.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">How We Use Your Information</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide, operate, and maintain our chatbot platform</li>
                  <li>Improve, personalize, and expand our services</li>
                  <li>Understand and analyze how you use our platform</li>
                  <li>Process your transactions and manage your account</li>
                  <li>Send you technical notices, updates, and support messages</li>
                  <li>Communicate with you about products, services, and events (with your consent)</li>
                  <li>Detect, prevent, and address technical issues and security threats</li>
                  <li>Comply with legal obligations and enforce our terms</li>
                </ul>
              </div>
            </section>

            {/* Data Storage and Security */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Data Storage and Security</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  We implement appropriate technical and organizational security measures to protect your personal information:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>All passwords are encrypted using industry-standard hashing algorithms</li>
                  <li>Data is transmitted using SSL/TLS encryption</li>
                  <li>Our infrastructure is hosted on secure cloud servers</li>
                  <li>Access to personal data is restricted to authorized personnel only</li>
                  <li>We regularly monitor our systems for potential vulnerabilities</li>
                  <li>We maintain regular backups to prevent data loss</li>
                </ul>
                <p className="mt-4">
                  However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
                </p>
              </div>
            </section>

            {/* Your Rights (GDPR) */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Your Rights (GDPR)</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  If you are a resident of the European Economic Area (EEA), you have certain data protection rights under GDPR:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Right to Access:</strong> You can request copies of your personal data</li>
                  <li><strong>Right to Rectification:</strong> You can request correction of inaccurate data</li>
                  <li><strong>Right to Erasure:</strong> You can request deletion of your personal data</li>
                  <li><strong>Right to Restrict Processing:</strong> You can request that we limit how we use your data</li>
                  <li><strong>Right to Data Portability:</strong> You can request a copy of your data in a machine-readable format</li>
                  <li><strong>Right to Object:</strong> You can object to our processing of your personal data</li>
                  <li><strong>Right to Withdraw Consent:</strong> You can withdraw your consent for marketing communications at any time</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please use the data export and account deletion features in your account settings, or contact us directly.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Data Retention</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Account data is retained while your account is active</li>
                  <li>When you delete your account, we will delete or anonymize your data within 30 days</li>
                  <li>Some data may be retained longer if required by law or for legitimate business purposes</li>
                  <li>Backup copies may persist for up to 90 days after deletion</li>
                </ul>
              </div>
            </section>

            {/* Cookies and Tracking */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Cookies and Tracking</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>We use cookies and similar tracking technologies to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Keep you signed in to your account</li>
                  <li>Remember your preferences and settings</li>
                  <li>Understand how you use our platform</li>
                  <li>Improve our services</li>
                </ul>
                <p className="mt-4">
                  You can control cookie settings through our cookie consent banner and your browser settings.
                </p>
              </div>
            </section>

            {/* Third-Party Services */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Third-Party Services</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  We may use third-party service providers to help us operate our platform. These providers have access to your personal information only to perform specific tasks on our behalf and are obligated to protect your information.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mt-3">
                  <p className="font-semibold text-gray-900">Email:</p>
                  <a href="mailto:privacy@zaia.ai" className="text-blue-600 hover:underline">
                    privacy@zaia.ai
                  </a>
                </div>
              </div>
            </section>

            {/* Changes to Privacy Policy */}
            <section className="pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Changes to This Privacy Policy</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
                <p>
                  You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
