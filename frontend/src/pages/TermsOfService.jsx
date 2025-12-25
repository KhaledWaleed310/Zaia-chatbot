import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="w-5 h-5" />
            <span className="font-medium">Legal</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: December 21, 2025</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing or using Aiden Link ("the Service"), provided by ZAIA Systems ("we", "us", or "our"),
                you agree to be bound by these Terms of Service. If you do not agree to these terms,
                please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-600 mb-4">
                Aiden Link is an AI-powered chatbot platform that enables businesses to create and deploy
                intelligent customer support chatbots. The Service includes:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>AI chatbot creation and customization</li>
                <li>Document upload and knowledge base management</li>
                <li>Lead generation and booking capabilities</li>
                <li>Analytics and reporting</li>
                <li>Integration with third-party platforms including Facebook Messenger</li>
                <li>Human handoff functionality</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-600 mb-4">
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
              <p className="text-gray-600 mb-4">You agree not to use the Service to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful, offensive, or misleading content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the proper functioning of the Service</li>
                <li>Use the Service for spam or unsolicited communications</li>
                <li>Collect user data without proper consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Content and Data</h2>
              <p className="text-gray-600 mb-4">
                <strong>Your Content:</strong> You retain ownership of all content you upload to the Service.
                By uploading content, you grant us a license to use it solely for providing the Service.
              </p>
              <p className="text-gray-600 mb-4">
                <strong>User Data:</strong> We collect and process user data in accordance with our
                <Link to="/privacy" className="text-blue-600 hover:underline"> Privacy Policy</Link>.
                You are responsible for ensuring you have proper consent to share any personal data with us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Third-Party Integrations</h2>
              <p className="text-gray-600 mb-4">
                The Service may integrate with third-party platforms including Facebook Messenger,
                Google, and others. Your use of these integrations is subject to the respective
                third-party terms of service. We are not responsible for third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Payment Terms</h2>
              <p className="text-gray-600 mb-4">
                Paid plans are billed in advance on a monthly or annual basis. Refunds are provided
                in accordance with our refund policy. We reserve the right to modify pricing with
                30 days notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                To the maximum extent permitted by law, ZAIA Systems shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages, or any loss of
                profits or revenues, whether incurred directly or indirectly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-gray-600 mb-4">
                The Service is provided "as is" without warranties of any kind, either express or implied.
                We do not guarantee that the Service will be uninterrupted, secure, or error-free.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Termination</h2>
              <p className="text-gray-600 mb-4">
                We may terminate or suspend your account at any time for violations of these terms.
                You may terminate your account at any time through your account settings or by
                contacting support.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Data Deletion</h2>
              <p className="text-gray-600 mb-4">
                You may request deletion of your data at any time through your account settings or
                by contacting us at <a href="mailto:privacy@aidenlink.cloud" className="text-blue-600 hover:underline">privacy@aidenlink.cloud</a>.
                We will process deletion requests in accordance with GDPR requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-gray-600 mb-4">
                We reserve the right to modify these terms at any time. We will notify users of
                significant changes via email or through the Service. Continued use after changes
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-600 mb-4">
                These terms shall be governed by and construed in accordance with the laws of the
                United Arab Emirates. Any disputes shall be resolved in the courts of Dubai, UAE.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>ZAIA Systems</strong></p>
                <p className="text-gray-600">Email: legal@aidenlink.cloud</p>
                <p className="text-gray-600">Support: support@aidenlink.cloud</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} ZAIA Systems. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacy" className="hover:text-blue-600">Privacy Policy</Link>
            <span>|</span>
            <Link to="/" className="hover:text-blue-600">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;
