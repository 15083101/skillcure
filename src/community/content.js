// Community redesign — all copy for the six features, shared by the 2D and 3D pages.
// Events and people come from skillcures.in; resumes are illustrative samples (labelled as such).
import { EVENTS as COMMUNITY_EVENTS, SITE } from './data.js';

export { SITE };
export const SIGNUP = `${SITE}/signup/`;

/** Where form submissions go. null = preview mode (nothing is sent; the UI says so). */
export const FORM_ENDPOINT = null;

export const HERO = {
  kicker: 'SkillCures Community',
  title: ['Where pharma careers', 'are built together.'],
  lede: 'Events from across the industry, sessions led by people who do the work, honest writing about the field, and real examples to learn from. One community for students, professionals and everyone in between.',
  stats: [['18', 'events this season'], ['6', 'ways to take part'], ['700+', 'colleges & pharma hubs'], ['Free', 'for students']],
};

export const FEATURES = [
  { id: 'events', n: '01', name: 'Events', line: 'Every pharma event in India, in one calendar.', color: '#3b8bff' },
  { id: 'sessions', n: '02', name: 'Mentor sessions', line: 'Teach what you know. Bring your own link.', color: '#06c6ad' },
  { id: 'journal', n: '03', name: 'The Journal', line: 'Field notes from the SkillCures team.', color: '#f6a53a' },
  { id: 'ambassadors', n: '04', name: 'Campus ambassadors', line: 'Bring the community to your campus.', color: '#ff9fbb' },
  { id: 'guidelines', n: '05', name: 'Community guidelines', line: 'How we keep this place useful and safe.', color: '#8f7bff' },
  { id: 'resumes', n: '06', name: 'Resume library', line: 'Resumes that got the interview, annotated.', color: '#7ff5e4' },
];

// ── 01 · Events ───────────────────────────────────────────────────────────
export const EVENTS_INTRO = {
  title: 'Every pharma event worth your time, in one calendar.',
  lede: 'Expos, congresses, hackathons, webinars and campus meetups from across India, collected in one place, so you stop finding out about them the day after. Filter by city, format and topic, and go straight to the organiser to register.',
  how: [
    ['We track the industry', 'Our team follows organisers, associations and college calendars and lists what’s relevant to pharma careers.'],
    ['Organisers submit', 'Running an event? Send it in. We check the details and list it, usually within two working days.'],
    ['You plan ahead', 'Filter by city or format, add it to your calendar, and register on the organiser’s own page.'],
  ],
  note: 'Listings link to each organiser’s official registration page. SkillCures never charges you to attend an event listed here.',
};

const CITY = (mode) => {
  const m = mode.match(/Hyderabad|Pune|Delhi|Mumbai|Bengaluru|Chennai/);
  return m ? m[0] : 'Online';
};
export const INDUSTRY_EVENTS = [
  { type: 'Expo', title: 'CPHI & PMEC India Expo', date: '23–26 Nov 2026', city: 'New Delhi', where: 'New Delhi & Greater Noida', description: 'India’s largest pharma ingredients, machinery and packaging exhibition: the place to see the supply side of the industry in one hall.', source: 'Industry', online: false },
  { type: 'Congress', title: 'Indian Pharmaceutical Congress, 75th edition', date: '18–20 Dec 2026', city: 'New Delhi', where: 'New Delhi', description: 'The profession’s annual congress: scientific sessions, poster presentations and a large student contingent from pharmacy colleges.', source: 'Industry', online: false },
  { type: 'Hackathon', title: 'Hack for Social Cause, finals', date: '10–12 Jan 2027', city: 'New Delhi', where: 'New Delhi · free', description: 'Finals of a social-impact hackathon with healthcare tracks. Free to attend.', source: 'Industry', online: false },
];
export const ALL_EVENTS = [
  ...INDUSTRY_EVENTS,
  ...COMMUNITY_EVENTS.map((e) => ({
    type: e.type, title: e.title, date: e.date, city: CITY(e.mode), where: e.mode, description: e.description,
    source: 'SkillCures', online: /Online|Virtual|Live Stream|Roundtable|Panel|Datathon|Hackathon$/.test(e.mode) && !/In person/.test(e.mode),
    speaker: e.speaker, seats: e.seats, reg: e.reg, poster: e.poster,
  })),
];
export const EVENT_FORMATS = ['Expo', 'Congress', 'Webinar', 'Workshop', 'Meetup', 'Hackathon', 'Seminar'];
export const FORMAT_COLOR = { Expo: '#f6a53a', Congress: '#ff9fbb', Webinar: '#3b8bff', Workshop: '#06c6ad', Meetup: '#ff9fbb', Hackathon: '#f08a24', Seminar: '#8f7bff' };
// lon/lat for the cities events happen in (for the 3D map)
export const EVENT_CITIES = { 'New Delhi': [77.21, 28.61], Delhi: [77.21, 28.61], Hyderabad: [78.49, 17.39], Pune: [73.86, 18.52], Mumbai: [72.88, 19.08], Bengaluru: [77.59, 12.97], Chennai: [80.27, 13.08] };

