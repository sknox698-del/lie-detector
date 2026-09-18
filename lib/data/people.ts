import { RNG } from '../rng';
import { FaceDNA, PersonalityKey } from '../types';

export const FIRST_M = [
  'Marcus','Elias','Dorian','Nikolai','Adrian','Rafael','Julian','Emeka','Kenji','Tobias',
  'Hugo','Damir','Andre','Soren','Luca','Idris','Malik','Viktor','Casper','Oscar',
  'Ravi','Diego','Fenton','Grigory','Anton','Ezra','Miles','Cormac','Yusuf','Theo',
];
export const FIRST_F = [
  'Vera','Ingrid','Camille','Noor','Selene','Marisol','Anya','Delphine','Iris','Priya',
  'Rowan','Odette','Zara','Junia','Helena','Mira','Solveig','Tamsin','Amara','Lucia',
  'Nadia','Bianca','Freya','Esme','Sable','Ottilie','Corinne','Yara','Wren','Katya',
];
export const LAST = [
  'Kessler','Vance','Marlow','Okonkwo','Fontaine','Reyes','Nakamura','Brandt','Sokolov','Ibarra',
  'Ashford','Delacroix','Quinn','Halloran','Petrov','Sinclair','Osei','Draeger','Novak','Vasquez',
  'Whitlock','Kaur','Lindqvist','Moreau','Bianchi','Farrow','Yusupova','Grimaldi','Achebe','Stroud',
  'Calder','Mbeki','Rossetti','Van Der Berg','Holloway','Zheng','Aldridge','Pereira','Krause','Beaumont',
];

export const OCCUPATIONS = [
  'Night Auditor','Forensic Accountant','Sous Chef','Gallery Curator','Rideshare Driver',
  'Data Analyst','Building Superintendent','Pharmaceutical Rep','Bartender','Structural Engineer',
  'Private Nurse','Freelance Photographer','Logistics Manager','Attorney','Locksmith',
  'Insurance Adjuster','Sound Technician','Antiquities Dealer','Security Consultant','Journalist',
  'Venture Associate','Museum Registrar','Paramedic','Warehouse Foreman','Software Architect',
  'Casino Host','Property Developer','Archivist','Flight Attendant','Debt Collector',
];

export const PERSONALITIES: Record<PersonalityKey, {
  label: string;
  blurb: string;
  baseTrust: number;
  baseStress: number;
  stressGain: number;
  tellReliability: number;
  verbal: string[];
}> = {
  stoic: {
    label: 'Stoic',
    blurb: 'Gives you nothing for free. Reads the room before answering.',
    baseTrust: 40, baseStress: 10, stressGain: 0.7, tellReliability: 0.35,
    verbal: ['Ask a better question.','That is all I intend to say about it.','I answered that.'],
  },
  anxious: {
    label: 'Anxious',
    blurb: 'Volunteers too much. Contradicts themselves under pressure.',
    baseTrust: 55, baseStress: 40, stressGain: 1.5, tellReliability: 0.45,
    verbal: ['Sorry — sorry, I’m just, this is a lot.','Am I in trouble? I feel like I’m in trouble.','I keep replaying it.'],
  },
  hostile: {
    label: 'Hostile',
    blurb: 'Treats every question as an accusation.',
    baseTrust: 20, baseStress: 30, stressGain: 1.2, tellReliability: 0.3,
    verbal: ['You people always do this.','Am I under arrest? No? Then relax.','Careful, Detective.'],
  },
  charming: {
    label: 'Charming',
    blurb: 'Smooth, warm, endlessly agreeable. Watch the details, not the smile.',
    baseTrust: 65, baseStress: 12, stressGain: 0.6, tellReliability: 0.2,
    verbal: ['Happy to help, truly.','You have a difficult job. I respect it.','Ask me anything.'],
  },
  analytical: {
    label: 'Analytical',
    blurb: 'Precise timestamps, clean logic. Precision can be rehearsed.',
    baseTrust: 50, baseStress: 15, stressGain: 0.8, tellReliability: 0.4,
    verbal: ['Let me be exact about this.','I keep a calendar. I can be specific.','Your timeline has a gap in it.'],
  },
  grieving: {
    label: 'Grieving',
    blurb: 'Emotion floods the recall. Grief is not proof of innocence.',
    baseTrust: 60, baseStress: 45, stressGain: 1.3, tellReliability: 0.25,
    verbal: ['I can’t — give me a second.','Everyone keeps asking and nobody is listening.','It doesn’t feel real.'],
  },
  arrogant: {
    label: 'Arrogant',
    blurb: 'Believes they are smarter than the investigation.',
    baseTrust: 30, baseStress: 8, stressGain: 0.9, tellReliability: 0.3,
    verbal: ['My lawyer bills more per hour than you earn per week.','Is this the standard of policing now?','You’re guessing. I can tell.'],
  },
  rambling: {
    label: 'Rambling',
    blurb: 'Buries useful facts inside noise. Listen for the buried fact.',
    baseTrust: 58, baseStress: 25, stressGain: 1.0, tellReliability: 0.5,
    verbal: ['— anyway, where was I? Right.','You know how it is on a Tuesday.','Long story. I’ll shorten it. Mostly.'],
  },
};

