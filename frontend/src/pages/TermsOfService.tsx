import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfService() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Terms of Service - Messenger';
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
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last Updated: October 24, 2025
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Messenger ("the Service"), you agree to be bound by these Terms
              of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
              These Terms constitute a legally binding agreement between you and Messenger.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Messenger is a secure messaging platform that provides:
            </p>
            <ul>
              <li>End-to-end encrypted text messaging</li>
              <li>File sharing with malware scanning</li>
              <li>Voice and video calling via WebRTC</li>
              <li>Group chat functionality (up to 20 participants)</li>
              <li>Contact management and blocking</li>
            </ul>
            <p>
              The Service is provided "as is" and we reserve the right to modify, suspend, or
              discontinue any aspect of the Service at any time.
            </p>

            <h2>3. Eligibility</h2>
            <p>
              You must be at least 16 years old to use this Service. By using the Service, you
              represent and warrant that:
            </p>
            <ul>
              <li>You are at least 16 years of age</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You will comply with all applicable laws and regulations</li>
              <li>All information you provide is accurate and current</li>
            </ul>

            <h2>4. User Accounts</h2>
            
            <h3>4.1 Registration</h3>
            <ul>
              <li>You must register for an account to use the Service</li>
              <li>Registration is subject to admin approval (limited to 100 users maximum)</li>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You are responsible for all activities under your account</li>
            </ul>

            <h3>4.2 Account Security</h3>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Enable two-factor authentication (2FA) for enhanced security</li>
              <li>Monitor your active sessions and revoke suspicious sessions</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>You are liable for any unauthorized use of your account</li>
            </ul>

            <h3>4.3 Account Termination</h3>
            <p>We reserve the right to suspend or terminate your account if you:</p>
            <ul>
              <li>Violate these Terms</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Abuse or harass other users</li>
              <li>Attempt to compromise the security of the Service</li>
              <li>Violate intellectual property rights</li>
            </ul>
            <p>
              You may delete your account at any time through Settings. Account deletion is
              permanent and cannot be undone.
            </p>

            <h2>5. Acceptable Use Policy</h2>
            
            <h3>5.1 Prohibited Activities</h3>
            <p>You agree NOT to:</p>
            <ul>
              <li>Send spam, unsolicited messages, or commercial advertisements</li>
              <li>Harass, threaten, intimidate, or abuse other users</li>
              <li>Share illegal content or content that violates others' rights</li>
              <li>Upload malware, viruses, or malicious code</li>
              <li>Impersonate others or create fake accounts</li>
              <li>Scrape, crawl, or collect user data without permission</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Reverse engineer or decompile the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Share child sexual abuse material (CSAM) - strictly prohibited</li>
            </ul>

            <h3>5.2 Content Restrictions</h3>
            <p>You may not share content that:</p>
            <ul>
              <li>Is illegal, harmful, or violates laws or regulations</li>
              <li>Infringes intellectual property rights</li>
              <li>Contains hate speech, discrimination, or incites violence</li>
              <li>Is pornographic, obscene, or sexually explicit (except between consenting adults)</li>
              <li>Promotes self-harm, suicide, or eating disorders</li>
              <li>Contains personal information of others without consent</li>
              <li>Is defamatory, fraudulent, or misleading</li>
            </ul>

            <h2>6. User Content</h2>
            
            <h3>6.1 Ownership</h3>
            <p>
              You retain ownership of all content you create and share through the Service. By
              sharing content, you grant us a limited license to transmit, store, and display your
              content as necessary to provide the Service.
            </p>

            <h3>6.2 Content Moderation</h3>
            <ul>
              <li>All file uploads are scanned for malware using ClamAV</li>
              <li>We reserve the right to remove content that violates these Terms</li>
              <li>We may investigate and take action on reported content</li>
              <li>Repeat offenders may have their accounts terminated</li>
            </ul>

            <h3>6.3 Data Retention</h3>
            <ul>
              <li><strong>Messages:</strong> Automatically deleted after 30 days</li>
              <li><strong>Files:</strong> Deleted with associated messages (30 days)</li>
              <li><strong>Call History:</strong> Retained for 30 days</li>
              <li><strong>Account Data:</strong> Retained while account is active</li>
            </ul>

            <h2>7. Service Limitations</h2>
            <p>The Service has the following limitations:</p>
            <ul>
              <li><strong>User Limit:</strong> Maximum 100 registered users (hard limit)</li>
              <li><strong>File Size:</strong> Maximum 50MB per file upload</li>
              <li><strong>Group Size:</strong> Maximum 20 participants per group</li>
              <li><strong>Message Retention:</strong> 30-day automatic deletion</li>
              <li><strong>Concurrent Sessions:</strong> Maximum 5 active sessions per user</li>
              <li><strong>Rate Limits:</strong> API rate limits apply to prevent abuse</li>
            </ul>

            <h2>8. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Please review our <a href="/privacy" className="text-primary underline">Privacy Policy</a> to
              understand how we collect, use, and protect your personal information. By using the
              Service, you consent to our data practices as described in the Privacy Policy.
            </p>

            <h3>8.1 Data Security</h3>
            <ul>
              <li>End-to-end encryption using libsodium</li>
              <li>Secure password hashing with bcrypt</li>
              <li>Regular security audits and updates</li>
              <li>Comprehensive audit logging</li>
            </ul>

            <h3>8.2 Your Data Rights</h3>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Export your data in JSON format</li>
              <li>Delete your account and data</li>
              <li>Correct inaccurate information</li>
            </ul>

            <h2>9. Intellectual Property</h2>
            
            <h3>9.1 Our Rights</h3>
            <p>
              The Service, including its design, code, features, and trademarks, is owned by
              Messenger and protected by copyright, trademark, and other intellectual property laws.
              You may not copy, modify, distribute, or create derivative works without our written
              permission.
            </p>

            <h3>9.2 User Rights</h3>
            <p>
              You retain all rights to content you create. We do not claim ownership of your
              messages, files, or other content.
            </p>

            <h2>10. Third-Party Services</h2>
            <p>
              The Service may integrate with third-party services (e.g., STUN/TURN servers for
              calling). We are not responsible for the privacy practices or content of third-party
              services. Your use of third-party services is subject to their terms and policies.
            </p>

            <h2>11. Disclaimers and Limitations of Liability</h2>
            
            <h3>11.1 No Warranties</h3>
            <p>
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <h3>11.2 Service Availability</h3>
            <p>
              We do not guarantee that the Service will be uninterrupted, error-free, or secure. We
              may experience downtime for maintenance, updates, or unforeseen issues.
            </p>

            <h3>11.3 Limitation of Liability</h3>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
              LOSS OF DATA, REVENUE, OR PROFITS, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>

            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Messenger, its officers, directors,
              employees, and agents from any claims, liabilities, damages, losses, and expenses
              (including legal fees) arising out of or related to:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of others</li>
              <li>Your content or actions on the Service</li>
            </ul>

            <h2>13. Dispute Resolution</h2>
            
            <h3>13.1 Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your
              Jurisdiction], without regard to its conflict of law provisions.
            </p>

            <h3>13.2 Arbitration</h3>
            <p>
              Any disputes arising out of or relating to these Terms or the Service shall be
              resolved through binding arbitration, except where prohibited by law. You waive your
              right to a jury trial or to participate in a class action lawsuit.
            </p>

            <h2>14. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of
              significant changes by:
            </p>
            <ul>
              <li>Posting a notice in the app</li>
              <li>Sending an email to your registered email address</li>
              <li>Updating the "Last Updated" date at the top of this document</li>
            </ul>
            <p>
              Your continued use of the Service after changes take effect constitutes acceptance of
              the modified Terms. If you do not agree to the changes, you must stop using the
              Service and delete your account.
            </p>

            <h2>15. Severability</h2>
            <p>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining
              provisions shall remain in full force and effect.
            </p>

            <h2>16. Entire Agreement</h2>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and Messenger regarding the Service and supersede all prior agreements.
            </p>

            <h2>17. Contact Information</h2>
            <p>
              If you have questions or concerns about these Terms, please contact us:
            </p>
            <ul>
              <li><strong>Email:</strong> legal@messenger.com</li>
              <li><strong>Support:</strong> support@messenger.com</li>
              <li><strong>Address:</strong> [Your Company Address]</li>
            </ul>

            <h2>18. Acknowledgment</h2>
            <p>
              BY CLICKING "I AGREE" OR BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ,
              UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>

            <hr className="my-8" />
            
            <p className="text-sm text-muted-foreground">
              These Terms of Service are effective as of October 24, 2025. Thank you for using
              Messenger responsibly and respecting our community guidelines.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
