

# Fix: PINATA_GATEWAY_URL Secret Has Wrong Value

## Problem
The `PINATA_GATEWAY_URL` secret is currently set to the gateway **token** (`IVT2jzIGIV...`) instead of the gateway **URL** (`https://uor.mypinata.cloud`). This causes all read/verify requests to fail with "Invalid URL" because the code constructs URLs like `IVT2jzI.../ipfs/<cid>` instead of `https://uor.mypinata.cloud/ipfs/<cid>`.

## Evidence
- Write succeeded: CID `baguqeerafunvg4dngndilyhnowntiorrbvdybfrpkbzxxwvxolhssvpnm4fa` pinned
- Read/Verify fail with: `Invalid URL: 'IVT2jzIGIVkk8BqsOavU.../ipfs/<cid>'`
- The X-Ipfs-Gateway-Url header in the write response also shows the token being used as a URL

## Fix (single change)
Update the `PINATA_GATEWAY_URL` secret to the correct value: `https://uor.mypinata.cloud`

The `PINATA_GATEWAY_TOKEN` secret already holds the correct token value. No code changes needed.

## Verification Plan
After fixing the secret:
1. **Read test**: `GET /store/read/baguqeerafunvg4dngndilyhnowntiorrbvdybfrpkbzxxwvxolhssvpnm4fa` -- should return the stored JSON-LD with dual verification
2. **Verify test**: `GET /store/verify/baguqeerafunvg4dngndilyhnowntiorrbvdybfrpkbzxxwvxolhssvpnm4fa` -- should confirm CID and UOR address match
3. **Full round-trip**: Compare retrieved payload against original to confirm `write_bytes === read_bytes`

