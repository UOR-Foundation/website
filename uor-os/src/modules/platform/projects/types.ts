/**
 * Projects module types.
 */

export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export interface Project {
  name: string;
  category: string;
  description: string;
  maturity: MaturityLevel;
  url?: string;
  image?: string;
}

export interface MaturityInfo {
  level: MaturityLevel;
  tagline: string;
  description: string;
  criteria: string[];
}

export interface SubmissionStep {
  icon: React.ElementType;
  title: string;
  description: string;
}
