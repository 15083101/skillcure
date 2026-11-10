// Community content. All copy mirrors skillcures.in/community.

export const SITE = 'https://www.skillcures.in';

export const C = {
  bg: '#04081a',
  ink: '#f4f7ff',
  cobalt: '#0253eb',
  sky: '#3b7bff',
  teal: '#06c6ad',
  deepteal: '#018f9d',
  ember: '#f08a24',
  pink: '#ff9fbb',
};

// One entry per camera stop. `file` groups stops under the top tabs.
export const CHAPTERS = [
  { id: 'hub', file: 'community.hub', name: 'Community' },
  { id: 'alone', file: 'community.hub', name: 'Isolated' },
  { id: 'together', file: 'community.hub', name: 'Connected' },
  { id: 'learn', file: 'pillars.section', name: 'Learn', pillar: 0 },
  { id: 'connect', file: 'pillars.section', name: 'Connect', pillar: 1 },
  { id: 'collaborate', file: 'pillars.section', name: 'Collaborate', pillar: 2 },
  { id: 'discover', file: 'pillars.section', name: 'Discover', pillar: 3 },
  { id: 'grow', file: 'pillars.section', name: 'Grow', pillar: 4 },
  { id: 'calendar', file: 'events.section', name: 'Calendar' },
  { id: 'events', file: 'events.section', name: 'Events' },
  { id: 'circles', file: 'circles.section', name: 'Circles' },
  { id: 'aman', file: 'stories.section', name: 'Aman', story: 0 },
  { id: 'divya', file: 'stories.section', name: 'Divya', story: 1 },
  { id: 'karthik', file: 'stories.section', name: 'Karthik', story: 2 },
  { id: 'join', file: 'join.section', name: 'Join' },
];

export const PILLARS = [
  {
    n: '01', kicker: 'Masterclasses & Frameworks', name: 'Learn',
    body: 'Access weekly clinics, case studies, and live masterclasses from veteran pharma practitioners.',
    points: ['Real-World Workflow Clinics', 'AI & Computational Chemistry', 'Direct Practitioner Q&A'],
    stat: '48+', statLabel: 'Hours of live clinics every quarter',
    cta: 'Explore Learning Circles', go: 'circles', img: 'community/pillars/learn.webp', color: C.sky,
  },
  {
    n: '02', kicker: 'Members across India', name: 'Connect',
    body: 'Break campus and regional silos. Network with ambitious peers and alumni across India and globally.',
    points: ['Verified Peer Directory', 'Alumni in Top MNCs', 'City & Interest Circles'],
    stat: '120+', statLabel: 'Institutions & pharma campuses represented',
    cta: 'Find Your Circle', go: 'circles', img: 'community/pillars/connect.webp', color: C.teal,
  },
  {
    n: '03', kicker: 'Idea Incubator', name: 'Collaborate',
    body: 'Form cross-functional teams. Pair formulation scientists with coders to build patents & projects.',
    points: ['Skill-Pairing Matchmaking', 'Hackathons & Grand Challenges', 'Patent & IP Guidance'],
    stat: '32', statLabel: 'Collaborative research projects launched',
    cta: 'Join a Hackathon', go: 'events', filter: 'Hackathon', img: 'community/pillars/collaborate.webp', color: C.ember,
  },
  {
    n: '04', kicker: 'Curated Pipeline', name: 'Discover',
    body: 'Stay 3 steps ahead with curated off-campus openings, research grants, and industry policy shifts.',
    points: ['Off-Campus Job & Internship Radar', 'Grant Calls & Fellowships', 'Regulatory Intelligence'],
    stat: '15+', statLabel: 'New opportunities & grant alerts weekly',
    cta: 'View Upcoming Events', go: 'events', img: 'community/pillars/discover.webp', color: C.pink,
  },
  {
    n: '05', kicker: 'Career Elevation', name: 'Grow',
    body: 'Sharpen your interviews, receive portfolio reviews, and build verifiable credibility in the industry.',
    points: ['1-on-1 Portfolio Teardowns', 'Mock Technical Panels', 'Verified Skill Badges'],
    stat: '89%', statLabel: 'Report higher confidence in technical interviews',
    cta: 'Read Member Stories', go: 'stories', img: 'community/pillars/grow.webp', color: C.teal,
  },
];

