/**
 * Research data registry — the plug-in point for bundled Research content.
 * Adding a field file = one import + one array entry here; everything else
 * (validation, search, credits sources) derives from this list generically.
 */

import maths from '../../assets/data/research/maths.json';
import medicine from '../../assets/data/research/medicine.json';
import philosophy from '../../assets/data/research/philosophy.json';
import psychology from '../../assets/data/research/psychology.json';
import science from '../../assets/data/research/science.json';

import { ResearchFieldFile } from './researchSchema';

export const RESEARCH_FILES: ResearchFieldFile[] = [
  science as unknown as ResearchFieldFile,
  maths as unknown as ResearchFieldFile,
  philosophy as unknown as ResearchFieldFile,
  psychology as unknown as ResearchFieldFile,
  medicine as unknown as ResearchFieldFile,
];
