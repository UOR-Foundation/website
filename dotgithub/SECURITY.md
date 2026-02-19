# Security Policy

## Reporting a Vulnerability

**Do not file a public Issue.** Vulnerabilities must be reported privately.

**How to report:**
- Use [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories) on the affected repository, or
- Email: **security@uor.foundation**

Include: description of the vulnerability, affected repository and version, steps to reproduce, and any potential impact.

## Response Timelines

| Severity | Acknowledge | Triage | Patch Released | Public Disclosure |
|----------|-------------|--------|----------------|-------------------|
| Critical | 24 hours | 24 hours | 72 hours | After patch available |
| High | 24 hours | 48 hours | 7 days | After patch available |
| Medium | 48 hours | 5 days | 30 days | After patch available |
| Low | 5 days | 14 days | Next scheduled release | With release notes |

## Process

1. **Acknowledge** — We confirm receipt within the timeline above.
2. **Triage** — We assess severity (Critical / High / Medium / Low).
3. **Remediate** — A fix is developed using our [emergency procedure](governance/GOVERNANCE.md#74-emergency--hotfix-procedure).
4. **Release** — A patch release is published. Affected versions are noted in a GitHub Security Advisory.
5. **Disclose** — After the patch is available, the advisory is made public with credit to the reporter.
6. **Review** — A post-incident review is conducted within 14 days.

## Scope

This policy applies to all repositories under the [UOR Foundation](https://github.com/UOR-Foundation) organisation.