export const EVENT_TYPES = ['Webinar', 'Workshop', 'Meetup', 'Hackathon', 'Seminar'];
export const TYPE_COLOR = { Webinar: C.sky, Workshop: C.teal, Meetup: C.pink, Hackathon: C.ember, Seminar: '#8f7bff' };
const TONE = { cobalt: C.cobalt, sky: '#1f4fd6', teal: '#028f83', ember: '#9a5300' };

export const EVENTS = [
  { type: 'Webinar', title: 'Know Your Rights at Work: Employment Law for Pharma Professionals', description: 'Offer letters, service bonds, notice periods and non-competes — what is enforceable, what is not, and how to protect yourself before you sign.', date: '29 Oct 2026', time: '6:00 PM - 7:00 PM IST', speaker: ['Adv. Meera Iyer', 'Employment & IP Counsel', 'Bengaluru High Court', 'MI', 'cobalt'], mode: 'Online · Live Stream', reg: 260, seats: 400, tags: ['Employment Law', 'Offer Letters', 'Service Bonds'], poster: 'community/events/webinar-know-your-rights.jpg' },
  { type: 'Webinar', title: 'Pharma Business Trends & Start-up Strategies', description: 'Where Indian pharma money is moving next, and how founders from formulation and analytics backgrounds are building companies around it.', date: '14 Nov 2026', time: '8:00 PM - 9:30 PM IST', speaker: ['Rohan Kapoor', 'Founder & Venture Partner', 'BioBridge Ventures', 'RK', 'sky'], mode: 'Online · Live Stream', reg: 380, seats: 500, tags: ['Start-ups', 'Business Trends', 'Funding'], poster: 'community/events/webinar-business-strategies.jpg' },
  { type: 'Webinar', title: 'Build a Better You: Career Mindset for Pharma Freshers', description: 'Habits, confidence and the first-year decisions that separate a job from a career — a live session with a career and mindset coach.', date: '24 Nov 2026', time: '9:00 AM - 10:30 AM IST', speaker: ['Arjun Mehta', 'Career & Mindset Coach', 'SkillCures Mentor Network', 'AM', 'ember'], mode: 'Online Seminar', reg: 210, seats: 300, tags: ['Career Growth', 'Mindset', 'Freshers'], poster: 'community/events/webinar-build-a-better-you.jpg' },
  { type: 'Workshop', title: 'Building Your First AI Product in Pharma & Biotech', description: 'A deep dive into how modern LLMs, molecular graph models, and generative chemistry are changing target identification and drug formulation.', date: '24 Oct 2026', time: '6:00 PM - 7:30 PM IST', speaker: ['Dr. Radhika Sharma', 'Principal AI Scientist', 'Former industry AI scientist', 'RS', 'sky'], mode: 'Hands-on · Online', reg: 420, seats: 500, tags: ['Artificial Intelligence', 'Drug Discovery', 'Python'] },
  { type: 'Workshop', title: 'US-FDA 505(b)(2) & ANDA Regulatory Dossier Masterclass', description: 'Hands-on workshop breaking down real electronic common technical document (eCTD) submissions, deficiency letters, and bioequivalence protocols.', date: '02 Nov 2026', time: '4:00 PM - 6:30 PM IST', speaker: ['Vikram Malhotra', 'VP Regulatory Affairs & QA', 'Global Regulatory Fellow', 'VM', 'teal'], mode: 'Interactive Lab', reg: 310, seats: 350, tags: ['Regulatory Affairs', 'US-FDA', 'eCTD'] },
  { type: 'Workshop', title: 'Python for Pharmacovigilance: Signal Detection From Scratch', description: 'Build a working disproportionality analysis on public FAERS data — from raw case reports to a ranked list of safety signals — in one evening.', date: '08 Dec 2026', time: '5:00 PM - 8:00 PM IST', speaker: ['Dr. Neha Bansal', 'PV Data Science Lead', 'Global Safety CRO', 'NB', 'teal'], mode: 'Hands-on · Online', reg: 145, seats: 200, tags: ['Pharmacovigilance', 'Python', 'FAERS'] },
  { type: 'Meetup', title: 'Pharma Placement Blueprint: QA, QC & PV Interview Breakdowns', description: 'Recent grads and senior talent managers review top mock interview questions, technical tests, and what hiring managers actually look for.', date: '18 Nov 2026', time: '7:00 PM - 8:30 PM IST', speaker: ['Anita Roy', 'Head of Pharma Talent', 'Industry alumni circle', 'AR', 'cobalt'], mode: 'Online · Live Stream', reg: 512, seats: 600, tags: ['Placements', 'QA & QC', 'Mock Interviews'] },
  { type: 'Meetup', title: 'Hyderabad Pharma Circle: Genome Valley Evening', description: "An in-person evening for students and early-career scientists in Hyderabad — short talks, open networking, and seniors from the city's CDMOs.", date: '05 Dec 2026', time: '6:30 PM - 9:00 PM IST', speaker: ['SkillCures Hyderabad Circle', 'Local Chapter Hosts', 'Genome Valley', 'HC', 'teal'], mode: 'In person · Hyderabad', reg: 96, seats: 120, tags: ['Networking', 'Hyderabad', 'CDMO'] },
  { type: 'Meetup', title: 'Women in Pharma R&D: An Evening Roundtable', description: 'Scientists and managers on promotions, returning after a break, and the conversations nobody has in an interview — candid, small and online.', date: '12 Dec 2026', time: '7:00 PM - 8:30 PM IST', speaker: ['Dr. Priya Raman', 'Director, Formulation R&D', 'Women in Pharma Collective', 'PR', 'sky'], mode: 'Online · Roundtable', reg: 132, seats: 150, tags: ['Women in Science', 'Careers', 'R&D'] },
  { type: 'Hackathon', title: 'SkillCures Bio-Innovate National Hackathon 2026', description: '48-hour sprint solving 5 real-world pharma challenges: formulation stability prediction, automated pharmacovigilance signals, and smart pill dispensaries.', date: '12 Nov - 14 Nov 2026', time: 'Weekend Virtual Sprint', speaker: ['SkillCures Innovation Council', 'Mentor Panel & Jury', 'Top CDMOs & VC Partners', 'SC', 'ember'], mode: 'Virtual Hackathon', reg: 840, seats: 1000, tags: ['₹2,50,000 Prizes', 'Incubation', 'Teams of 2-4'] },
  { type: 'Hackathon', title: 'PV Signals Datathon: Find the Next Safety Alert', description: 'Teams get a year of anonymised adverse-event reports and 24 hours to surface the signals a regulator would want to see first.', date: '19 Dec 2026', time: '24-hour Sprint', speaker: ['Drug Safety Guild', 'Problem Setters & Jury', 'PV leads from 4 CROs', 'DS', 'cobalt'], mode: 'Virtual Datathon', reg: 310, seats: 400, tags: ['Data Science', 'Drug Safety', 'Teams of 2-3'] },
  { type: 'Hackathon', title: 'Smart Dispensary Hardware Hack', description: 'Prototype a low-cost dispensing aid for elderly patients — sensors, reminders and dose logging — with pharmacists and engineers on every team.', date: '09 Jan - 10 Jan 2027', time: 'Weekend Build', speaker: ['SkillCures Makers Lab', 'Hardware Mentors', 'Engineering & pharmacy alumni', 'ML', 'teal'], mode: 'Hybrid · Pune & Online', reg: 88, seats: 150, tags: ['Hardware', 'Patient Care', 'Prototyping'] },
  { type: 'Seminar', title: "From Academic Research to Patent Protection: A Formulator's Guide", description: 'Step-by-step roadmap for turning thesis research or novel excipient blends into protected IP without expensive attorney retainers.', date: '26 Nov 2026', time: '5:30 PM - 7:00 PM IST', speaker: ['Dr. S. K. Narang', 'Patent Attorney & Professor', 'Indian Patent Office Registered', 'SN', 'teal'], mode: 'Hybrid · Delhi & Virtual', reg: 195, seats: 250, tags: ['Patents', 'Formulation', 'IP Law'] },
  { type: 'Seminar', title: 'Clinical Trials in India: The New CDSCO Rules, Explained', description: 'What the latest New Drugs and Clinical Trials amendments change for sponsors, sites and the CRAs who run them — with time for questions.', date: '03 Dec 2026', time: '4:00 PM - 5:30 PM IST', speaker: ['Dr. Anil Deshpande', 'Clinical Operations Head', 'Former regulatory reviewer', 'AD', 'cobalt'], mode: 'Hybrid · Mumbai & Virtual', reg: 175, seats: 250, tags: ['Clinical Trials', 'CDSCO', 'Regulation'] },
  { type: 'Seminar', title: 'Careers in Regulatory Affairs: A Panel Seminar', description: 'Four RA professionals — domestic, US, EU and emerging markets — on how they got in, what the work is really like, and where it is heading.', date: '10 Dec 2026', time: '6:00 PM - 7:30 PM IST', speaker: ['RA Leaders Panel', 'Four Regulatory Heads', 'Leading pharma companies', 'RA', 'ember'], mode: 'Online · Panel', reg: 228, seats: 300, tags: ['Regulatory Affairs', 'Careers', 'Panel'] },
].map((e) => ({ ...e, toneColor: TONE[e.speaker[4]] ?? C.cobalt, left: e.seats - e.reg }));

