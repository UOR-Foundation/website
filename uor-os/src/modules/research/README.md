# Layer 5 — Research

Experimental and advanced modules. These are code-split and lazy-loaded.

## Modules

| Module | Description |
|--------|-------------|
| `quantum/` | Quantum circuit simulation (Bloch sphere, gate operations) |
| `atlas/` | Mathematical atlas — topological visualization of the UOR space |
| `qsvg/` | Quantum SVG — visual proof-of-thought rendering |
| `shacl/` | SHACL conformance testing for RDF graphs |
| `canonical-compliance/` | Compliance dashboard — validates the system against its own axioms |

## Dependency Rule

Research modules may depend on any lower layer. They are never imported by other subsystems.
