import {
  Rocket, Globe, Cpu, Database, Shield, Lock, Bot, Key,
  ScrollText, Code, Home, FileJson, BookOpen, Fingerprint,
  Server, HardDrive, Network, ChevronRight, Terminal, Zap,
  Layers, ShieldCheck, FlaskConical, CircleDot, Plug, Share2,
  Search, FileText, Braces,
  type LucideProps,
} from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const iconMap: Record<string, LucideIcon> = {
  Rocket, Globe, Cpu, Database, Shield, Lock, Bot, Key,
  ScrollText, Code, Home, FileJson, BookOpen, Fingerprint,
  Server, HardDrive, Network, ChevronRight, Terminal, Zap,
  Layers, ShieldCheck, FlaskConical, CircleDot, Plug, Share2,
  Search, FileText, Braces,
};

interface DocIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const DocIcon = ({ name, size = 20, className }: DocIconProps) => {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
};
