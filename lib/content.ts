import type { LucideIcon } from "lucide-react";
import {
  LineChart,
  ShoppingBag,
  Factory,
  Zap,
  HeartPulse,
  Cpu,
  Search,
  PencilRuler,
  Rocket,
  PiggyBank,
  Gauge,
  TrendingUp,
  Headset,
  Wrench,
  PhoneCall,
  ReceiptText,
  Users,
  Database,
  Server,
  Calculator,
  Keyboard,
} from "lucide-react";

/** Industry Expertise strip (home marquee). */
export const industries: { label: string; icon: LucideIcon }[] = [
  { label: "Financial Markets", icon: LineChart },
  { label: "Consumer & Retail", icon: ShoppingBag },
  { label: "Manufacturing & Industries", icon: Factory },
  { label: "Energy", icon: Zap },
  { label: "Healthcare", icon: HeartPulse },
  { label: "Technology", icon: Cpu },
];

/** The .ppl Strategy — 3Ds (home short versions). */
export const threeDs: {
  key: string;
  title: string;
  icon: LucideIcon;
  blurb: string;
}[] = [
  {
    key: "discover",
    title: "Discover",
    icon: Search,
    blurb:
      "Starting a new journey is the perfect opportunity to evaluate operations, set objectives, and establish roadmaps. Trust us to be the partner that realizes your business goals.",
  },
  {
    key: "design",
    title: "Design",
    icon: PencilRuler,
    blurb:
      "Our design phase takes your business to the next level with expertly designed solution modeling. Our simulations manage risks and standardize processes for a smooth implementation.",
  },
  {
    key: "deliver",
    title: "Deliver",
    icon: Rocket,
    blurb:
      "Delivery is when the plans are put into action. We set up monitoring and control, establish a feedback mechanism, and collaborate to ensure service levels are met.",
  },
];

/** The .ppl Advantage — 3Es. */
export const threeEs: {
  key: string;
  title: string;
  icon: LucideIcon;
  image: string;
  imageAlt: string;
  short: string;
  long: string;
}[] = [
  {
    key: "economical",
    title: "Economical",
    icon: PiggyBank,
    image: "/home/ppl-3es-economical-celebration.webp",
    imageAlt: "An offshore team celebrating a project win around a laptop",
    short:
      "Outsourcing and offshoring target labor-cost effectiveness — savings you can reinvest to fuel other pursuits.",
    long: "Outsourcing or Offshoring targets the labor cost effectiveness of your business. It can result in savings that you are able to use to fuel other pursuits of your company. Hiring top caliber employees requires investment in a number of corporate functions including talent acquisition, human resources, training and facilities. You need to find the right partner that will handle hiring and retaining top talents which allows you to focus on core business functions.",
  },
  {
    key: "efficient",
    title: "Efficient & Effective",
    icon: Gauge,
    image: "/home/ppl-3es-efficient-team-review.webp",
    imageAlt: "Team members reviewing work together at a shared monitor",
    short:
      "Refine and enhance your processes — turning challenges into opportunities and unburdening your business from repetitive work.",
    long: ".ppl Solutions, Inc.'s team of experts are dedicated to improving your workflow. Business process improvements refine and enhance your processes by identifying problem areas and recommending modifications to turn challenges into opportunities. This constant improvement results in increased efficiency and productivity, ensuring a seamless transition to a more efficient and effective business model.",
  },
  {
    key: "evolving",
    title: "Evolving & Elevating",
    icon: TrendingUp,
    image: "/home/ppl-3es-evolving-whiteboard.webp",
    imageAlt: "Colleagues planning next steps at a whiteboard covered in notes",
    short:
      "Business process re-engineering drives growth — rethinking your paradigm and redesigning processes without compromising success.",
    long: "For long standing businesses, business process re-engineering drives growth. It looks into your whole business to identify areas of opportunity for increased proficiency — rethinking your paradigm, redesigning your processes, and reevaluating your strategies. The right partner is crucial to bringing your re-engineering vision to life without compromising your success and best practices.",
  },
];

