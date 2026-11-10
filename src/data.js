// Content model. All copy mirrors skillcures.in.

export const SITE = 'https://www.skillcures.in';

export const COLORS = {
  bg: '#04081a',
  ink: '#f4f7ff',
  cobalt: '#0253eb',
  teal: '#06c6ad',
  deepteal: '#018f9d',
  pink: '#ff9fbb',
  amber: '#f6a53a',
};

export const CHAPTERS = [
  { id: 'hero', name: 'Start' },
  { id: 'deck', name: 'Your next step' },
  { id: 'how-it-works', name: 'How it works' },
  { id: 'patents', name: 'Patents' },
  { id: 'community', name: 'Community' },
  { id: 'mentors', name: 'Mentors' },
  { id: 'join', name: 'Join' },
];

export const COLLEGES = [
  ['Jamia Hamdard', 'New Delhi'], ['BITS Pilani', 'Pilani'], ['Panjab University', 'Chandigarh'],
  ['ICT Mumbai', 'Mumbai'], ['Manipal (MAHE)', 'Manipal'], ['NIPER', 'Hyderabad · Mohali'],
  ['SRM Institute', 'Chennai'], ['NMIMS', 'Mumbai'], ['Amrita Vishwa Vidyapeetham', 'Coimbatore'],
  ['Chitkara University', 'Rajpura'], ['Amity University', 'Noida'], ['DPSRU', 'New Delhi'],
  ['Jadavpur University', 'Kolkata'], ['Chandigarh University', 'Mohali'], ['BIT Mesra', 'Ranchi'],
  ['Banasthali Vidyapith', 'Banasthali'],
];

export const JOURNEY = [
  ['Idea', 'In your own words', 'You'],
  ['Drafted', 'Title, description, claims', 'SkillCures'],
  ['Filed', 'Indian Patent Office', 'SkillCures'],
  ['Published', 'The Official Journal', 'Patent Office'],
  ['On your résumé', 'Co-inventor', 'You'],
];

// ── Career prescription (same rules as the live site) ─────────────────────
const TRACKS = {
  lab: { name: 'Quality Control', why: 'Loves the lab', course: 'Analytical methods', mentor: 'a QC analyst', role: 'QC Analyst' },
  documents: { name: 'Regulatory Affairs', why: 'Good with documents', course: 'CTD & dossier basics', mentor: 'an RA associate', role: 'RA Associate' },
  people: { name: 'Clinical Research', why: 'Good with people', course: 'ICH-GCP essentials', mentor: 'a trial coordinator', role: 'Trial Coordinator' },
  data: { name: 'Pharmacovigilance', why: 'Enjoys data', course: 'Case processing basics', mentor: 'a drug-safety associate', role: 'Drug Safety Associate' },
};
const WHO = {
  early: 'You · B.Pharm, early years',
  final: 'You · B.Pharm, final year',
  working: 'You · working in pharma',
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function prescribe({ stage = 'final', likes = 'lab', goal = 'job' } = {}) {
  const g = TRACKS[likes] ?? TRACKS.lab;
  let l1, l2, l3, review, d1, d2, d3;
  let third = { kind: 'Openings', title: `${g.role} roles` };

  if (goal === 'switch') {
    l1 = `${g.course}, for switchers`;
    l2 = `Talk to ${g.mentor} who switched`;
    l3 = `Apply: ${g.role} roles open to switchers`;
    review = 'In a month'; d1 = 'For switchers'; d2 = 'Someone who switched'; d3 = 'Open to switchers';
  } else if (goal === 'study') {
    l1 = `${g.course}, before your M.Pharm`;
    l2 = `Ask ${g.mentor} about M.Pharm`;
    l3 = `Research hub: join a ${g.name} project`;
    review = 'Before admissions open'; d1 = 'Before your M.Pharm'; d2 = 'About the M.Pharm'; d3 = 'In the research hub';
    third = { kind: 'Research', title: `${g.name} projects` };
  } else if (stage === 'early') {
    l1 = `${g.course}, the basics first`;
    l2 = `Talk to ${g.mentor} · once a month`;
    l3 = `Summer internship in ${g.name}`;
    review = 'Every term'; d1 = 'The basics first'; d2 = 'Once a month'; d3 = `In ${g.name}`;
    third = { kind: 'Openings', title: 'Summer internships' };
  } else if (stage === 'working') {
    l1 = `${g.course}, on weekends`;
    l2 = `Talk to ${g.mentor} · Sat, 10:00 am`;
    l3 = `Apply: ${g.role} roles for your years`;
    review = 'In 2 weeks'; d1 = 'On weekends'; d2 = 'Sat, 10:00 am'; d3 = 'For your years';
  } else {
    l1 = `${g.course} · one lesson a day`;
    l2 = `Talk to ${g.mentor} · Tue, 6:00 pm`;
    l3 = `Apply: ${g.role} roles after lesson 6`;
    review = 'In 2 weeks'; d1 = 'One lesson a day'; d2 = 'Tue, 6:00 pm'; d3 = 'Apply after lesson 6';
  }

  const mentorTitle = cap(g.mentor.replace(/^an? /, ''));
  return {
    key: `${stage}|${likes}|${goal}`,
    dept: g.name,
    who: WHO[stage] ?? WHO.final,
    diagnosis: `${g.why} → ${g.name}`,
    lines: [l1, l2, l3],
    review,
    cards: [
      { kind: 'Course', title: g.course, detail: d1, color: 'pink' },
      { kind: 'Mentor', title: goal === 'study' ? `Ask ${g.mentor}` : `Talk to ${g.mentor}`, short: mentorTitle, detail: d2, color: 'amber' },
      { kind: third.kind, title: third.title, detail: d3, color: 'cobalt' },
    ],
  };
}
