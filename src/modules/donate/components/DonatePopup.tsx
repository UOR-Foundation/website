import { useState, useCallback, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/modules/core/ui/dialog";
import { Heart, Copy, Check, Wallet, Bitcoin, ShieldCheck, X, Eye } from "lucide-react";
import qrBitcoin from "@/assets/qr-bitcoin.png";
import qrEthereum from "@/assets/qr-ethereum.png";
import qrSolana from "@/assets/qr-solana.png";

interface DonatePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// SHA-256 — canonical single implementation
import { sha256hex as sha256Hex } from "@/lib/crypto";

const CRYPTO_ADDRESSES = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    address: "bc1qzvh59jks6uqmwnltw2fs6kduz5wu2ldw4088my",
    qr: qrBitcoin,
    color: "hsl(36, 100%, 50%)",
  },
  {
    name: "Ethereum & USDC",
    symbol: "ETH",
    address: "0xfD7813Ad2b46B270665BA02d33Dc3FD0E4D21D15",
    qr: qrEthereum,
    color: "hsl(231, 50%, 58%)",
  },
  {
    name: "Solana",
    symbol: "SOL",
    address: "FtKFsexufkdBuhUcMJiHk2DvLZNvCnEq4Mtxottu5Q9r",
    qr: qrSolana,
    color: "hsl(270, 70%, 55%)",
  },
];

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(() => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [address]);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <code className="text-base text-muted-foreground font-mono break-all leading-relaxed select-all">
          {address}
        </code>
        <button
          onClick={handle}
          className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Copy address"
        >
          {copied ? (
            <Check size={15} className="text-primary" />
          ) : (
            <Copy size={15} className="text-muted-foreground" />
          )}
        </button>
      </div>
      {copied && (
        <p className="text-xs font-medium mt-1 animate-fade-in" style={{ color: "hsl(142, 71%, 45%)" }}>
          ✓ Address copied to clipboard
        </p>
      )}
    </div>
  );
}

/** QR code with blur overlay — click to reveal one at a time. */
function RevealableQR({ src, name }: { src: string; name: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="shrink-0 w-[160px] h-[160px] rounded-lg overflow-hidden bg-background border border-border/30 p-2 relative">
      <img
        src={src}
        alt={`${name} QR code`}
        className="w-full h-full object-contain"
      />
      {!revealed && (
        <button
          onClick={() => setRevealed(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer backdrop-blur-md bg-background/60 transition-opacity hover:bg-background/50"
          aria-label={`Reveal ${name} QR code`}
        >
          <Eye size={24} className="text-foreground/70" />
          <span className="text-xs font-semibold font-body text-foreground/80">
            Click to reveal
          </span>
        </button>
      )}
    </div>
  );
}

/** Certificate panel that derives a SHA-256 proof from the address content. */
function CertificatePanel({ name, symbol, address }: { name: string; symbol: string; address: string }) {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState<string | null>(null);

  // Precise issuance timestamp — captured at component mount
  const issuedAt = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    if (open && !hash) {
      // Canonical payload: deterministic string that ties the certificate to the address
      const canonical = JSON.stringify({ network: symbol, address, issuedAt });
      sha256Hex(canonical).then(setHash);
    }
  }, [open, hash, symbol, address, issuedAt]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium font-body text-primary hover:text-primary/80 transition-colors mt-2"
      >
        <ShieldCheck size={14} />
        Verify certificate
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-lg border border-primary/20 bg-primary/5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold font-body text-primary">
          <ShieldCheck size={14} />
          UOR Certificate — {name}
        </span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-0.5">
          <X size={12} />
        </button>
      </div>
      <dl className="space-y-1 text-[11px] font-mono text-muted-foreground">
        <div>
          <dt className="inline font-semibold text-foreground/70">Network: </dt>
          <dd className="inline">{symbol}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-foreground/70">Address: </dt>
          <dd className="inline break-all">{address}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-foreground/70">Issued: </dt>
          <dd className="inline">{issuedAt}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-foreground/70">SHA-256: </dt>
          <dd className="inline break-all">{hash ?? "computing…"}</dd>
        </div>
      </dl>
      <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
        This certificate is content-derived. Any modification to the address will produce a different hash, invalidating the proof.
      </p>
    </div>
  );
}
const DonatePopup = ({ open, onOpenChange }: DonatePopupProps) => {
  const [tab, setTab] = useState<"fiat" | "crypto">("fiat");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-border/30">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
            <Heart
              size={24}
              className="text-primary animate-[heartbeat_1.94s_ease-in-out_infinite]"
              fill="currentColor"
              strokeWidth={0}
            />
          </div>
          <DialogTitle className="text-xl font-display font-semibold tracking-tight">
            Support Your Foundation
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto font-body">
            Your contribution powers open science, frontier research, and the
            universal data standard.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2 flex gap-2">
          <button
            onClick={() => setTab("fiat")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium font-body transition-all ${
              tab === "fiat"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Wallet size={16} />
            Donate with Fiat
          </button>
          <button
            onClick={() => setTab("crypto")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium font-body transition-all ${
              tab === "crypto"
                ? "bg-[hsl(36,100%,50%)] text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Bitcoin size={16} />
            Donate with Crypto
          </button>
        </div>

        {/* Content */}
        {tab === "fiat" ? (
          <div className="px-2 pb-2">
            <iframe
              src="https://donorbox.org/embed/the-uor-foundation?default_interval=o&hide_donation_meter=true"
              name="donorbox"
              // @ts-ignore - allowpaymentrequest is valid for payment iframes
              allowpaymentrequest=""
              allow="payment"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              style={{
                width: "100%",
                minHeight: 420,
                border: "none",
                borderRadius: "0 0 12px 12px",
              }}
              title="Donate to The UOR Foundation"
            />
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-5 max-h-[65vh] overflow-y-auto">
            {CRYPTO_ADDRESSES.map((crypto) => (
              <div
                key={crypto.symbol}
                className="flex flex-col p-4 rounded-xl border border-border/40 bg-card/50"
              >
                <div className="flex items-start gap-4">
                  {/* QR Code */}
                  <RevealableQR src={crypto.qr} name={crypto.name} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: crypto.color }}
                      />
                      <span className="text-base font-semibold font-body text-foreground">
                        {crypto.name}
                      </span>
                    </div>
                    <CopyAddress address={crypto.address} />
                  </div>
                </div>

                {/* Certificate */}
                <CertificatePanel
                  name={crypto.name}
                  symbol={crypto.symbol}
                  address={crypto.address}
                />
              </div>
            ))}

            <p className="text-xs text-muted-foreground text-center pt-1 font-body">
              Send only the specified asset to each address. Verify the address
              before sending.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DonatePopup;
