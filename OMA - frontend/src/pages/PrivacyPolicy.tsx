import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Footer } from "../components/Footer";
import {
  DATA_CONTROLLER_FULL_NAME,
  DATA_CONTROLLER_EMAIL,
  DATA_CONTROLLER_ADDRESS,
  DATA_CONTROLLER_COUNTRY,
  AWS_HOSTING_REGION,
} from "../config/gdpr";

export default function PrivacyPolicy() {
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
              Privacy Policy
            </span>
            <div className="w-16" /> {/* spacer for centering */}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <h1 className="text-3xl font-semibold text-[#002D72]">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: March 9, 2026</p>

        <section className="bg-white rounded-2xl shadow-md px-8 py-8 space-y-8 text-[#4A4A4A] leading-relaxed">
          {/* 1 - Data Controller */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">1. Data Controller</h2>
            <p>
              The data controller for the Organisational Maturity Assessment
              (&quot;OMA&quot; or the &quot;Platform&quot;) is:
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
            <p>
              For any privacy-related enquiries, data subject requests, or complaints,
              please contact us using the details above.
            </p>
          </div>

          {/* 2 - Scope */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              2. Scope &amp; Application
            </h2>
            <p>
              This Privacy Policy explains how {DATA_CONTROLLER_FULL_NAME} collects,
              processes, stores, and protects data in connection with the OMA platform. It
              applies to all users of the Platform, including survey respondents and
              administrative users.
            </p>
            <p>
              This policy is drafted in accordance with the General Data Protection
              Regulation (EU) 2016/679 (&quot;GDPR&quot;) and applicable data protection
              legislation. Where the Platform is accessed by users outside the European
              Economic Area (EEA), this policy applies to the extent required by applicable
              law.
            </p>
          </div>

          {/* 3 - Data We Collect */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">3. Data We Collect</h2>
            <p>
              The OMA platform is designed to operate on an <strong>anonymous</strong>{" "}
              basis. We collect the following categories of data:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Survey responses</strong> - multiple-choice selections, rankings, and
                free-text answers
              </li>
              <li>
                <strong>Random session identifier</strong> - a UUID generated at the start of
                each session, with no link to the respondent&apos;s identity
              </li>
              <li>
                <strong>Submission timestamp</strong> - the time at which the survey was
                submitted
              </li>
              <li>
                <strong>Consent acknowledgement</strong> - a record confirming that consent
                was provided, together with a timestamp
              </li>
            </ul>
          </div>

          {/* 4 - Data We Do Not Collect */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              4. Data We Do Not Intentionally Collect
            </h2>
            <p>The Platform does <strong>not</strong> intentionally collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Names or usernames</li>
              <li>Email addresses</li>
              <li>Direct personal identifiers</li>
            </ul>
            <p>
              However, standard web server infrastructure may temporarily process IP
              addresses in server logs for security monitoring, error diagnostics, and
              operational purposes. Such logs are retained only as long as necessary for
              these purposes and are not used to identify individual respondents.
            </p>
            <p>
              We strongly advise respondents not to include directly identifying personal
              information (such as names or contact details) in free-text responses.
              Should such information be inadvertently provided, it will be processed in
              accordance with this Privacy Policy and may be removed during report
              preparation where identified.
            </p>
          </div>

          {/* 5 - Legal Basis */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              5. Legal Basis for Processing
            </h2>
            <p>
              We process your data on the basis of your{" "}
              <strong>explicit consent</strong> under GDPR Article 6(1)(a). This consent is
              obtained before you begin the survey and covers:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>The collection and storage of your survey responses</li>
              <li>
                The automated analytical processing of free-text responses using NLP tools
                (as described in Section 7)
              </li>
              <li>
                The use of aggregated and anonymised data for organisational reporting,
                benchmarking, and research
              </li>
            </ul>
            <p>
              You may <strong>withdraw your consent</strong> at any time by contacting us
              at{" "}
              <a
                href={`mailto:${DATA_CONTROLLER_EMAIL}`}
                className="text-[#008489] underline"
              >
                {DATA_CONTROLLER_EMAIL}
              </a>{" "}
              and quoting your session ID. Withdrawal of consent does not affect the
              lawfulness of processing carried out prior to such withdrawal, nor does it
              affect data that has already been irreversibly anonymised and incorporated
              into aggregated datasets.
            </p>
          </div>

          {/* 6 - Purpose of Processing */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              6. Purpose of Processing
            </h2>
            <p>Your data is processed exclusively for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Evaluating organisational maturity across eight leadership dimensions
              </li>
              <li>Generating aggregated organisational scores and reports</li>
              <li>
                Supporting the design of targeted leadership development initiatives and
                coaching programmes
              </li>
              <li>
                Benchmarking, research, and continuous improvement of the Platform
              </li>
            </ul>
            <p>
              We will never sell, rent, or share your data with third parties for marketing,
              advertising, or profiling purposes.
            </p>
          </div>

          {/* 7 - AI & Automated Processing */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              7. Automated Analytical Processing &amp; AI
            </h2>
            <p>
              Free-text survey responses are processed using a{" "}
              <strong>BERT-based natural language processing (NLP) model</strong>. This
              automated analytical processing performs the following functions:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Categorisation of free-text responses into thematic areas</li>
              <li>Scoring of responses against predefined criteria</li>
              <li>Sentiment and theme detection</li>
            </ul>
            <p>
              The outputs of this processing contribute solely to{" "}
              <strong>aggregated organisational insights</strong>. The Platform does{" "}
              <strong>not</strong> perform automated decision-making as defined under GDPR
              Article 22. Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                No decisions producing legal or similarly significant effects on
                individuals are made solely on the basis of automated processing.
              </li>
              <li>
                The Platform is not used for individual employee performance evaluation.
              </li>
              <li>
                Human interpretation and professional judgement may be involved in the
                preparation and contextualisation of organisational reports.
              </li>
            </ul>
          </div>

          {/* 8 - Data Retention */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">8. Data Retention</h2>
            <p>
              We retain survey response data only for as long as is necessary to fulfil the
              purposes described in this Privacy Policy. Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Identifiable session data (i.e., data linked to a session UUID) is retained
                only for the period required to complete reporting and analysis, and in
                any event no longer than <strong>90 days</strong> from submission. After
                this period, data is automatically and irreversibly anonymised.
              </li>
              <li>
                Upon an erasure request, or upon expiry of the retention period, data is
                irreversibly anonymised by permanently replacing the session identifier,
                erasing all timestamps and consent records, and deleting free-text
                responses. The remaining structured response data is retained in fully
                anonymised form for benchmarking, research, and organisational development
                purposes. Once anonymised, such data no longer constitutes personal data
                under the GDPR.
              </li>
              <li>
                Your browser stores a session identifier in local storage and a cookie,
                both of which automatically expire after 30 days. You may also clear
                this data at any time by clearing your browser data.
              </li>
            </ul>
            <p>
              We do not retain identifiable data indefinitely. All identifiable session
              data is automatically anonymised after the retention period, or immediately
              upon an erasure request.
            </p>
          </div>

          {/* 9 - Data Sharing & Processors */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              9. Data Sharing &amp; Sub-Processors
            </h2>
            <p>
              We do not sell or share your data with third parties for their own purposes.
              Data may be shared with the following categories of recipients, solely for
              the purposes described in this policy:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Amazon Web Services (AWS)</strong> - The Platform is hosted on AWS
                infrastructure. AWS acts as a data processor under a Data Processing
                Agreement incorporating appropriate contractual safeguards. Data may be
                stored in AWS data centres in the{" "}
                <strong>{AWS_HOSTING_REGION}</strong> region.
              </li>
              <li>
                <strong>NLP Processing Service (Internal)</strong> - Free-text survey responses are
                transmitted to a BERT-based natural language processing service operated
                by our internal team for automated analytical processing (as described
                in Section 7). This service processes text data solely for
                categorisation and scoring purposes. No personal identifiers are
                transmitted alongside the text. As this service is operated internally,
                no third-party data sharing occurs.
              </li>
              <li>
                <strong>Client organisations</strong> - Aggregated and anonymised
                organisational reports may be shared with the commissioning organisation.
                Such reports do not contain data that identifies individual respondents.
              </li>
            </ul>
          </div>

          {/* 10 - International Transfers */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              10. International Data Transfers
            </h2>
            <p>
              Where personal data is transferred outside the European Economic Area (EEA),
              we ensure that appropriate safeguards are in place to protect your data in
              accordance with Chapter V of the GDPR. Such safeguards may include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Standard Contractual Clauses (SCCs) approved by the European Commission
              </li>
              <li>
                Data processing agreements with sub-processors that incorporate equivalent
                protections
              </li>
              <li>Adequacy decisions, where applicable</li>
            </ul>
            <p>
              You may request further information about the safeguards in place by
              contacting us at{" "}
              <a
                href={`mailto:${DATA_CONTROLLER_EMAIL}`}
                className="text-[#008489] underline"
              >
                {DATA_CONTROLLER_EMAIL}
              </a>.
            </p>
          </div>

          {/* 11 - Your Rights */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              11. Your Rights Under the GDPR
            </h2>
            <p>
              Subject to applicable law and the anonymous nature of the processing, you
              have the following rights under the GDPR:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Right of Access</strong> (Article 15) - Request a copy of the data
                associated with your session ID.
              </li>
              <li>
                <strong>Right to Erasure</strong> (Article 17) - Request the irreversible
                anonymization of data linked to your session ID. Upon such request, your
                session identifier is permanently replaced with a random anonymous value,
                all timestamps and consent records are erased, and any free-text responses
                are deleted. The remaining structured response data (multiple-choice
                selections and rankings) is retained in fully anonymized form for
                aggregated organisational analysis and can no longer be linked to any
                session or individual.
              </li>
              <li>
                <strong>Right to Data Portability</strong> (Article 20) - Receive your data
                in a structured, commonly used, and machine-readable format.
              </li>
              <li>
                <strong>Right to Restrict Processing</strong> (Article 18) - Request that
                processing of your data be restricted in certain circumstances.
              </li>
              <li>
                <strong>Right to Withdraw Consent</strong> (Article 7(3)) - Withdraw your
                consent at any time, without affecting the lawfulness of processing based on
                consent before its withdrawal.
              </li>
              <li>
                <strong>Right to Lodge a Complaint</strong> - You have the right to lodge a
                complaint with a supervisory authority, in particular in the EU Member State
                of your habitual residence, place of work, or place of the alleged
                infringement.
              </li>
            </ul>
            <p>
              <strong>How to exercise your rights:</strong> To submit a data subject
              request, please contact{" "}
              <a
                href={`mailto:${DATA_CONTROLLER_EMAIL}`}
                className="text-[#008489] underline"
              >
                {DATA_CONTROLLER_EMAIL}
              </a>{" "}
              and include your <strong>session ID</strong> (displayed at the conclusion of
              the survey). As the Platform does not collect personal identifiers, the
              session ID is the only means by which we can locate data associated with your
              session. We will respond to valid requests within the timeframes prescribed
              by applicable law.
            </p>
            <p>
              Please note that where data has already been irreversibly anonymised and
              incorporated into aggregated datasets, it may no longer be possible to
              identify or extract individual responses. Specifically, after the 90-day
              retention period, your session identifier is permanently replaced and your
              data can no longer be located. Any request received after this period will
              be responded to confirming that no identifiable data remains.
            </p>
          </div>

          {/* 12 - Data Security */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">12. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect
              your data against unauthorised access, alteration, disclosure, or
              destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Encryption in transit</strong> - All data transmitted between your
                browser and the Platform is encrypted using HTTPS/TLS protocols.
              </li>
              <li>
                <strong>Encryption at rest</strong> - Data stored within the Platform
                infrastructure is encrypted using industry-standard encryption methods.
              </li>
              <li>
                <strong>Role-based access control</strong> - Access to data is restricted to
                authorised personnel on a need-to-know basis.
              </li>
              <li>
                <strong>Restricted personnel access</strong> - Only a limited number of
                authorised individuals have access to identifiable session data.
              </li>
              <li>
                <strong>Industry-standard safeguards</strong> - We employ security
                practices consistent with recognised industry standards to protect the
                confidentiality, integrity, and availability of data.
              </li>
            </ul>
            <p>
              While we take reasonable precautions to protect your data, no method of
              transmission over the internet or method of electronic storage is entirely
              secure. We cannot guarantee absolute security.
            </p>
          </div>

          {/* 13 - Cookies */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              13. Cookies &amp; Similar Technologies
            </h2>
            <p>
              The Platform does <strong>not</strong> use advertising, analytics, or
              third-party tracking cookies. The following cookies are used strictly for
              operational purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Session cookie</strong> - A cookie used solely to maintain
                survey continuity during and across sessions. This cookie stores a
                randomly generated anonymous session identifier and expires after 30
                days or when manually cleared by the user.
              </li>
              <li>
                <strong>Authentication cookie</strong> - An httpOnly cookie used exclusively
                for administrative access to the Platform. This cookie is not set for
                survey respondents.
              </li>
            </ul>
          </div>

          {/* 14 - Children */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              14. Children&apos;s Privacy
            </h2>
            <p>
              The Platform is intended for use by corporate organisations and their
              employees. It is not directed at, and is not intended to collect data from,
              individuals under the age of 16. We do not knowingly process data from
              children.
            </p>
          </div>

          {/* 15 - Changes */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              15. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our
              practices, the Platform, or applicable law. Where practicable, we will
              provide notice of material changes. The &quot;Last updated&quot; date at the
              top of this page indicates when this policy was last revised. Your continued
              use of the Platform following any changes constitutes acceptance of the
              updated policy.
            </p>
          </div>

          {/* 16 - Contact */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#002D72]">
              16. Contact &amp; Complaints
            </h2>
            <p>
              If you have any questions, concerns, or complaints regarding this Privacy
              Policy or the processing of your data, please contact:
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
            <p>
              You also have the right to lodge a complaint with a supervisory authority if
              you believe that the processing of your data infringes applicable data
              protection law.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
