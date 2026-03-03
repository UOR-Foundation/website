# Security Model

> **Linux equivalent**: `Documentation/security/`

## 4-Ring Isolation Model ≡ x86 Ring Levels + LSM

| Ring | Name | Linux Equivalent | Permissions |
|---|---|---|---|
| 0 | Kernel | Ring 0 (kernel mode) | All operations |
| 1 | Driver | Ring 1 (drivers) | Read, write, execute (no admin) |
| 2 | Service | Ring 2 (services) | Read, write, limited execute |
| 3 | User | Ring 3 (user mode) | Read only |

## Capability Tokens ≡ POSIX Capabilities + LSM Labels

Every process receives a capability token at registration:
- Content-addressed (CID-based, immutable)
- Tracks derivation lineage (who granted what)
- ECC-signed verification on every syscall

## Syscall Authorization Flow

```
Application → syscall(op, path) → QSecurity.authorizeSyscall()
  → Check process ring
  → Verify capability token
  → ECC-sign authorization codeword
  → Return {authorized, eccVerified}
```

## Elevation ≡ sudo / setuid

Processes can request ring elevation:
- Must provide justification string
- Maximum 2-ring jump per request
- All elevations logged to immutable audit trail

## TEE Bridge ≡ TPM + SGX

Software Trusted Execution Environment:
- Attestation quotes (software-signed)
- Sealed storage (encrypted at rest)
- Proof-of-Thought fusion (geometric + TEE receipts)
