import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/modules/core/ui/dialog";
import { Heart, Copy, Check, Wallet, Bitcoin } from "lucide-react";
import qrBitcoin from "@/assets/qr-bitcoin.png";
import qrEthereum from "@/assets/qr-ethereum.png";
import qrSolana from "@/assets/qr-solana.png";

interface DonatePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    setTimeout(() => setCopied(false), 1800);
  }, [address]);

  return (
    <button
      onClick={handle}
      className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
      aria-label="Copy address"
    >
      {copied ? (
        <Check size={14} className="text-primary" />
      ) : (
        <Copy size={14} className="text-muted-foreground" />
      )}
    </button>
  );
}

const DonatePopup = ({ open, onOpenChange }: DonatePopupProps) => {
  const [tab, setTab] = useState<"fiat" | "crypto">("fiat");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl">
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
                ? "bg-primary text-primary-foreground shadow-md"
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
          <div className="px-6 pb-6 space-y-5">
            {CRYPTO_ADDRESSES.map((crypto) => (
              <div
                key={crypto.symbol}
                className="flex items-start gap-4 p-4 rounded-xl border border-border/40 bg-card/50"
              >
                {/* QR Code */}
                <div className="shrink-0 w-[88px] h-[88px] rounded-lg overflow-hidden bg-background border border-border/30 p-1">
                  <img
                    src={crypto.qr}
                    alt={`${crypto.name} QR code`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: crypto.color }}
                    />
                    <span className="text-sm font-semibold font-body text-foreground">
                      {crypto.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <code className="text-[11px] text-muted-foreground font-mono break-all leading-relaxed select-all">
                      {crypto.address}
                    </code>
                    <CopyAddress address={crypto.address} />
                  </div>
                </div>
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