// ── 02 · Mentor sessions ──────────────────────────────────────────────────
export const SESSIONS = {
  title: 'Know something worth teaching? Host a session.',
  lede: 'This industry is best taught by the people who run it. If you’ve faced an audit, filed a dossier or processed a thousand case reports, someone here needs to hear how you did it. Propose a session, share your meeting link, and we’ll bring the room.',
  formats: [
    ['Lecture', '45–60 min', 'One topic, taught properly, with time for questions.'],
    ['Workshop', '90 min', 'Hands-on: real documents, real data, real tools.'],
    ['Ask me anything', '30 min', 'No slides. Students bring the questions.'],
    ['Panel', '60 min', 'Two to four practitioners compare notes.'],
  ],
  steps: [
    ['Propose', 'Tell us the topic, format and date, and paste your Zoom, Google Meet, Teams or YouTube Live link.'],
    ['Review', 'We check the topic fits and your details are right, usually within 48 hours, and suggest edits if needed.'],
    ['Go live', 'Your session appears on the events calendar. Members RSVP and get reminders; you just open your link.'],
    ['Afterwards', 'We send you attendance, questions you couldn’t get to, feedback and a host certificate.'],
  ],
  perks: ['Verified mentor badge on your profile', 'An audience of students and early-career professionals', 'Attendance numbers and written feedback', 'A host certificate for every session'],
  rules: [
    ['Teach, don’t sell', 'One closing mention of your course or company is fine. A sales pitch isn’t.'],
    ['Keep confidential data out', 'No unpublished company data, client names, batch records or anything under NDA.'],
    ['No product claims', 'Don’t promote or make claims about specific branded medicines.'],
    ['Respect the room', 'Start on time, keep slides readable, and ask before you record.'],
  ],
  platforms: ['zoom.us', 'meet.google.com', 'teams.microsoft.com', 'teams.live.com', 'youtube.com', 'youtu.be', 'webex.com'],
  upcoming: COMMUNITY_EVENTS.filter((e) => ['Workshop', 'Seminar', 'Meetup'].includes(e.type)).slice(0, 4).map((e, k) => ({
    title: e.title, date: e.date, time: e.time, host: e.speaker[0], role: e.speaker[1], format: e.type, photo: `community/mentors/${['qc-analyst', 'mentor-1', 'mentor-2', 'mentor-3'][k]}.jpg`,
  })),
};