const SKINS: [string, string][] = [
  ['#F2D3BC', '#D9AE92'], ['#E8C39E', '#C79C74'], ['#D9A46B', '#B37F4B'],
  ['#B87A4F', '#8E5733'], ['#8D5524', '#6A3C16'], ['#5C3317', '#3E210E'],
  ['#F7E0CC', '#DCB79E'], ['#C68642', '#9A6228'], ['#3F2314', '#2A160B'],
  ['#EFC9A8', '#CFA07C'],
];
const HAIRS = ['#12100E','#2B1B12','#4A2E1B','#6B4423','#8B6A3E','#B98D5A','#D6C08A','#9A9A9A','#E4E2DE','#5A2E2E','#1B2430','#3A2C4A'];
const EYES = ['#3E2C1E','#5B4636','#2F4858','#3F6B5A','#6B7C93','#4A3B2A','#2D2A26','#57708C'];
const CLOTHES: [string, string][] = [
  ['#1F2937','#3EE8FF'], ['#2A2E3A','#FFB13C'], ['#3A2430','#FF7AC8'], ['#1D3030','#3BE08D'],
  ['#312A22','#F5D66E'], ['#242B3D','#A47BFF'], ['#33232A','#FF4D5E'], ['#20262C','#9FB6D6'],
  ['#141A26','#6E7C96'], ['#2E2A20','#D6C08A'],
];

export function makeFace(rng: RNG, age: number): FaceDNA {
  const [skin, skinShadow] = rng.pick(SKINS);
  const [clothing, clothingAccent] = rng.pick(CLOTHES);
  const grey = age > 52 ? rng.chance(0.7) : age > 42 ? rng.chance(0.3) : false;
  return {
    skin,
    skinShadow,
    hairColor: grey ? rng.pick(['#9A9A9A', '#E4E2DE', '#C9C6C0']) : rng.pick(HAIRS),
    hairStyle: rng.int(0, 9),
    facialHair: rng.chance(0.42) ? rng.int(1, 4) : 0,
    eyeColor: rng.pick(EYES),
    browThickness: 0.6 + rng.next() * 0.9,
    noseWidth: 0.75 + rng.next() * 0.6,
    jawWidth: 0.8 + rng.next() * 0.45,
    faceLength: 0.88 + rng.next() * 0.28,
    lipFullness: 0.7 + rng.next() * 0.7,
    glasses: rng.chance(0.26) ? rng.int(1, 2) : 0,
    earring: rng.chance(0.22),
    scar: rng.chance(0.12),
    clothing,
    clothingAccent,
    collar: rng.int(0, 4),
    age,
    freckles: rng.chance(0.18),
    cheekbone: 0.7 + rng.next() * 0.6,
  };
}

export function makeName(rng: RNG, used: Set<string>): { name: string; first: string } {
  for (let i = 0; i < 60; i++) {
    const first = rng.chance(0.5) ? rng.pick(FIRST_M) : rng.pick(FIRST_F);
    const last = rng.pick(LAST);
    const name = `${first} ${last}`;
    if (!used.has(name)) {
      used.add(name);
      return { name, first };
    }
  }
  const fallback = `${rng.pick(FIRST_M)} ${rng.pick(LAST)}-${rng.int(10, 99)}`;
  used.add(fallback);
  return { name: fallback, first: fallback.split(' ')[0] };
}