export const CIRCLES = [
  { n: '01', name: 'AI & Tech', body: 'Drug-design models, chemoinformatics and lab automation.', tags: ['AI docking', 'Python'], lead: 'Dr. Radhika Sharma', status: 'Hot', members: 1240, img: 'community/circles/ai.webp', color: C.sky },
  { n: '02', name: 'Careers', body: 'Interview prep, salary benchmarks and resume reviews for pharma roles.', tags: ['QA/QC mocks', 'PV prep'], lead: 'Anita Roy', status: 'Hot', members: 2150, img: 'community/circles/careers.webp', color: C.teal },
  { n: '03', name: 'Clinical & RA', body: 'FDA, EMA and CDSCO filings, audits and good clinical practice.', tags: ['eCTD', 'ICH guidelines'], lead: 'Vikram Malhotra', status: 'Active', members: 1120, img: 'community/circles/regulatory.webp', color: '#8f7bff' },
  { n: '04', name: 'Startups', body: 'Student biotech ventures, BIRAC grants and patent filing.', tags: ['BIRAC grants', 'Pitch decks'], lead: 'Karthik Menon', status: 'Hot', members: 780, img: 'community/circles/startups.webp', color: C.ember },
  { n: '05', name: 'Data & SAS', body: 'Clinical-trial analytics with SAS, CDISC and R.', tags: ['CDISC', 'SAS macros'], lead: 'Priya Sundaram', status: 'Active', members: 820, img: 'community/circles/data.webp', color: '#2fd3ff' },
  { n: '06', name: 'Medical Writing', body: 'Protocols, abstracts and scientific storytelling.', tags: ['Protocols', 'Abstracts'], lead: 'Divya Nair', status: 'Active', members: 540, img: 'community/circles/writing.webp', color: C.pink },
];
export const MEMBERS_TOTAL = CIRCLES.reduce((s, c) => s + c.members, 0);

