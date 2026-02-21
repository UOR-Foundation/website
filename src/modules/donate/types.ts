/**
 * Donate module types.
 */

export interface DonationProject {
  title: string;
  raised: number;
  target: number;
  description: string;
  highlights: string[];
  donateUrl: string;
}

export interface DonatePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
