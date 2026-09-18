import { Motive } from '../types';

export interface LocationTemplate {
  kind: string;
  names: string[];
  detail: string[];
  hasCamera: boolean;
  hasPayment: boolean;
}

export const LOCATION_TEMPLATES: LocationTemplate[] = [
  { kind: 'apartment', names: ['Lindgren Court, Apt 4B','Halvard Residences, Unit 12','The Ashcroft, Apt 9F','Meridian Flats, 3C'],
    detail: ['pre-war walk-up with a broken buzzer','glass tower with a keycard log','sublet with no doorman after 22:00','corner unit overlooking the canal'], hasCamera: true, hasPayment: false },
  { kind: 'office', names: ['Vantage Analytics, Floor 21','Corrigan & Boyle LLP','Northlight Media HQ','Sablefield Capital, Floor 8'],
    detail: ['badge readers on every stairwell','open-plan with server room access','after-hours lighting on motion sensors','executive floor with private lift'], hasCamera: true, hasPayment: false },
  { kind: 'restaurant', names: ['Ostra Kitchen','Piccolo Rosso','The Blue Heron','Café Verdance'],
    detail: ['reservations logged to the minute','patio cameras face the street','card terminal prints a timestamp','kitchen door left propped open'], hasCamera: true, hasPayment: true },
  { kind: 'hotel', names: ['The Cordwain Hotel','Hotel Miravel','Grand Sable Inn','The Ivory Row'],
    detail: ['keycard logs every room entry','lobby camera covers both lifts','valet ticket stubs are timestamped','service corridor has no coverage'], hasCamera: true, hasPayment: true },
  { kind: 'garage', names: ['Level 3, Delridge Parking','Sublevel B2 Garage','Riverside Parking Structure','Terminal Garage, Deck 5'],
    detail: ['one camera, angled at the ramp','ticket machine records plate numbers','half the lights are out','gate arm logs entry and exit'], hasCamera: true, hasPayment: true },
  { kind: 'club', names: ['Nocturne','The Velvet Circuit','Basement 9','Halo Room'],
    detail: ['no phones policy, weakly enforced','cash bar, no receipts','door camera only','coat check tags are numbered'], hasCamera: true, hasPayment: true },
  { kind: 'warehouse', names: ['Pier 7 Storage','Kestrel Freight Depot','Unit 44, Dockside','Old Marrow Textile Works'],
    detail: ['motion lights, no recording','padlock replaced last month','loading dock faces the water','abandoned east wing'], hasCamera: false, hasPayment: false },
  { kind: 'station', names: ['Kelvin Street Station','Central Terminal, Platform 6','Northgate Rail Hub','Ferry Landing East'],
    detail: ['tap-in and tap-out both logged','platform cameras every 20 metres','last train departs 23:14','ticket hall is closed after midnight'], hasCamera: true, hasPayment: true },
  { kind: 'hospital', names: ['St. Auden Medical','Rivermouth Clinic','Ward 6, Halloway General','Ferrow Urgent Care'],
    detail: ['visitor log at reception','badge access to all wards','waiting room camera','pharmacy dispensing records'], hasCamera: true, hasPayment: false },
  { kind: 'shop', names: ['Grayson Hardware','Nightowl Convenience','Sundry & Salt Grocers','Aperture Camera Supply'],
    detail: ['receipt printer runs two minutes fast','one camera behind the counter','no cash accepted after 20:00','back room stores deliveries'], hasCamera: true, hasPayment: true },
  { kind: 'home', names: ['The Vasquez House, Elm Row','43 Corrigan Lane','Willowbank Cottage','The Old Rectory'],
    detail: ['smart doorbell records motion','no neighbours within 200 metres','side gate has no lock','security system armed at 22:00'], hasCamera: true, hasPayment: false },
  { kind: 'street', names: ['Corvin Street Underpass','Marlowe Bridge','Dockside Promenade','Ashgrove Alley'],
    detail: ['traffic camera at the junction','no lighting past the bend','busy until midnight','bus stop with a live-time display'], hasCamera: true, hasPayment: false },
  { kind: 'gallery', names: ['The Brandt Collection','Meridian Contemporary','Salon Verrier','Halloway Print Room'],
    detail: ['pressure plates under each plinth','humidity logs every 15 minutes','night guard walks a 20-minute loop','service lift bypasses the atrium'], hasCamera: true, hasPayment: false },
  { kind: 'lab', names: ['Cygnet Biotech, Lab 2','Aperture Testing Facility','Norrow Research Annex','Cold Storage, Sublevel 1'],
    detail: ['sample fridges log every open','clean room requires two badges','fume hood alarms are recorded','network access is audited'], hasCamera: true, hasPayment: false },
];

