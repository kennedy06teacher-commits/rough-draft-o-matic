export interface AssignmentConfig {
  name: string;
  prompt: string;
  rubric: string;
  exemplars: string[];
  assignmentPdfFilename?: string;
  lastUpdated?: string;
}

export type AssignmentsStore = Record<string, AssignmentConfig>;
