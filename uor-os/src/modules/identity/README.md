# Layer 1 — Identity

Naming and addressing. Every object in UOR OS gets a deterministic, content-derived identifier.

## Modules

| Module | Description |
|--------|-------------|
| `uns/` | Universal Name System — human-readable names resolved to content addresses |
| `addressing/` | Content addressing pipeline: bytes → CID → IPv6 → glyph |
| `certificate/` | X.509, DID, and Verifiable Credential issuance and verification |
| `qr-cartridge/` | QR code encoding/decoding of UOR addresses |

## Dependency Rule

Identity modules depend on **kernel/** only.