// ── 03 · The Journal (written and maintained by the SkillCures team) ─────
export const JOURNAL = {
  title: 'The Journal',
  lede: 'Plain-spoken writing about pharma careers, written and maintained by the SkillCures team. No listicles, no hype: just what we wish someone had told us in final year.',
  posts: [
    {
      slug: 'qa-or-qc', img: 'community/pillars/discover.webp', tag: 'Careers', mins: 6, color: '#3b8bff',
      title: 'QA or QC? How to choose your first department',
      excerpt: 'They sit next to each other on the org chart and get confused in every interview. Here’s what each one actually does, and how to tell which one fits you.',
      body: [
        'Quality Control is the lab. QC analysts test raw materials, in-process samples and finished products against specifications: HPLC assays, dissolution, related substances, microbial limits, stability pulls. The work is hands-on and measurable. A result passes or it doesn’t.',
        'Quality Assurance is the system around the lab and the plant. QA writes and reviews SOPs, handles deviations and CAPA, runs change control, reviews batch records and decides, on paper, whether a batch can be released. The work is about documents, processes and people.',
        'A simple test: if you enjoy instruments, data and the satisfaction of a clean chromatogram, start in QC. If you’d rather ask why something went wrong and fix the process so it doesn’t happen again, look at QA. Many people start in QC and move to QA after a few years, and that path is a strength, not a detour.',
        'Whichever you choose, learn data integrity (the ALCOA+ principles) and good documentation practice early. Both departments live or die by them, and interviewers notice when a fresher already speaks that language.',
      ],
    },
    {
      slug: 'pv-case-processing', img: 'community/circles/data.webp', tag: 'Pharmacovigilance', mins: 5, color: '#06c6ad',
      title: 'What a pharmacovigilance case processor actually does all day',
      excerpt: 'Drug safety is one of the biggest entry points for pharmacy graduates. Here’s a day in the job, without the jargon.',
      body: [
        'A case processor turns reports of suspected adverse reactions into structured safety data. Reports arrive from patients, doctors, published literature and clinical studies, and each one becomes an individual case safety report (ICSR).',
        'The first step is triage: is this a valid case? A valid case needs four things: an identifiable patient, an identifiable reporter, a suspect drug and an adverse event. Then you assess seriousness, because serious cases have strict reporting deadlines.',
        'Next comes data entry in a safety database, coding the events and medical history with MedDRA, and writing a clear narrative of what happened, in what order. Good narratives are short, factual and readable by someone who has never seen the case.',
        'What makes someone good at this: medical terminology, careful reading, clear English, and patience with detail. It’s also a role where accuracy compounds: the signals that keep medicines safe start with cases processed well.',
      ],
    },
    {
      slug: 'ctd-five-modules', img: 'community/circles/regulatory.webp', tag: 'Regulatory Affairs', mins: 7, color: '#8f7bff',
      title: 'The CTD, explained in five modules',
      excerpt: 'Every regulatory affairs job description mentions it. Here is the Common Technical Document in one sitting.',
      body: [
        'The Common Technical Document is the agreed format, set out in ICH M4, for submitting information about a medicine to regulators. Agreeing on one structure means the same dossier can be adapted for many countries, instead of rebuilt from scratch for each.',
        'Module 1 is regional: application forms, labelling and country-specific administrative documents. It’s the only module that changes significantly from one regulator to another.',
        'Module 2 holds the summaries and overviews: the quality overall summary, and the nonclinical and clinical overviews. Reviewers often read this first, so it has to tell the whole story clearly.',
        'Module 3 is Quality: how the drug substance and product are made, controlled and shown to be stable. Module 4 holds the nonclinical study reports and Module 5 the clinical study reports. Today most of it is submitted electronically as an eCTD, so knowing the structure, and the folder logic behind it, is one of the most useful things a regulatory fresher can learn.',
      ],
    },
    {
      slug: 'gmp-habits', img: 'community/stories/reagent-shelf.webp', tag: 'Quality', mins: 6, color: '#f6a53a',
      title: 'GMP in plain words: ten habits auditors look for',
      excerpt: 'Good Manufacturing Practice isn’t a rulebook you memorise. It’s a set of habits. These are the ones that show up in every audit.',
      body: [
        'Write it when you do it. Records are made at the time of the activity, not reconstructed at the end of the shift. Follow the SOP, or change the SOP through change control, never quietly do it “a better way”.',
        'Correct mistakes in the open: a single line through the entry, the correct value, your initials and the date. Never overwrite, never use correction fluid. Status-label everything (cleaned, to be cleaned, quarantined, released) so anyone can see what state an item is in.',
        'Do line clearance before every batch. Use only calibrated, qualified equipment, and check the tag before you trust the reading. Keep your training records current for the SOPs you work under.',
        'Gown properly and respect material and personnel flows. Investigate deviations to find the root cause, not someone to blame. And if something looks wrong, say so: in a GMP culture, raising a concern is part of the job.',
      ],
    },
    {
      slug: 'resume-read', img: 'community/stories/offer-signing.webp', tag: 'Careers', mins: 5, color: '#ff9fbb',
      title: 'Your resume has seconds, not minutes. Here’s how hiring managers read it.',
      excerpt: 'We asked people who hire for QA, QC and regulatory roles what they look at first. The answers were surprisingly consistent.',
      body: [
        'Recruiters skim. They look at the top third of the page, the role you’re aiming for, and whether the words they need are there: GMP, SOPs, HPLC, deviation, CTD, ICSR, whatever the role calls for. If those words only appear on page two, they may never be read.',
        'Lead with what you did, not what you were responsible for. “Ran dissolution testing for 40+ batches during a six-month plant internship” beats “Responsible for dissolution testing” every time. Numbers make experience believable.',
        'For freshers, one page is plenty. Put your project and internship above your hobbies, list the instruments and software you have actually used, and include training you can prove (a GMP course, a pharmacovigilance certificate).',
        'Skip the generic objective statement. Replace it with two lines that say what role you want and why you’re ready for it. And read it aloud once: typos in a quality role are not a small thing.',
      ],
    },
    {
      slug: 'thesis-to-patent', img: 'community/stories/formulation-bench.webp', tag: 'Patents & IP', mins: 8, color: '#7ff5e4',
      title: 'From thesis to provisional patent: a student’s roadmap',
      excerpt: 'If your M.Pharm project might be new, the order you do things in matters more than you think.',
      body: [
        'File before you publish. Presenting your work at a conference, posting it online or publishing your thesis before filing can count against its novelty. If you think you have something new, talk to your guide and file first.',
        'In India you can start with a provisional specification, which describes the invention and secures a priority date. You then have twelve months to file the complete specification with full claims. That year is valuable: use it to strengthen your data.',
        'A patentable invention must be novel, involve an inventive step and be capable of industrial application. Run a prior-art search early. Many student ideas turn out to be known, and it’s far better to discover that before paying fees.',
        'The Indian Patent Office charges lower fees to individuals, startups, small entities and educational institutions. Check your institute’s IP cell too: many have support for student filings and can help with drafting and costs.',
      ],
    },
  ],
};