/** Front-office services. */
export const frontOffice: {
  title: string;
  icon: LucideIcon;
  blurb: string;
}[] = [
  {
    title: "Customer Service",
    icon: Headset,
    blurb:
      "A platform to field customer inquiries for a product or service, process orders, or resolve customer issues.",
  },
  {
    title: "Technical Support",
    icon: Wrench,
    blurb:
      "Focused on resolving technical issues related to a product or service encountered by customers.",
  },
  {
    title: "Sales and Lead Generation",
    icon: PhoneCall,
    blurb:
      "Identify, engage, and qualify potential customers to build a healthy pipeline and drive sales.",
  },
  {
    title: "Billing & Collections",
    icon: ReceiptText,
    blurb:
      "Support businesses by handling billing, invoicing, and collection activities.",
  },
];

/** Back-office services. */
export const backOffice: {
  title: string;
  icon: LucideIcon;
  blurb: string;
}[] = [
  {
    title: "Human Resources",
    icon: Users,
    blurb:
      "Design better programs across leave management, total rewards, recruitment, performance consulting, and more.",
  },
  {
    title: "Data Mining & Analytics",
    icon: Database,
    blurb:
      "Unlock the power of big data for insights on customers, operations, and business activities to guide strategy.",
  },
  {
    title: "IT Support",
    icon: Server,
    blurb:
      "Handle technical issues and IT infrastructure support that lifts customer satisfaction and retention.",
  },
  {
    title: "Finance & Accounting",
    icon: Calculator,
    blurb:
      "Income tax, cash flow, accounts payable, and accounts receivable support with accuracy and efficiency.",
  },
  {
    title: "Data Entry",
    icon: Keyboard,
    blurb:
      "Encode and process large data logs with high levels of accuracy, efficiency, and cost effectiveness.",
  },
];

/** Industries supported (services page list). */
export const industriesSupported = [
  "IT, Software Development, and Animation",
  "Telecommunications",
  "Retail and e-Commerce",
  "Healthcare",
  "Banking, Financial Services and Insurance",
  "Manufacturing",
];

/** Industries supported — photo showcase for the scroll-reveal on the services
 * page. Order sets the reveal sequence (each frame grows from 50% → 100%). */
export const industryShowcase: {
  label: string;
  image: string;
  alt: string;
}[] = [
  {
    label: "IT, Software Development & Animation",
    image: "/services/ppl-it.webp",
    alt: "Software developers collaborating at their workstations",
  },
  {
    label: "Telecommunications",
    image: "/services/ppl-comms.webp",
    alt: "Telecommunications network and connectivity",
  },
  {
    label: "Retail & e-Commerce",
    image: "/services/ppl-ecom.webp",
    alt: "Online retail and e-commerce fulfilment",
  },
  {
    label: "Healthcare",
    image: "/services/ppl-health.webp",
    alt: "Healthcare professionals supporting patients",
  },
  {
    label: "Banking, Financial Services & Insurance",
    image: "/services/ppl-bank.webp",
    alt: "Banking and financial services",
  },
  {
    label: "Manufacturing",
    image: "/services/ppl-manufacture.webp",
    alt: "Modern manufacturing operations",
  },
];

