import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Heart } from "lucide-react";
import { useEffect } from "react";

interface DonatePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DonatePopup = ({ open, onOpenChange }: DonatePopupProps) => {
  useEffect(() => {
    if (open) {
      // Load Donorbox script when popup opens
      const existing = document.querySelector('script[src="https://donorbox.org/widgets.js"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://donorbox.org/widgets.js";
        script.async = true;
        script.setAttribute("paypalExpress", "false");
        document.head.appendChild(script);
      }
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl">
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
            Your contribution powers open science, frontier research, and the universal data standard.
          </p>
        </div>
        <div className="px-2 pb-2">
          <iframe
            src="https://donorbox.org/embed/the-uor-foundation?default_interval=o&hide_donation_meter=true"
            name="donorbox"
            // @ts-ignore - allowpaymentrequest is valid for payment iframes
            allowpaymentrequest=""
            allow="payment"
            style={{
              width: "100%",
              minHeight: 420,
              border: "none",
              borderRadius: "0 0 12px 12px",
            }}
            title="Donate to The UOR Foundation"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonatePopup;