// ── 04 · Campus ambassadors ───────────────────────────────────────────────
export const AMBASSADORS = {
  title: 'Campus Ambassadors: bring the community to your campus.',
  lede: 'Every pharmacy college has that one student everyone asks: about internships, electives, which company is visiting. If that’s you, we’d like you to represent SkillCures on your campus.',
  who: ['B.Pharm (2nd year and above), M.Pharm, Pharm.D or life-science students', 'Active in campus life, whether that’s clubs, fests, class rep or study groups', 'Clear communicator, comfortable speaking to a room', 'About 4–5 hours a month during term'],
  do: [
    ['Host', 'Run one SkillCures meetup or session on campus each term.'],
    ['Share', 'Pass verified events and opportunities to your batch, no spam.'],
    ['Connect', 'Be SkillCures’ first point of contact for students and faculty.'],
    ['Listen', 'Collect honest feedback on what students actually need.'],
  ],
  get: [
    ['Certificate', 'Appointment and completion certificates for every term you serve.'],
    ['Mentorship', 'A one-on-one call with an industry professional each term.'],
    ['Recommendation', 'A letter of recommendation for our most active ambassadors.'],
    ['Early access', 'First look at new features, events and hackathon slots.'],
    ['Network', 'A private group of ambassadors from colleges across India.'],
  ],
  steps: [['Apply', '5 minutes'], ['Short call', '15 minutes'], ['Onboarding', 'Playbook & kit'], ['Your term', 'One semester, renewable']],
  guidelines: [
    ['Be honest about what we offer', 'Never promise jobs, placements or guaranteed results on SkillCures’ behalf.'],
    ['Never collect money', 'SkillCures events are free for students to attend. No ambassador may charge fees or collect payments.'],
    ['Ask before you add', 'Get consent before adding anyone to a group or mailing list, and never share contact lists.'],
    ['Respect your college', 'Get permission before using campus spaces, notice boards or your college’s name and logo.'],
    ['Disclose your role', 'When you share SkillCures, say you’re an ambassador. Avoid conflicts with coaching or paid services.'],
    ['Flag problems early', 'If something goes wrong, tell the SkillCures team within 24 hours. We’d rather know.'],
  ],
  enforcement: 'Breaking these guidelines ends an ambassadorship. Collecting money or misleading students ends it immediately.',
};

