

# Fix: PINATA_GATEWAY_URL Secret -- Correct Value

## Problem
The `PINATA_GATEWAY_URL` secret currently holds the gateway **token** (`IVT2jzIGIVkk8BqsOavU007KvT6SwMVvJgyQJpzP1aqEBC1E9cKEZdhz3oqw67-H`) instead of the gateway **URL** (`https://uor.mypinata.cloud`). This causes all read and verify requests to fail with "Invalid URL" because the code constructs fetch URLs like `IVT2jzIGIV.../ipfs/<cid>` instead of `https://uor.mypinata.cloud/ipfs/<cid>`.

## Evidence (just confirmed via live tests)
- **Write**: Succeeded -- CID `baguqeera34y57qgd4hk4jr76vfhdnewsdbxly7dixdn3gz53apgp52cunt5q` pinned to IPFS
- **Read**: Failed with `Invalid URL: 'IVT2jzIGIV.../ipfs/<cid>?pinataGatewayToken=IVT2jzIGIV...'`
- **Verify**: Same failure

The token is being used in 3 places as a URL:
1. Line 2281: write response gateway URL
2. Line 2669: read gateway default
3. Line 3101: verify gateway URL

## Fix (single change, no code edits needed)
Update the `PINATA_GATEWAY_URL` secret from the token value to: `https://uor.mypinata.cloud`

The `PINATA_GATEWAY_TOKEN` secret already correctly holds the access token for authenticating requests to the dedicated gateway.

## Verification Plan
After fixing the secret, re-run the full round-trip:
1. **Write** a test object via `POST /store/write`
2. **Read** it back via `GET /store/read/<cid>` -- should return the stored JSON-LD with dual verification
3. **Verify** via `GET /store/verify/<cid>` -- should confirm CID and UOR address match
4. **Compare** the retrieved payload bytes against the original to prove `write_bytes === read_bytes` (universal lossless bijection)

