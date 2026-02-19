# Repository Standards

This document summarises the naming, versioning, and tagging conventions enforced across all UOR Foundation repositories. For the complete governance framework, see [`governance/GOVERNANCE.md`](governance/GOVERNANCE.md).

## Naming Conventions

- Repository names: all lowercase, hyphen-separated. Preferred: `uor-{domain}-{function}` (e.g., `uor-math-formalization`).
- No version numbers in repo names (use tags).
- Branch names: `{type}/{issue#}-{short-description}` (e.g., `feat/42-add-parser`).
- Commit messages: [Conventional Commits v1.0.0](https://www.conventionalcommits.org/).

## Versioning

All Tier 1 and 2 repositories follow [Semantic Versioning 2.0.0](https://semver.org/):

| Component | Increment When |
|-----------|---------------|
| **MAJOR** | Incompatible API changes or breaking changes |
| **MINOR** | New backward-compatible functionality |
| **PATCH** | Backward-compatible bug fixes |

## Topic Tags

Every repository must carry the following GitHub topic tags:

| Category | Required Tags | When |
|----------|--------------|------|
| Identity | `uor`, `uor-foundation` | Every repository |
| Tier | `tier-1-core`, `tier-2-impl`, `tier-3-presentation`, `tier-4-experimental` | Exactly one per repo |
| Domain | `math`, `cryptography`, `computation`, `visualisation`, `documentation`, `governance`, `protocol` | All that apply |
| Technology | `rust`, `python`, `typescript`, `lean4`, `coq`, `latex` | Primary languages |
| Status | `active`, `maintenance`, `deprecated`, `archived` | Exactly one per repo |

## Required Files by Tier

See [Governance Framework, Section 6.1](governance/GOVERNANCE.md#61-required-files) for the complete requirements matrix.

## Branch Protection

See [Governance Framework, Section 6.2](governance/GOVERNANCE.md#62-branch-protection-rules) for tier-specific rules.
