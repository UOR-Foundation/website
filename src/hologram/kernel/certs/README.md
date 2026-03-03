# certs/ — Certificate & Key Management

> **Linux equivalent**: `certs/`
>
> Manages kernel-level certificates, trust anchors, and
> cryptographic key material used for code signing and attestation.

## Planned Contents

| File | Purpose | Linux Equivalent |
|---|---|---|
| `system-keyring.ts` | Kernel trust anchor store | `certs/system_keyring.c` |
| `signing-key.ts` | Module signing key management | `certs/signing_key.pem` |
| `revocation-list.ts` | Certificate revocation tracking | `certs/revocation_certificates.pem` |

> **Status**: Scaffold — will be populated when PQC key management is integrated.