// ── 05 · Community guidelines ─────────────────────────────────────────────
export const GUIDELINES = {
  title: 'Community guidelines',
  lede: 'This community works because people can ask questions without being judged and trust what they read. These six guidelines protect that. They apply everywhere: circles, events, sessions and messages.',
  rules: [
    { n: '01', name: 'Respect first', body: 'Critique ideas, not people. No harassment, discrimination, personal attacks or pile-ons. Everyone was a fresher once.', icon: 'heart' },
    { n: '02', name: 'Protect confidential information', body: 'Never share unpublished company data, batch records, client names, regulatory submissions or anything under an NDA. If you wouldn’t show it in an audit, don’t post it.', icon: 'lock' },
    { n: '03', name: 'No medical advice to patients', body: 'This is a professional community, not a clinic. Don’t advise on anyone’s treatment. If someone describes a suspected side effect, point them to their doctor and to the Pharmacovigilance Programme of India (PvPI).', icon: 'cross' },
    { n: '04', name: 'Credible and cited', body: 'Back claims with sources such as guidelines, pharmacopoeias or papers. Label opinions as opinions. Don’t forward unverified “regulatory news”, and never share exam papers or someone else’s work as your own.', icon: 'book' },
    { n: '05', name: 'Fair opportunities only', body: 'Job and internship posts must name the employer and the role. Nobody may ask candidates for money. Report any “pay to get placed” offer: it’s a scam.', icon: 'scale' },
    { n: '06', name: 'Promotion in its place', body: 'Share your course, product or service only in the threads set aside for it. No unsolicited sales messages.', icon: 'megaphone' },
  ],
  enforcement: [
    ['Reminder', 'A moderator explains what went wrong.'],
    ['Pause', 'Posting is paused for a few days.'],
    ['Removal', 'The account leaves the community.'],
  ],
  serious: 'Harassment, scams and leaking confidential information lead to immediate removal.',
  report: 'See something that breaks these? Use “Report” on any post or message. A moderator reviews every report, usually within 24 hours.',
};

