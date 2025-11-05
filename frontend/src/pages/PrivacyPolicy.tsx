import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Privacy Policy - Messenger';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last Updated: October 24, 2025
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <h2>1. Introduction</h2>
            <p>
              Welcome to Messenger ("we," "our," or "us"). We are committed to protecting your
              privacy and ensuring the security of your personal information. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use
              our messaging service.
            </p>

            <h2>2. Information We Collect</h2>
            
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account Information:</strong> Username, email address, password (encrypted), and optional profile information (display name, avatar)</li>
              <li><strong>Messages:</strong> Text messages, files, images, and other content you send through our service</li>
              <li><strong>Contacts:</strong> Information about users you connect with and communicate with</li>
              <li><strong>Group Information:</strong> Group names, descriptions, and member lists you create or join</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <ul>
              <li><strong>Usage Data:</strong> Information about how you use our service, including features accessed, actions taken, and time spent</li>
              <li><strong>Device Information:</strong> Device type, operating system, browser type, IP address, and unique device identifiers</li>
              <li><strong>Log Data:</strong> Server logs, error reports, and performance data</li>
              <li><strong>Call Data:</strong> Call duration, participants, and call quality metrics for voice and video calls</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide, maintain, and improve our messaging service</li>
              <li>Process and deliver messages, files, and calls</li>
              <li>Authenticate users and prevent fraud and abuse</li>
              <li>Send service-related notifications and updates</li>
              <li>Respond to your requests and provide customer support</li>
              <li>Monitor and analyze usage patterns to improve user experience</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
              <li>Ensure the security and integrity of our service</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data:</p>
            <ul>
              <li><strong>End-to-End Encryption:</strong> Messages are encrypted using libsodium cryptography</li>
              <li><strong>Secure Storage:</strong> Passwords are hashed using bcrypt, data is stored in encrypted databases</li>
              <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms</li>
              <li><strong>Malware Scanning:</strong> All file uploads are scanned with ClamAV</li>
              <li><strong>Rate Limiting:</strong> Protection against brute force and abuse</li>
              <li><strong>Audit Logging:</strong> Comprehensive audit trails for security events</li>
            </ul>

            <h2>5. Data Retention</h2>
            <ul>
              <li><strong>Messages:</strong> Automatically deleted after 30 days</li>
              <li><strong>Files:</strong> Deleted when associated messages are deleted (30 days)</li>
              <li><strong>Call History:</strong> Retained for 30 days</li>
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Audit Logs:</strong> Retained for 1 year for security and compliance purposes</li>
            </ul>

            <h2>6. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
            <ul>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
              <li><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our service (e.g., hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
              <li><strong>Safety and Security:</strong> To protect the rights, property, or safety of our users and the public</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>

            <h2>7. Your Rights (GDPR Compliance)</h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to Restriction:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Right to Object:</strong> Object to processing of your data</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p>
              To exercise these rights, use the data export and account deletion features in your
              Settings, or contact us at privacy@messenger.com.
            </p>

            <h2>8. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li>Authenticate users and maintain sessions</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze usage patterns and improve our service</li>
              <li>Provide security features and prevent fraud</li>
            </ul>
            <p>
              You can control cookies through your browser settings, but disabling cookies may
              affect the functionality of our service.
            </p>

            <h2>9. Children's Privacy</h2>
            <p>
              Our service is not intended for users under 16 years of age. We do not knowingly
              collect personal information from children under 16. If you believe we have collected
              information from a child under 16, please contact us immediately.
            </p>

            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your
              country of residence. We ensure appropriate safeguards are in place to protect your
              data in accordance with this Privacy Policy and applicable laws.
            </p>

            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting a notice in the app or sending you an email. Your continued use of
              our service after changes take effect constitutes acceptance of the updated policy.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your
              personal data, please contact us:
            </p>
            <ul>
              <li><strong>Email:</strong> privacy@messenger.com</li>
              <li><strong>Data Protection Officer:</strong> dpo@messenger.com</li>
              <li><strong>Address:</strong> [Your Company Address]</li>
            </ul>

            <h2>13. Specific Provisions</h2>
            
            <h3>13.1 California Privacy Rights (CCPA)</h3>
            <p>
              California residents have additional rights under the California Consumer Privacy Act
              (CCPA), including the right to know what personal information is collected, the right
              to delete personal information, and the right to opt-out of the sale of personal
              information. We do not sell personal information.
            </p>

            <h3>13.2 European Economic Area (EEA) Users</h3>
            <p>
              If you are located in the EEA, you have rights under the General Data Protection
              Regulation (GDPR) as outlined in Section 7 above. Our lawful basis for processing
              your data includes: consent, contractual necessity, legal obligation, and legitimate
              interests.
            </p>

            <h2>14. Data Processing Details</h2>
            <ul>
              <li><strong>Data Controller:</strong> [Your Company Name]</li>
              <li><strong>Data Processors:</strong> Hosting provider, email service, analytics service</li>
              <li><strong>Data Storage Location:</strong> [Server Location]</li>
              <li><strong>Encryption Standard:</strong> libsodium with X25519 key exchange</li>
              <li><strong>Backup Frequency:</strong> Daily automated backups retained for 30 days</li>
            </ul>

            <hr className="my-8" />
            
            <p className="text-sm text-muted-foreground">
              By using our service, you acknowledge that you have read and understood this Privacy
              Policy and agree to the collection, use, and disclosure of your information as
              described herein.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