export const STORIES = [
  {
    badge: 'Patent Track Success', lead: 'Every idea needs a partner.', turn: 'This was his.',
    intro: 'Aman had a transdermal formulation and nobody to model it with. One pitch in the Idea Incubator found him a bioinformatics partner in two days — and a patent attorney to mentor them both.',
    quote: 'I found my project partner and co-filed a provisional patent through SkillCures.',
    author: 'Aman Verma', initials: 'AV', title: 'Formulation Researcher & Co-Patenter', inst: 'M.Pharm, a national pharmacy institute',
    before: 'Had developed a novel transdermal formulation concept but was working in isolation with no computational partner to model permeability coefficients.',
    community: 'Posted a pitch in the SkillCures Idea Incubator; connected with a bioinformatics scholar in the AI & Tech group within 48 hours. Mentored by senior patent attorney Dr. Narang.',
    result: 'Co-authored a research paper and successfully filed an Indian provisional patent. Currently entering pre-clinical cell permeation trials.',
    metric: 'Provisional Patent', metricLabel: 'Indian Patent Office Registered',
    shape: 'merge', path: ['Formulation idea', 'Bioinformatics partner', 'Idea Incubator · 48 h', 'Provisional patent'],
    img: 'community/stories/formulation-bench.webp', caption: 'A formulation bench', color: C.teal,
  },
  {
    badge: 'Placement Breakthrough', lead: 'Every career has a turning point.', turn: 'Hers was a webinar.',
    intro: 'Divya was collecting rejections with no feedback attached. One masterclass, one mentor and three mock panels later, she was choosing between two tier-1 offers.',
    quote: 'A single webinar introduced me to the mentor who transformed my career trajectory.',
    author: 'Divya Sundaram', initials: 'DS', title: 'Regulatory Affairs Specialist', inst: 'M.Pharm Graduate · Now in regulatory affairs',
    before: 'Uncertain between academic teaching and corporate industry roles; was receiving generic rejections for QA and Regulatory Affairs openings without feedback.',
    community: 'Attended the US-FDA Dossier Masterclass hosted by Vikram Malhotra. Booked a 1-on-1 resume tear-down and participated in 3 mock technical interviews in the Career Group.',
    result: 'Secured two tier-1 pharma offers within 6 weeks; joined a leading pharma company’s Regulatory Affairs division with complete confidence in eCTD documentation.',
    metric: '2 Tier-1 Offers', metricLabel: 'Leading pharma companies',
    shape: 'split', path: ['Rejections, no feedback', 'Masterclass · mentor · 3 mocks', 'Tier-1 offer', 'Tier-1 offer'],
    img: 'community/stories/offer-signing.webp', caption: 'Signing the offer, Hyderabad', color: C.sky,
  },
  {
    badge: 'Startup Incubation', lead: 'Every lab keeps a logbook.', turn: 'His became a company.',
    intro: 'Karthik was tired of expired reagents and hand-written inventory. The Startups circle gave him a developer and thirty lab heads to test on — and a hackathon gave him a grant.',
    quote: 'I came with an unvalidated lab idea. The community helped me build it into a funded venture.',
    author: 'Karthik Menon', initials: 'KM', title: 'Founder, SmartLab Solutions', inst: 'ICT Mumbai Graduate',
    before: 'Solo researcher frustrated by manual chemical inventory logging and expiration spoilage in university laboratories, with zero software dev knowledge.',
    community: 'Shared the problem statement in the Startups & Innovation circle; recruited a full-stack developer and gathered operational feedback from 30+ pharmacy college lab heads.',
    result: 'Won 1st prize at the SkillCures Bio-Innovate Hackathon, followed by a ₹50 Lakh government biotechnology ignition grant. Now piloting across 12 institutions.',
    metric: '₹50L Grant & 12 Pilots', metricLabel: 'BIRAC BIG Recipient',
    shape: 'fan', path: ['Hand-written lab logbook', 'Startups circle · hackathon win', '12 pilot institutions'],
    img: 'community/stories/reagent-shelf.webp', caption: 'The inventory problem, ICT Mumbai', color: C.ember,
  },
];

