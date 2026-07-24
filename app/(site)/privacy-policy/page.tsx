import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How .ppl Solutions, Inc. collects, uses, and protects your personal information in compliance with the Data Privacy Act of 2012.",
};

const dpoEmail = "sales@pplsolutionsinc.com";

// A block is either a paragraph (string) or a bulleted list ({ list: [...] }).
type Block = string | { list: string[] };

const intro: string[] = [
  "This Privacy Notice is for the .ppl Solutions, Inc. website. The website has activated features designed specifically to collect and process your personal information.",
];

const sections: { heading: string; body: Block[] }[] = [
  {
    heading: "Privacy Statement",
    body: [
      ".ppl Solutions, Inc. (The Company) takes your privacy seriously and we are determined to fully protect the security of your personal data in compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012 (DPA).",
      "We will provide details on how we process your personal data and provide a separate privacy notice in an appropriate format and manner whenever we collect personal data through other channels (e.g., publicly facing data processing systems implemented, notices posted at the reception area of our offices where visitors’ personal data is collected through login sheets or security record when personal data is collected according to our corporate policy).",
      "In all instances, we assure you that processing your personal data will strictly follow the provisions of the DPA, especially the general data privacy principles of Transparency, Legitimate Purpose, and Proportionality.",
    ],
  },
  {
    heading: "Personal Data Collected and Manner of Collection",
    body: [
      "We collect the following personal data from you when you manually or electronically submit to us your inquiries or requests:",
      {
        list: [
          "Name",
          "Email Address",
          "Contact Number",
          "Designation",
          "Company Name",
        ],
      },
      "These forms are used by the data subject to submit inquiries, concerns, or register to .ppl Solutions, Inc.",
    ],
  },
  {
    heading: "Basis, Use, and Purpose for Processing of Personal Data",
    body: [
      "In most cases, your consent is solicited to process your personal data, we may also process personal data without your consent when processing is allowed under Section 12 or 13 of the DPA.",
      "In these instances, your personal data is utilized for the following purposes:",
      {
        list: [
          "For documentation and processing of inquiries and requests with Company to enable it and its authorized representatives to properly address them and forward them to the appropriate department for action.",
          "To solicit feedback for the services we provide.",
          "To provide you with the appropriate updates and advisories in an appropriate format and orderly and timely manner.",
          "To comply with a legal obligation to which the Company is subject.",
          "To be able to provide the appropriate action that a data subject may require concerning their data privacy rights.",
        ],
      },
      "Moreover, we may collect other personal data that are relevant and necessary to provide data subject assistance.",
    ],
  },
  {
    heading: "Methods Utilized for Automated Access",
    body: [
      "The Company uses its own first-party, cookieless analytics to understand website traffic and improve our services. We record an approximate location (country and city) derived from your IP address at the network edge; we do not store your IP address. No data is disclosed to any other entity, and no cookies are used for this purpose.",
      "The following web traffic data are processed for this purpose:",
      {
        list: [
          "Your IP address",
          "The pages and internal links accessed on our site",
          "The date and time you visited the site",
          "Geolocation",
          "The referring site or platform (if any) through which you accessed this site",
          "Your operating system",
          "Web browser type",
        ],
      },
    ],
  },
  {
    heading: "Disclosure of Personal Data",
    body: [
      "Personal data processed by the Company is not shared with any other party unless such disclosure is legally allowed under Section 12 or 13 of the DPA which in some instances require court orders.",
    ],
  },
  {
    heading: "Risks Involved",
    body: [
      "Risk refers to the potential of an incident to result in harm or danger to a data subject or organization. Risks may lead to the unauthorized collection, use, disclosure, or access to personal data. It includes risks involving the confidentiality, integrity, and availability of personal data or the risk that processing will violate the general data privacy principles and the rights of data subjects.",
      "The Company ensures that adequate physical, technical, and organizational security measures are in place to protect personal information’s confidentiality, integrity, and availability. However, this does not guarantee absolute protection against certain risks involving the processing of personal data, such as when systems are exposed to targeted cyberattacks, malware, ransomware, and computer viruses or when manual records are accessed without authority.",
      "However, adequate policies are in place to ensure appropriate security incident management in line with existing Company policies, memorandums, and other resolutions.",
    ],
  },
  {
    heading: "Data Protection and Security Measures",
    body: [
      "We are committed to ensuring the confidentiality, integrity, and availability of your personal information by maintaining a combination of organizational, physical, and technical security measures based on generally accepted data privacy and information security standards. Among the measures we implement are the following:",
      {
        list: [
          "Policies on access control in both digital and physical infrastructures to prevent unauthorized access to personal information.",
          "Acceptable use policies.",
          "End-to-end encryption and data classification whenever suitable.",
          "Security measures against natural disasters, power disturbances, external access, and similar threats.",
          "Technical measures to protect our computers and databases against accidental, unlawful, or unauthorized usage, interference, or access.",
          "Third-party services contracted to support data security and infrastructure.",
        ],
      },
    ],
  },
  {
    heading: "Storage and Retention",
    body: [
      "The Company stores files containing personal information in our computers and servers, which are kept in a secure environment. We may also store your personal information with cloud-based third-party data storage providers. We shall ensure that proper measures are adopted to protect your information.",
      "Personal data shall be stored in a database for two (2) years after inquiries and requests are acted upon. After which, records shall be disposed of securely.",
      "Other categories of data may be kept longer than two (2) years when its retention period is determined by other relevant laws and regulations.",
    ],
  },
  {
    heading: "Disposal",
    body: [
      "Physical records shall be disposed of through shredding, while digital files shall be anonymized. In all instances, our manner of disposal shall ensure that the personal information shall no longer be retrieved, processed, or accessed by unauthorized persons.",
    ],
  },
  {
    heading: "Rights of a Data Subject",
    body: [
      "Under the DPA, you have the right to be informed regarding processing the personal information we hold about you.",
      "Further, you may be entitled to request:",
      {
        list: [
          "Access to personal data we process about you. It is your right to obtain confirmation on whether or not data relating to you are being processed;",
          "Rectification of your personal data. This is your right to have your personal data corrected if it is inaccurate or incomplete;",
          "Erasure or order blocking of your personal data whenever warranted;",
          "The right to object if the personal data processing involved is based on consent or on legitimate interest;",
          "The right to data portability through which you may obtain and electronically move, copy, or transfer your data securely for further use.",
        ],
      },
      "Should you think that your personal information has been misused, maliciously disclosed, or improperly disposed of, or that your data privacy rights have been violated, you have a right to file a complaint with the Company.",
    ],
  },
  {
    heading: "Changes to the Privacy Notice",
    body: [
      "The Company reserves the right to update or revise this privacy notice at any time and will provide a new privacy notice whenever there are substantial changes. Prior versions of the privacy notice shall be retained by the Commission and shall be provided to data subjects upon request.",
    ],
  },
];

