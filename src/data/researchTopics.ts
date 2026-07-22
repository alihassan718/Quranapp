import { IconName } from '../components/ui/Icon';

/**
 * Research subjects — the card grid on the Research tab.
 *
 * Adding a subject = adding an entry here. Each topic will later carry curated
 * āyāt (verse references + notes) supplied as DATA (assets/data/research/…),
 * never authored in code; until then a topic renders its curation-pending state.
 */
export interface ResearchTopic {
  id: string;
  title: string;
  icon: IconName;
  /** One-line teaser shown on the card. */
  blurb: string;
}

export const RESEARCH_TOPICS: ResearchTopic[] = [
  {
    id: 'science',
    title: 'Science',
    icon: 'flask-outline',
    blurb: 'Creation, cosmos, water, embryology — āyāt inviting observation of nature.',
  },
  {
    id: 'maths',
    title: 'Maths',
    icon: 'calculator-outline',
    blurb: 'Number, measure, reckoning and proportion across the text.',
  },
  {
    id: 'philosophy',
    title: 'Philosophy',
    icon: 'bulb-outline',
    blurb: 'Knowledge, truth, reason, and reflection — the Qur\'an\'s epistemic vocabulary.',
  },
  {
    id: 'psychology',
    title: 'Psychology',
    icon: 'extension-puzzle-outline',
    blurb: 'The nafs, the heart, tranquility, grief, and states of the soul.',
  },
  {
    id: 'medicine',
    title: 'Medicine',
    icon: 'medkit-outline',
    blurb: 'Healing, illness, wellbeing, and what is described as cure.',
  },
];

export function getResearchTopic(id: string): ResearchTopic | undefined {
  return RESEARCH_TOPICS.find((t) => t.id === id);
}