export interface CaseArchetype {
  id: string;
  type: string;
  titles: string[];
  incident: string[];
  victimRole: string;
  sceneKinds: string[];
  motives: Motive[];
  objectNoun: string[];
}

const M = (id: string, label: string, description: string): Motive => ({ id, label, description });

export const ARCHETYPES: CaseArchetype[] = [
  {
    id: 'murder', type: 'Homicide',
    titles: ['The Last Reservation','Nine Minutes of Silence','A Quiet Kind of Violence','The Emptied Glass','Cold Light, Warm Blood'],
    incident: ['was found dead','was killed','was found unresponsive and later pronounced dead'],
    victimRole: 'the victim',
    sceneKinds: ['apartment','hotel','home','warehouse','garage','office'],
    motives: [
      M('inherit','Inheritance','The victim’s death moved a great deal of money into their hands.'),
      M('silence','Silencing a Witness','The victim knew something that would have ended their career.'),
      M('jealousy','Jealousy','A relationship the victim was about to expose or end.'),
      M('revenge','Revenge','An old injury the victim never answered for.'),
      M('cover','Covering Another Crime','The victim discovered a theft already in progress.'),
    ],
    objectNoun: ['a broken tumbler','a missing keyring','a bloodied cuff','a torn appointment card'],
  },
  {
    id: 'theft', type: 'Grand Theft',
    titles: ['The Weight of an Empty Safe','Twelve Grams of Nothing','What the Vault Forgot','Inventory Discrepancy'],
    incident: ['reported the theft of a high-value item','discovered the safe emptied','logged a break-in with no forced entry'],
    victimRole: 'the owner',
    sceneKinds: ['gallery','office','home','shop','warehouse'],
    motives: [
      M('debt','Crushing Debt','Private lenders had stopped being patient with them.'),
      M('greed','Simple Greed','Opportunity, access, and no expectation of being caught.'),
      M('resent','Resentment','They believed the item was owed to them.'),
      M('order','Working to Order','Someone paid them to take a specific object.'),
      M('cover','Covering a Shortfall','Their own books were already short and needed hiding.'),
    ],
    objectNoun: ['a cut alarm loop','a duplicated key','a foam-lined case','a swapped inventory tag'],
  },
  {
    id: 'arson', type: 'Arson',
    titles: ['Accelerant','The Fire Did Not Start Itself','Smoke Reads Like a Signature','Ash and Alibi'],
    incident: ['reported a fire that investigators ruled deliberate','suffered a blaze traced to an ignition source','lost the premises to a fire set with accelerant'],
    victimRole: 'the leaseholder',
    sceneKinds: ['warehouse','shop','restaurant','office','home'],
    motives: [
      M('insure','Insurance Payout','The policy was worth more than the business ever was.'),
      M('destroy','Destroying Records','Something in that building had to stop existing.'),
      M('intimidate','Intimidation','A message meant for someone still alive.'),
      M('revenge','Revenge','They were removed from the business and never accepted it.'),
      M('cover','Covering a Theft','The fire was meant to hide what had already been taken.'),
    ],
    objectNoun: ['a decanted fuel container','a wedged fire door','a disabled smoke head','a scorched timer'],
  },
  {
    id: 'missing', type: 'Missing Person',
    titles: ['She Never Boarded','The Gap in the Footage','Last Seen Facing East','Forty-One Hours'],
    incident: ['was reported missing','failed to arrive and has not been located','vanished between two confirmed sightings'],
    victimRole: 'the missing person',
    sceneKinds: ['station','street','apartment','garage','hotel'],
    motives: [
      M('control','Control','They could not accept the victim leaving.'),
      M('blackmailm','Ending a Blackmail','The victim had been extracting money for months.'),
      M('cover','Covering an Assault','Something happened that could not be explained away.'),
      M('money','Money','A payout or policy depended on the victim being gone.'),
      M('panic','Panic','An accident they chose to hide instead of report.'),
    ],
    objectNoun: ['an unclaimed suitcase','a snapped phone case','a discarded travel card','a single shoe'],
  },
  {
    id: 'fraud', type: 'Corporate Fraud',
    titles: ['Restated Earnings','The Fourth Quarter Problem','Nobody Audits the Auditor','Line Item 44'],
    incident: ['flagged a multi-million shortfall','discovered falsified ledgers','triggered a forensic audit after a whistleblower report'],
    victimRole: 'the firm',
    sceneKinds: ['office','lab','hotel','restaurant'],
    motives: [
      M('debt','Personal Debt','Their private finances had collapsed quietly.'),
      M('promote','Career Preservation','A bad quarter would have ended them.'),
      M('greed','Greed','The skim started small and never stopped.'),
      M('loyal','Protecting Someone','They took the risk to shield another person.'),
      M('exit','Funding an Exit','They were building the money to disappear.'),
    ],
    objectNoun: ['a rerouted transfer slip','a shredded reconciliation','a shared admin credential','a backdated invoice'],
  },
  {
    id: 'blackmail', type: 'Blackmail',
    titles: ['Something You Would Rather Keep','Paid in Instalments','The Photograph They Kept','Terms of Silence'],
    incident: ['came forward about an extortion scheme','reported repeated demands for payment','was found to be paying an unknown party monthly'],
    victimRole: 'the complainant',
    sceneKinds: ['hotel','restaurant','street','office','club'],
    motives: [
      M('money','Money','The payments funded a life they could not otherwise afford.'),
      M('leverage','Leverage','They wanted control, not cash.'),
      M('revenge','Revenge','This was punishment dressed as a transaction.'),
      M('protect','Protecting Themselves','They were being squeezed and passed the pressure along.'),
      M('cover','Burying a Secret','The scheme kept their own history out of the light.'),
    ],
    objectNoun: ['a burner handset','a prepaid card','a printed screenshot','a left-luggage key'],
  },
  {
    id: 'sabotage', type: 'Sabotage',
    titles: ['Failure Was Scheduled','Someone Turned the Valve','Root Cause: Human','The Maintenance Window'],
    incident: ['suffered a catastrophic equipment failure ruled deliberate','lost a critical system to tampering','reported sabotage of a production line'],
    victimRole: 'the operator',
    sceneKinds: ['lab','warehouse','office','hospital'],
    motives: [
      M('rival','Competitive Advantage','A rival needed this project to fail.'),
      M('grudge','Grudge','They were passed over and never forgot it.'),
      M('cover','Hiding Incompetence','Their own error would have surfaced during testing.'),
      M('ideology','Conviction','They believed the work itself was wrong.'),
      M('money','Paid Interference','Someone else’s money moved their hand.'),
    ],
    objectNoun: ['a bypassed interlock','a swapped calibration weight','an altered maintenance log','a cut sensor lead'],
  },
  {
    id: 'art', type: 'Stolen Artwork',
    titles: ['The Provenance Is the Crime','Wall Space, Rectangular','Copy of a Copy','Humidity Log 22:40'],
    incident: ['reported a painting missing from the collection','found an original replaced with a forgery','discovered a piece removed during closing hours'],
    victimRole: 'the collection',
    sceneKinds: ['gallery','home','warehouse','hotel'],
    motives: [
      M('order','Commissioned Theft','A private buyer had already paid for it.'),
      M('debt','Debt','They needed a single large sum, immediately.'),
      M('claim','Restitution Claim','They believed the piece was stolen from their family first.'),
      M('ego','Ego','They wanted to prove the security was theatre.'),
      M('cover','Hiding a Forgery','The original had been sold long ago.'),
    ],
    objectNoun: ['a cut canvas tack','a swapped frame','a forged condition report','a glove with pigment traces'],
  },
  {
    id: 'cyber', type: 'Cybercrime',
    titles: ['Credentials Are a Person','The 03:12 Login','Nobody Hacked Anything','Exfiltration Window'],
    incident: ['reported a breach that exfiltrated protected data','detected unauthorised access from an internal account','lost customer records to an inside login'],
    victimRole: 'the company',
    sceneKinds: ['office','apartment','lab','home'],
    motives: [
      M('sell','Selling Data','A buyer was waiting before the first file moved.'),
      M('grudge','Grudge','Termination paperwork was already drafted.'),
      M('blackmailc','Building Leverage','They wanted something to hold over leadership.'),
      M('debt','Debt','A single payment would have cleared everything.'),
      M('cover','Erasing Evidence','The breach was cover for deleting their own trail.'),
    ],
    objectNoun: ['a cloned access badge','an unregistered laptop','a VPN receipt','a wiped USB device'],
  },
  {
    id: 'kidnap', type: 'Kidnapping',
    titles: ['Proof of Life, Timestamped','The Second Car','Ransom Is a Deadline','Nobody Called the Police'],
    incident: ['was taken from a controlled area','was reported abducted after a ransom demand','disappeared minutes after a confirmed sighting'],
    victimRole: 'the abductee',
    sceneKinds: ['garage','street','warehouse','home','station'],
    motives: [
      M('money','Ransom','Debts that could only be solved by a lump sum.'),
      M('custody','Custody','They believed the law had failed them.'),
      M('leverage','Leverage','The victim was a means of pressuring someone else.'),
      M('revenge','Revenge','A punishment aimed at the victim’s family.'),
      M('panic','Escalated Confrontation','It began as an argument and became a crime.'),
    ],
    objectNoun: ['a cable tie fragment','a second set of plates','a burner handset','a taped window edge'],
  },
  {
    id: 'insurance', type: 'Insurance Fraud',
    titles: ['Total Loss','The Claim Was Written First','Staged, Then Reported','Adjuster’s Note 7'],
    incident: ['filed a claim investigators believe was staged','reported a loss that predates the incident','submitted a claim with impossible timestamps'],
    victimRole: 'the insurer',
    sceneKinds: ['garage','shop','home','street','warehouse'],
    motives: [
      M('debt','Debt','The claim was the only exit from a spiral.'),
      M('greed','Greed','The item was worth more insured than owned.'),
      M('cover','Hiding a Sale','The property was gone long before the claim.'),
      M('spite','Spite','A partner was meant to carry the blame.'),
      M('exit','Funding an Exit','They needed capital to leave and start over.'),
    ],
    objectNoun: ['a pre-dated valuation','a duplicate receipt','a staged tyre mark','a repaired serial plate'],
  },
  {
    id: 'conspiracy', type: 'Corporate Conspiracy',
    titles: ['Three People Agreed','Minutes Not Taken','The Room Without a Calendar','Consensus by Omission'],
    incident: ['uncovered a coordinated cover-up','found evidence of an off-book agreement','reported that safety findings were suppressed'],
    victimRole: 'the whistleblower',
    sceneKinds: ['office','hotel','restaurant','lab'],
    motives: [
      M('protect','Protecting the Deal','A signature was worth more than the truth.'),
      M('career','Career Survival','Disclosure would have ended several careers at once.'),
      M('money','Bonus Structure','The payout was tied to a milestone that had already failed.'),
      M('loyal','Misplaced Loyalty','They were protecting someone above them.'),
      M('fear','Fear','They were told what would happen if they spoke.'),
    ],
    objectNoun: ['an unminuted meeting room booking','a deleted findings draft','a private messaging thread','a signed NDA addendum'],
  },
];