// Where members are (lon, lat): the cities and hubs named across the page.
export const CITIES = [
  ['Delhi', 77.21, 28.61], ['Mumbai', 72.88, 19.08], ['Bengaluru', 77.59, 12.97], ['Hyderabad', 78.49, 17.39],
  ['Chennai', 80.27, 13.08], ['Kolkata', 88.36, 22.57], ['Pune', 73.86, 18.52], ['Ahmedabad', 72.57, 23.02],
  ['Chandigarh', 76.78, 30.73], ['Manipal', 74.79, 13.35], ['Jaipur', 75.79, 26.91], ['Guwahati', 91.74, 26.14],
];
export const CITY_LINKS = [[0, 1], [0, 8], [0, 10], [1, 6], [1, 7], [1, 3], [3, 2], [3, 4], [2, 9], [2, 4], [0, 5], [5, 11], [3, 0], [6, 2], [7, 10], [5, 4]];

// Event dates as day numbers (for the calendar river)
const MONTHS = { Oct: 9, Nov: 10, Dec: 11, Jan: 12 };
export function eventDay(e) {
  const m = e.date.match(/^(\d+)\s+(\w{3})/);
  const year = /2027/.test(e.date) ? 1 : 0;
  const month = MONTHS[m[2]] + (m[2] === 'Jan' ? 0 : 0);
  return Date.UTC(2026 + year, month === 12 ? 0 : month, +m[1]) / 86400000;
}
