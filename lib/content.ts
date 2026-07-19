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

/** The .ppl Advantage — 3E's. */
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
    image: "/home/ppl-highfive.png",
    imageAlt: "A team celebrating together with a high five",
    short:
      "Outsourcing and offshoring target labor-cost effectiveness — savings you can reinvest to fuel other pursuits.",
    long: "Outsourcing or Offshoring targets the labor cost effectiveness of your business. It can result in savings that you are able to use to fuel other pursuits of your company. Hiring top caliber employees requires investment in a number of corporate functions including talent acquisition, human resources, training and facilities. You need to find the right partner that will handle hiring and retaining top talents which allows you to focus on core business functions.",
  },
  {
    key: "efficient",
    title: "Efficient & Effective",
    icon: Gauge,
    image: "/home/ppl-write.png",
    imageAlt: "Two colleagues reviewing notes together at a desk",
    short:
      "Refine and enhance your processes — turning challenges into opportunities and unburdening your business from repetitive work.",
    long: ".ppl Solutions, Inc.'s team of experts are dedicated to improving your workflow. Business process improvements refine and enhance your processes by identifying problem areas and recommending modifications to turn challenges into opportunities. This constant improvement results in increased efficiency and productivity, ensuring a seamless transition to a more efficient and effective business model.",
  },
  {
    key: "evolving",
    title: "Evolving & Elevating",
    icon: TrendingUp,
    image: "/home/ppl-meet.png",
    imageAlt: "Professionals collaborating in a meeting around a table",
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
    title: "Sales & Telemarketing",
    icon: PhoneCall,
    blurb:
      "Existing or potential customers are contacted to sell a product or service.",
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

/** FAQ (resources/faq). */
export const faqs: { question: string; answer: string[] }[] = [
  {
    question: "Why the Philippines?",
    answer: [
      "The Philippines is an amazing country with equally outstanding people. Filipinos are known around the world for their friendliness, positive attitude, and being service oriented. They smile at the face of challenges and quickly adapt to situations. They are avid learners and English is almost second nature to them. They are a nation of proud and skilled people.",
      "Filipinos are a perfect choice for your business. They are hospitable, agile, driven, adaptable, and empathic. They care for your business as they care for their families. Choose the Philippines and experience working with game changers and a culture of always striving for excellence.",
    ],
  },
  {
    question: "Offshoring and Outsourcing — what's the difference?",
    answer: [
      "Although they share a common goal of employing the best talent to push for your business agenda, offshoring and outsourcing are two different strategies.",
      "Offshoring: You select your own qualified team members based on your skill requirements and job description. Team members follow your processes and procedures, and you have direct control over their performance and compensation.",
      "Outsourcing: Team members are hired by your provider based on agreed qualifications and skills. The provider may recommend enhancements to your processes, and manages staff performance and productivity to ensure committed client service levels are met.",
    ],
  },
  {
    question: "What are the benefits of offshoring and outsourcing?",
    answer: [
      "Economical — Typically, it results in staff cost reduction. The cost of labor for outsourced or offshored talent is lower compared to your onshore people.",
      "Efficient and Effective — It may lead to workflow improvements that promote efficiency and productivity. Policies and processes are constantly reviewed to improve customer experience and satisfaction.",
      "Evolving and Elevating — As you expand, new capabilities are required to support your optimized process and drive profitability. Outsourcing / Offshoring lets you scale as you reach different levels of strategic partnership and elevate your operating models.",
    ],
  },
  {
    question: "Why choose .ppl Solutions, Inc.?",
    answer: [
      "We have the right people. Our leaders have more than 60 years of combined experience in the BPO industry, earning in-depth knowledge of the offshoring and outsourcing industry by working with local and global teams.",
      ".ppl Solutions, Inc. is also the place for driven and outstanding people. Our professionals work collaboratively and thrive in our culture of success — in an environment that promotes well-being and shares the ideology that “Happy .ppl create Happy Customers”.",
    ],
  },
  {
    question: "Who will help me design my solution and build my team?",
    answer: [
      ".ppl Solutions, Inc.'s TRI-ACE Team is a special action team that will assist you in transitioning your business. This team is composed of process analysts and managers, business consultants, and other experts with extensive experience that ensures an effective and winning ramp.",
      "We will listen to your needs and partner with you every step of the way — from mapping processes and creating integrated frameworks to designing robust and dynamic business solutions — until project implementation. Whether you partner with us for an outsourcing or offshoring model, our TRI-ACE team will be there to transform your business.",
    ],
  },
  {
    question: "How do I get started?",
    answer: [
      "We make a commitment to provide a solution and create our framework of success for your outsourcing / offshoring journey through our 3Ds framework — Discover, Design, and Deliver.",
      "Discovery is the first step to understanding you and aligning with your business operations. Our ACE (assess, calibrate, and establish baseline) approach to Discovery assures a robust partnership and project implementation.",
      "Business modelling and process mapping are done in the Design phase to ensure the right solutions are implemented and rolled out effectively. Delivery is the last step — once the ideal solution is finalized and approved, we transition and integrate with your business, working with transparency and integrity to successfully deliver solutions.",
    ],
  },
];