export const RELATIONS = [
  'business partner','former partner','sibling','neighbour','direct report','line manager',
  'accountant','ex-spouse','flatmate','contractor','client','landlord','tenant','old friend',
  'rival','cousin','driver','assistant','doctor','lawyer','creditor','debtor','mentor','protégé',
];

export const SECRET_TEMPLATES = [
  { id: 'affair', label: 'A secret relationship', confession: 'I was with someone I am not supposed to be with. If that goes in a report, my marriage is over. That is the whole of it.' },
  { id: 'gambling', label: 'Gambling', confession: 'I was in a back room losing money I do not have. I would rather be a suspect than have that on paper.' },
  { id: 'interview', label: 'A secret job interview', confession: 'I was interviewing with a competitor. If that gets back to my employer I am finished before this is even resolved.' },
  { id: 'theftpetty', label: 'Petty theft', confession: 'I took cash from the register. Under two hundred. I was going to put it back. That is what I was hiding.' },
  { id: 'addiction', label: 'Substance use', confession: 'I was scoring. That is where I was. I have been clean on paper for two years and I would like to keep the paper.' },
  { id: 'protecting', label: 'Protecting someone else', confession: 'I was covering for someone who has nothing to do with this. They asked me to and I said yes without thinking.' },
  { id: 'immigration', label: 'A paperwork problem', confession: 'My status is not current. Every time someone official asks me a question I lie by reflex. I am sorry.' },
  { id: 'medical', label: 'A medical appointment', confession: 'I was at an oncology appointment. I have not told my family. I did not want it read out in a room like this.' },
  { id: 'debtmeet', label: 'Meeting a creditor', confession: 'I was meeting the people I owe money to. In person. That is not a conversation you put in a statement.' },
  { id: 'child', label: 'A hidden family matter', confession: 'I have a child nobody in my life knows about. That is who I was with. Please leave it there.' },
];

export const RED_HERRING_FLAVOUR = [
  'Anomalous but ultimately explainable.',
  'Compelling on first read. Does not survive the timeline.',
  'Circumstantial. Handle carefully.',
  'Suggestive, not probative.',
  'Consistent with several innocent explanations.',
];
