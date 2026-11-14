import { FindingKind } from '../../contracts/outcomes.js';
import { SourceLocation } from '../model.js';

export type Confidence = 'high' | 'medium' | 'low' | 'unverified';

export interface Finding {
  id: string;
  kind: FindingKind;
  confidence: Confidence;
  message: string;
  locations: SourceLocation[];
  evidence: string[];
  relatedMutantIds?: string[];
}
