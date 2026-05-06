/**
 * Projects module types.
 */

export interface Project {
  name: string;
  category: string;
  description: string;
  url?: string;
  image?: string;
}

export interface SubmissionStep {
  icon: React.ElementType;
  title: string;
  description: string;
}
