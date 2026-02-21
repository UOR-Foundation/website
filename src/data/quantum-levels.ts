/**
 * UOR Quantum scaling levels — serializable data for UOR certification.
 * Shows how the system scales from small (8-bit) to arbitrary precision.
 */

export interface QuantumLevel {
  quantum: number;
  label: string;
  bits: number;
  states: string;
  description: string;
}

export const quantumLevels: QuantumLevel[] = [
  {
    quantum: 0,
    label: "Q0",
    bits: 8,
    states: "256",
    description: "A single byte. Every possible value can be verified exhaustively.",
  },
  {
    quantum: 1,
    label: "Q1",
    bits: 16,
    states: "65,536",
    description: "Two bytes. Enough to represent any Unicode character.",
  },
  {
    quantum: 2,
    label: "Q2",
    bits: 24,
    states: "16.7 million",
    description: "Three bytes. Covers every color a screen can display.",
  },
  {
    quantum: 3,
    label: "Q3",
    bits: 32,
    states: "4.3 billion",
    description: "Four bytes. More states than people on Earth.",
  },
];
