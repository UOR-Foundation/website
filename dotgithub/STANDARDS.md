# Repository Standards

This document summarises the naming, versioning, and tagging conventions enforced across all UOR Foundation repositories. For the complete governance framework, see [`governance/GOVERNANCE.md`](governance/GOVERNANCE.md).

## Naming Conventions

- Repository names: lowercase, hyphen-separated. Descriptive of content.
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

| Tag | When |
|-----|------|
| `uor-foundation` | All repositories |
| `uor-tier-{1-4}` | Tier classification |
| `uor-{status}` | Lifecycle status: `active`, `maintenance`, `deprecated`, `archived` |

## Required Files by Tier

See [Governance Framework, Section 6.2](governance/GOVERNANCE.md#62-required-files--configuration) for the complete requirements matrix.

## Branch Protection

See [Governance Framework, Section 6.3](governance/GOVERNANCE.md#63-branch-protection-rules) for tier-specific rules.