// ── 06 · Resume library ───────────────────────────────────────────────────
export const RESUMES = {
  title: 'Resumes that got the interview.',
  lede: 'A library of strong pharma resumes, shared with permission, anonymised, and annotated by people who hire for these roles. Read them for structure and language, not to copy, then get your own reviewed.',
  sampleNote: 'Illustrative sample. Real shared resumes will be anonymised and published with the owner’s consent.',
  checklist: [
    'Target one role, and say it at the top',
    'Lead each point with an action and a result',
    'Use the words the role uses (GMP, CTD, ICSR, HPLC…)',
    'Put projects and internships above hobbies',
    'List instruments and software you’ve actually used',
    'Show training you can prove',
    'One page if you’re a fresher',
    'Read it aloud once. Typos cost interviews.',
  ],
  roles: ['Quality Assurance', 'Quality Control', 'Regulatory Affairs', 'Pharmacovigilance', 'Clinical Research', 'Medical Writing'],
  samples: [
    {
      role: 'Quality Assurance', level: 'Fresher · B.Pharm', initials: 'A. K.', headline: 'B.Pharm graduate seeking a QA Officer role in oral solid dosage',
      summary: 'Six-month plant internship in QA documentation; trained in GMP and data integrity. Comfortable with deviation reports, SOP review and batch record checks.',
      experience: [['QA Intern, oral solid dosage plant', 'Jan–Jun 2026', ['Reviewed 60+ executed batch records against MFR and flagged 9 documentation gaps', 'Drafted 3 deviation reports and supported the root-cause investigation', 'Helped update 12 SOPs during a document-control migration']]],
      education: [['B.Pharm', '2022–2026 · 8.1 CGPA']],
      skills: ['GMP & GDP', 'Deviation & CAPA', 'Change control', 'Batch record review', 'ALCOA+'],
      certs: ['GMP fundamentals (online, 2025)'],
      notes: [['headline', 'Names the exact role and dosage form. The reader knows in one line what this person wants.'], ['experience', 'Every bullet has a number. “60+ batch records” is believable; “reviewed documents” isn’t.'], ['skills', 'Uses QA’s own vocabulary. These are the words a hiring manager scans for.']],
    },
    {
      role: 'Quality Control', level: 'Fresher · M.Pharm (Pharmaceutical Analysis)', initials: 'S. R.', headline: 'Analytical chemist: HPLC, dissolution and method validation',
      summary: 'M.Pharm thesis on stability-indicating HPLC method development. Hands-on with HPLC, UV, dissolution and KF; trained in GLP and data integrity.',
      experience: [['Project: stability-indicating RP-HPLC method', 'Thesis, 2025–26', ['Developed and validated a method per ICH Q2 for an assay and related substances', 'Ran forced-degradation studies under 5 stress conditions', 'Presented the work at a national pharmacy conference (poster)']], ['QC Intern, formulation unit', 'Summer 2025', ['Performed dissolution testing on 40+ batches', 'Prepared and standardised volumetric solutions']]],
      education: [['M.Pharm, Pharmaceutical Analysis', '2024–2026'], ['B.Pharm', '2020–2024']],
      skills: ['HPLC (Empower)', 'Dissolution', 'UV-Vis', 'Karl Fischer', 'ICH Q2 validation', 'GLP'],
      certs: ['Data integrity in QC labs (2025)'],
      notes: [['headline', 'Lists the techniques in the headline. QC managers hire for instruments.'], ['experience', 'Treats the thesis as real experience, with the guideline it followed.'], ['skills', 'Names the software (Empower), not just “HPLC”. That detail is what gets a call.']],
    },
    {
      role: 'Regulatory Affairs', level: '1–2 years · M.Pharm', initials: 'P. M.', headline: 'Regulatory Affairs Associate: CTD dossiers for emerging markets',
      summary: 'Eighteen months compiling and reviewing CTD modules for generic tablets and capsules. Experienced with eCTD publishing and responding to deficiency letters.',
      experience: [['Regulatory Affairs Associate', '2025–present', ['Compiled Module 3 for 7 generic dossiers across 4 markets', 'Drafted responses to 5 deficiency letters, all closed in the first round', 'Maintained submission trackers for 30+ live registrations']]],
      education: [['M.Pharm, Pharmaceutics', '2022–2024']],
      skills: ['CTD / eCTD', 'Module 2 & 3 authoring', 'Deficiency responses', 'Labelling review', 'Submission tracking'],
      certs: ['Regulatory affairs certificate course (2024)'],
      notes: [['headline', 'Says which market and dossier type. RA is a broad field, so narrowing it helps.'], ['experience', '“All closed in the first round” is the kind of result that sets a candidate apart.'], ['skills', 'Separates authoring from publishing, which shows real understanding of the work.']],
    },
    {
      role: 'Pharmacovigilance', level: 'Fresher · Pharm.D', initials: 'N. J.', headline: 'Pharm.D graduate for a Drug Safety Associate role',
      summary: 'Clinical internship in a 600-bed hospital with an ADR monitoring centre. Trained in ICSR processing, MedDRA coding and narrative writing.',
      experience: [['Clinical internship, ADR monitoring centre', '2025–26', ['Collected and documented 50+ suspected ADR reports for PvPI submission', 'Assessed causality using the WHO-UMC scale under supervision', 'Ran a ward awareness session on ADR reporting for nursing staff']]],
      education: [['Pharm.D', '2020–2026']],
      skills: ['ICSR processing', 'MedDRA coding', 'Case narratives', 'Causality assessment', 'Medical terminology'],
      certs: ['Pharmacovigilance fundamentals (2025)'],
      notes: [['headline', 'Uses the job title recruiters actually post: “Drug Safety Associate”.'], ['experience', 'Mentions PvPI and WHO-UMC, real systems the reader recognises.'], ['summary', 'Gives scale: “600-bed hospital” makes the internship concrete.']],
    },
    {
      role: 'Clinical Research', level: 'Fresher · M.Pharm (Pharmacology)', initials: 'R. D.', headline: 'Clinical Research Coordinator, trained in ICH-GCP',
      summary: 'Hospital-based trial-site internship supporting a Phase III study. Comfortable with consent documentation, source data verification support and CRFs.',
      experience: [['Trial-site intern, Phase III study', 'Jan–May 2026', ['Prepared visit schedules for 25 participants and tracked protocol windows', 'Filed and checked informed-consent documents against the current version', 'Supported the monitor during 2 site visits with CRF queries']]],
      education: [['M.Pharm, Pharmacology', '2024–2026']],
      skills: ['ICH-GCP E6', 'Informed consent', 'CRF completion', 'Site file management', 'Protocol adherence'],
      certs: ['ICH-GCP certificate (2026)'],
      notes: [['headline', 'Puts the certification in the headline; GCP training is a must-have here.'], ['experience', 'Shows understanding of what a coordinator actually does on site.'], ['skills', 'Every skill maps to a line of the job description.']],
    },
    {
      role: 'Medical Writing', level: '1 year · M.Pharm', initials: 'T. V.', headline: 'Medical Writer: regulatory documents and scientific publications',
      summary: 'One year writing clinical study report sections, patient narratives and journal manuscripts. AMA style; strong with data tables and plain-language summaries.',
      experience: [['Associate Medical Writer', '2025–present', ['Drafted safety narratives and CSR sections for 3 studies', 'Co-authored 2 manuscripts submitted to peer-reviewed journals', 'Wrote plain-language summaries reviewed by patient advocates']]],
      education: [['M.Pharm, Pharmacology', '2022–2024']],
      skills: ['CSR writing', 'Patient narratives', 'Manuscripts', 'AMA style', 'Plain-language summaries'],
      certs: ['Medical writing course (2025)'],
      notes: [['headline', 'Covers both sides of medical writing, regulatory and publications, in one line.'], ['experience', 'Names document types precisely. Writers are hired for what they’ve written.'], ['summary', 'Names the style guide and the data work, the two things editors test first.']],
    },
  ],
};

export const JOIN = {
  title: 'Your next opportunity could start with one connection.',
  lede: 'Join the SkillCures Community: students, researchers, mentors and biotech pioneers who learn, collaborate and grow together.',
  ticks: ['Free for students & professionals', 'Moderated & spam-free', 'All 20+ circles from day one'],
};