function Blocks({ body }: { body: Block[] }) {
  return (
    <div className="mt-3 space-y-3 leading-relaxed text-charcoal/80">
      {body.map((block, i) =>
        typeof block === "string" ? (
          <p key={i}>{block}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-purple">
            {block.list.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        image="/services/ppl-it.jpg"
      />

      <Section bg="white">
        <Container size="narrow">
          <div className="space-y-3 leading-relaxed text-charcoal/80">
            <p>
              Our official website is{" "}
              <a
                href={site.url}
                className="font-medium text-purple hover:underline"
              >
                www.pplsolutionsinc.com
              </a>
              .
            </p>
            {intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-xl font-bold text-ink">
                  {section.heading}
                </h2>
                <Blocks body={section.body} />
              </div>
            ))}

            {/* Feedback / Data Protection Officer contact */}
            <div>
              <h2 className="text-xl font-bold text-ink">
                Feedback on our Privacy Notice
              </h2>
              <div className="mt-3 space-y-4 leading-relaxed text-charcoal/80">
                <p>
                  If you have suggestions or comments regarding our privacy
                  statement and notice or for any issues concerning the
                  Company’s data privacy practices, you may reach us through:
                </p>
                <div className="rounded-2xl border border-black/[0.06] bg-mist/60 p-6">
                  <p className="font-semibold text-ink">Joey Lianko</p>
                  <p className="text-sm text-charcoal/60">
                    Data Protection Officer
                  </p>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-charcoal/50">
                    Address
                  </p>
                  <p className="mt-1">
                    Jollibee Plaza, 12 Emerald Ave,
                    <br />
                    San Antonio, Pasig, 1605 Metro Manila
                  </p>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-charcoal/50">
                    Email
                  </p>
                  <p className="mt-1">
                    <a
                      href={`mailto:${dpoEmail}`}
                      className="font-medium text-purple hover:underline"
                    >
                      {dpoEmail}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
