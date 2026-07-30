/**
 * Leadership roster — the single source of truth for the About page fan
 * (LeadershipShowcase) and the Person structured data (LeadershipSchema). Kept out
 * of the client component so the server-rendered schema can import it without
 * pulling the whole interactive showcase into the server graph, and so names,
 * titles, and photos cannot drift between the two.
 */

export type Leader = {
  name: string;
  title: string;
  photo: string;
  /** One entry per paragraph — Joey's and Tina's bios run to two. */
  bio: string[];
  linkedin: string;
};

// Array order == default left-to-right arrangement. Index 2 (Joey) starts
// centred.
// Bio copy is client-supplied (bio.md, 2026-07-29) — do not paraphrase.
export const leaders: Leader[] = [
  {
    name: "Rafael Dayalo",
    title: "Head of Technology",
    photo: "/team/rafael-dayalo.webp",
    bio: [
      "Rafael is a seasoned technology executive with over 15 years of leadership experience in IT management within the online gaming industry. He has successfully led enterprise IT transformation initiatives, aligning technology strategy with business objectives to enhance operational efficiency, resilience, and growth. His expertise spans cloud operations, network architecture, data protection, IT procurement, infrastructure, cybersecurity, and risk management, having overseen multidisciplinary teams across these functions. Known for his strategic leadership and deep technical expertise, Rafael consistently delivers scalable, secure, and innovative technology solutions that support business success.",
    ],
    linkedin: "https://www.linkedin.com/in/rafael-dayalo",
  },
  {
    name: "Tina Loneza",
    title: "Chief People Officer & Co-founder",
    photo: "/team/tina-loneza.webp",
    bio: [
      "Tina is our resident expert for spotting exceptional talent. She is a seasoned HR professional with 20 years of solid experience in human resources and strategic talent acquisition. Tina has managed end-to-end recruitment cycle for corporate and outsourced environment to improve efficiency and effective delivery.",
      "Driven to expand her knowledge, Tina relentlessly pursued other HR areas of expertise such as training and development, employee relations, compensation and benefits, labor laws, performance management, and talent management systems. She is also equipped in handling global mobility and transitioning activities for both local and foreign talents.",
    ],
    linkedin: "https://www.linkedin.com/in/tina-medel-loneza-b53b4b16",
  },
  {
    name: "Joey Lianko",
    title: "Chief Operating Officer & Co-founder",
    photo: "/team/joey-lianko.webp",
    bio: [
      "Joey has over 20 years of experience on his belt for Customer Service, Operations Business Management, and Workforce Management. He also brings to the table his deep understanding of contact center operations, performance management and business improvement — allowing Joey to nurture positive vendor-client relationships with various multinational companies and clients.",
      "As a people manager, he is a strong leader who inspires the best in people and enables them to become agents of transformation.",
    ],
    linkedin: "https://www.linkedin.com/in/joeylianko",
  },
  {
    name: "Apol Macaroyo",
    title: "Sr. Manager for Sales and Client Success",
    photo: "/team/apol-macaroyo.webp",
    bio: [
      "Apol is an accomplished BPO executive with over 20 years of experience leading sales, operations, service delivery, and client success across the APAC region. Having progressed from Sales Agent to Head of Sales, Delivery, and Client Success, she has a proven track record of driving business growth, strengthening client partnerships, and leading high-performing, large-scale teams. Her expertise spans sales strategy, account management, operational excellence, digital transformation, and P&L management, enabling organizations to achieve sustainable growth and operational efficiency. Recognized for her customer-centric leadership and results-driven approach, Apol consistently delivers exceptional client outcomes while building engaged, high-performing teams.",
    ],
    linkedin: "https://www.linkedin.com/in/lizzell-macaroyo-19b5b3149",
  },
  {
    name: "Clari Porras",
    title: "Project Manager",
    photo: "/team/clari-porras.webp",
    bio: [
      "Clari is a Lean Six Sigma Green Belt-certified Project and Process Manager with over five years of experience leading global projects in the BPO industry. She specializes in project governance, process improvement, stakeholder engagement, and vendor management, ensuring seamless execution throughout the project lifecycle. Through strong communication, organization, and cross-functional collaboration, she consistently delivers projects on time while driving operational efficiency and business value.",
    ],
    linkedin: "https://www.linkedin.com/in/karen-clarissa-porras-090588b9",
  },
];

/**
 * Alt text for a leader's portrait. Names the person and their role rather than
 * saying "Portrait of X" — "portrait" describes the format, which a screen
 * reader user already knows from context, whereas the role is the actual
 * information in the image. Also makes each alt unique, which "Portrait of"
 * prefixes tend not to be once a page has five of them.
 */
export const portraitAlt = (leader: Leader) =>
  `${leader.name}, ${leader.title}, .ppl Solutions, Inc.`;
