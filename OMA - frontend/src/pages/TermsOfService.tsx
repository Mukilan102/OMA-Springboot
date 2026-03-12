import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Footer } from "../components/Footer";
import {
  DATA_CONTROLLER_NAME,
  DATA_CONTROLLER_FULL_NAME,
  DATA_CONTROLLER_EMAIL,
  DATA_CONTROLLER_ADDRESS,
  DATA_CONTROLLER_COUNTRY,
  GOVERNING_LAW_COUNTRY,
} from "../config/gdpr";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#002D72] hover:text-[#004aad] transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span className="text-sm text-[#4A4A4A] font-medium tracking-wide uppercase">
              Terms of Service
            </span>
            <div className="w-16" />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <h1 className="text-3xl font-semibold text-[#002D72]">Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: March 9, 2026</p>

        <section className="bg-white rounded-2xl shadow-md px-8 py-8 space-y-8 text-[#4A4A4A] leading-relaxed">
          {/* 1 - Acceptance */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Organisational Maturity Assessment
              (&quot;OMA&quot; or the &quot;Platform&quot;) operated by{" "}
              <strong>{DATA_CONTROLLER_FULL_NAME}</strong> (&quot;we&quot;,
              &quot;us&quot;, &quot;our&quot;, or &quot;{DATA_CONTROLLER_NAME}&quot;),
              you (&quot;User&quot; or &quot;you&quot;) agree to be bound by these Terms
              of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must
              not access or use the Platform.
            </p>
            <p>
              If you are using the Platform on behalf of an organisation, you represent and
              warrant that you have the authority to bind that organisation to these Terms,
              and references to &quot;you&quot; shall include that organisation.
            </p>
          </div>

          {/* 2 - Description of Service */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">2. Description of Service</h2>
            <p>
              OMA is an anonymous organisational survey platform designed to evaluate
              leadership maturity across eight dimensions. The Platform collects structured
              survey responses (including multiple-choice selections, rankings, and optional
              free-text inputs), applies automated analytical processing, and generates
              aggregated organisational reports.
            </p>
            <p>
              The Platform is intended solely for organisational development purposes. It is{" "}
              <strong>not</strong> designed for individual employee performance evaluation
              and does not produce automated decisions that create legal or similarly
              significant effects on individuals.
            </p>
          </div>

          {/* 3 - User Obligations */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">3. User Obligations</h2>
            <p>By using the Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Provide honest, accurate, and constructive responses to survey questions.
              </li>
              <li>
                Refrain from including directly identifying personal information (such as
                names, contact details, or other identifiers) in free-text responses.
              </li>
              <li>
                Not attempt to identify other respondents, reverse-engineer aggregated
                results, or manipulate survey outcomes.
              </li>
              <li>Not use the Platform for any unlawful, fraudulent, or malicious purpose.</li>
              <li>
                Not attempt to interfere with, compromise, or disrupt the integrity,
                security, or performance of the Platform or its underlying infrastructure.
              </li>
              <li>
                Not reproduce, scrape, or systematically extract data or content from the
                Platform without our prior written consent.
              </li>
            </ul>
            <p>
              We reserve the right to suspend or restrict access to the Platform in the
              event of a breach of these obligations.
            </p>
          </div>

          {/* 4 - Intellectual Property */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">4. Intellectual Property</h2>
            <p>
              All content, survey instruments, analytical methodologies, scoring frameworks,
              report templates, software, designs, trademarks, and other materials
              comprising or embodied in the Platform (collectively, &quot;Platform
              Materials&quot;) are the exclusive property of {DATA_CONTROLLER_FULL_NAME} or
              its licensors and are protected by applicable intellectual property laws.
            </p>
            <p>
              Nothing in these Terms grants you any right, title, or interest in the
              Platform Materials, except for the limited right to access and use the
              Platform in accordance with these Terms. You may not reproduce, distribute,
              modify, create derivative works from, publicly display, or otherwise exploit
              any Platform Materials without our prior written consent.
            </p>
          </div>

          {/* 5 - Anonymity & Data Use */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              5. Anonymity &amp; Data Use
            </h2>
            <p>
              Survey responses are collected on an anonymous basis. Each session is
              identified solely by a randomly generated UUID, which is not linked to any
              personal identity.
            </p>
            <p>
              Aggregated and anonymised data derived from survey responses may be used for
              organisational development, benchmarking, research, and the continuous
              improvement of the Platform. For comprehensive information regarding data
              collection, processing, and your rights, please refer to our{" "}
              <a href="/privacy-policy" className="text-[#008489] underline">
                Privacy Policy
              </a>.
            </p>
          </div>

          {/* 6 - Automated Processing */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              6. Automated Analytical Processing
            </h2>
            <p>
              Free-text survey responses may be processed using automated analytical tools,
              including a BERT-based natural language processing (NLP) model, for the
              purposes of categorisation, scoring, and theme detection. These outputs
              contribute exclusively to aggregated organisational insights and do not
              constitute automated decision-making under GDPR Article 22. Further details
              are set out in our{" "}
              <a href="/privacy-policy" className="text-[#008489] underline">
                Privacy Policy
              </a>.
            </p>
          </div>

          {/* 7 - Disclaimer of Warranties */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              7. Disclaimer of Warranties
            </h2>
            <p>
              The Platform is provided on an &quot;as is&quot; and &quot;as available&quot;
              basis, without warranties of any kind, whether express, implied, or
              statutory, including but not limited to implied warranties of merchantability,
              fitness for a particular purpose, accuracy, or non-infringement.
            </p>
            <p>
              We do not warrant that the Platform will be uninterrupted, error-free,
              secure, or free from viruses or other harmful components. We do not guarantee
              the accuracy, completeness, or reliability of any reports, scores, or
              insights generated by the Platform.
            </p>
          </div>

          {/* 8 - Limitation of Liability */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              8. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law,{" "}
              {DATA_CONTROLLER_FULL_NAME}, its directors, officers, employees, agents, and
              affiliates shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to loss of
              profits, data, business opportunity, or goodwill, arising out of or in
              connection with:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your use of or inability to use the Platform;</li>
              <li>Any reliance placed on reports, scores, or insights generated by the Platform;</li>
              <li>Unauthorised access to or alteration of your data;</li>
              <li>Any other matter relating to the Platform.</li>
            </ul>
            <p>
              In no event shall our total aggregate liability exceed the amount paid by you,
              if any, for access to the Platform during the twelve (12) months preceding the
              event giving rise to the claim. Nothing in these Terms excludes or limits
              liability that cannot be lawfully excluded or limited under applicable law.
            </p>
          </div>

          {/* 9 - Indemnification */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">9. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless{" "}
              {DATA_CONTROLLER_FULL_NAME} and its directors, officers, employees, and
              agents from and against any claims, liabilities, damages, losses, and
              expenses (including reasonable legal fees) arising out of or in connection
              with your breach of these Terms or your misuse of the Platform.
            </p>
          </div>

          {/* 10 - Third-Party Services */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              10. Third-Party Services
            </h2>
            <p>
              The Platform is hosted on infrastructure provided by Amazon Web Services
              (AWS). We may engage other third-party service providers in connection with
              the operation and maintenance of the Platform. Any such engagement is subject
              to appropriate contractual safeguards. We are not responsible for the
              practices or policies of any third-party service provider.
            </p>
          </div>

          {/* 11 - Modifications */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              11. Modifications to These Terms
            </h2>
            <p>
              We reserve the right to modify or replace these Terms at any time at our sole
              discretion. Where practicable, we will provide notice of material changes by
              updating the &quot;Last updated&quot; date at the top of this page. Your
              continued use of the Platform following the posting of any changes constitutes
              acceptance of the revised Terms. It is your responsibility to review these
              Terms periodically.
            </p>
          </div>

          {/* 12 - Severability */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">12. Severability</h2>
            <p>
              If any provision of these Terms is held to be invalid, illegal, or
              unenforceable by a court of competent jurisdiction, such provision shall be
              modified to the minimum extent necessary to make it enforceable, and the
              remaining provisions shall continue in full force and effect.
            </p>
          </div>

          {/* 13 - Governing Law */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              13. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of{" "}
              <strong>{GOVERNING_LAW_COUNTRY}</strong>, without regard to its conflict of
              law principles. Any disputes arising out of or in connection with these Terms
              shall be subject to the exclusive jurisdiction of the competent courts of{" "}
              <strong>{GOVERNING_LAW_COUNTRY}</strong>.
            </p>
          </div>

          {/* 14 - Contact */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">14. Contact Information</h2>
            <p>
              If you have any questions or concerns regarding these Terms, please contact:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold">{DATA_CONTROLLER_FULL_NAME}</p>
              <p>{DATA_CONTROLLER_ADDRESS}</p>
              <p>{DATA_CONTROLLER_COUNTRY}</p>
              <p>
                Email:{" "}
                <a
                  href={`mailto:${DATA_CONTROLLER_EMAIL}`}
                  className="text-[#008489] underline"
                >
                  {DATA_CONTROLLER_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