/** FAQ (resources/faq). */
export const faqs: { question: string; answer: string[] }[] = [
  {
    question: "Why the Philippines?",
    answer: [
      "The strongest resource of the Philippines has always been its people and its culture. Nothing comes close to the Filipino work attitude and hospitality — friendly, with seemingly endless smiles regardless of the situation, which makes every Filipino a perfect fit for the customer service industry.",
      "Filipinos are also well known for their resiliency and adaptability, able to quickly adjust to any condition, and are deeply empathetic.",
      "As a people, we pride ourselves on prioritizing education. With English as the primary medium of instruction, it has become a second language to many — making the Philippines one of the Asian countries with the highest English proficiency levels.",
      "Overall, while great communication skills are a definite advantage, it is the customer orientation, resiliency, and adaptability that each Filipino brings that are the real game changers.",
    ],
  },
  {
    question: "What is the difference between offshoring and outsourcing?",
    answer: [
      "Both involve employing highly skilled and qualified staff to fill roles within a separate business or for another client. The difference lies in who selects the team and who manages it.",
      "Offshoring — You select your own qualified team members based on your skill requirements and job description. Team members follow your processes and procedures, and you have direct control over their performance and compensation.",
      "Outsourcing — Team members are hired by your provider based on the qualifications and skills agreed upon to perform the outsourced work. The provider may recommend enhancements to your processes and procedures, and manages staff performance and productivity to ensure that committed client service levels are met.",
    ],
  },
  {
    question: "What are the benefits of offshoring and outsourcing?",
    answer: [
      "We think of them as the three Es of outsourcing.",
      "Economical — An outright reduction in staffing cost. Outsourcing typically costs less than having the same jobs performed onshore, where labor costs are higher, before accounting for the other overheads of employing internally for those roles. Retaining high-quality talent also delivers long-term savings, as employees become more productive with skill and experience.",
      "Efficient and Effective — Workflow improvements that increase efficiency and productivity. Offshoring and outsourcing often lead to recommended process and policy enhancements, intended not just to improve processing time but to improve overall customer experience and satisfaction.",
      "Evolving and Elevating — Building new capabilities that support optimized process capability and increased business profitability, and reaching new levels of strategic partnership that push for the expansion of current and new business — creating and elevating standards of operating business models.",
    ],
  },
  {
    question: "Why choose .ppl Solutions, Inc.?",
    answer: [
      "Executives with more than 100 years of combined experience in Business Process Outsourcing — self-made leaders who have risen from the ranks, with firsthand experience of outsourcing and offshoring global teams.",
      "We are driven by employees who work in a collaborative environment that fosters the ideology that “Happy .ppl create Happy Customers”.",
      "We promote a culture of winning and success built on trust, excellence and .ppl — uncompromising in our pursuit of a well-balanced lifestyle of professional and personal achievement, and overall well-being.",
    ],
  },
  {
    question: "Who will help me build my team?",
    answer: [
      ".ppl Solutions, Inc.'s TRI-ACE Team is a specially designed team that will help you transition your business, whether you take the offshoring or the outsourcing path. It is composed of process analysts, project managers, business consultants and other experts who can guide you from the beginning to the end of the transition process.",
      "Each member has extensive experience in successfully managing a variety of project launches, equipping them with the skills that ensure an effective and winning ramp.",
      "From the initial touch point, to mapping simple and complex processes, creating strategic yet integrated frameworks and building robust and dynamic business solutions, we work in partnership with your team until project implementation.",
      "Depending on the partnership model you choose to have with .ppl Solutions, Inc., the TRI-ACE Team will help ensure a successful journey of transforming your business.",
    ],
  },
  {
    question: "How do I get started?",
    answer: [
      "At .ppl Solutions, Inc., we made a commitment to our clients to design a framework of success for their outsourcing and offshoring journey — our 3Ds framework of Discover, Design, and Deliver.",
      "Discovery is the first step in understanding the client and aligning with the business operations. Calibration, scoping and in-depth analysis lead to invaluable breakthroughs that prevent pitfalls and failures. Our ACE (assess, calibrate and establish baseline) approach to Discovery assures an outstanding partnership and project implementation.",
      "During Design, business modelling and process mapping are some of the critical activities we do to ensure the right solutions are implemented and rolled out.",
      "Once the ideal solution has been finalized, we will transition, ramp and integrate your business into the .ppl Solutions, Inc. way of doing business.",
    ],
  },
];
