import { LocalizedString } from './multilingual';

/**
 * Generic Workflow Types
 * 
 * Allows campuses to define arbitrary administrative or procedural workflows
 * that can be queried via natural language, independent of navigation.
 */

export interface WorkflowStep {
  id: string;
  order: number;
  title: LocalizedString;
  description: LocalizedString;
  associatedObjectId?: string; // e.g., the room where this step occurs
  requiredDocuments?: LocalizedString[];
}

export interface CampusWorkflow {
  id: string;
  campusId: string;
  name: LocalizedString;
  description: LocalizedString;
  tags: string[]; // e.g., ['submit', 'project', 'assignment']
  steps: WorkflowStep[];
  primaryContactId?: string; // Optional reference to a Person or Department object
  primaryObjectId?: string;  // The primary destination for this workflow
}

export interface WorkflowResolution {
  workflow: CampusWorkflow;
  relatedObjects: string[]; // Object IDs associated with this workflow
}
