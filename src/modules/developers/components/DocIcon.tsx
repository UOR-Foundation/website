import {
  Rocket, Globe, Cpu, Database, Shield, Lock, Bot, Key,
  ScrollText, Code, Home, FileJson, type LucideProps,
} from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const iconMap: Record<string, LucideIcon> = {
  Rocket, Globe, Cpu, Database, Shield, Lock, Bot, Key,
  ScrollText, Code, Home, FileJson,
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
