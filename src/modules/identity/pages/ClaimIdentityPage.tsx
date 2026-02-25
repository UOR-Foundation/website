/**
 * Claim Identity Page — redirect landing for OAuth/magic-link callbacks.
 * Opens the claim dialog automatically inside the page layout.
 */

import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import ClaimIdentityDialog from "@/modules/identity/components/ClaimIdentityDialog";

const ClaimIdentityPage = () => {
  const [open, setOpen] = useState(true);

  return (
    <Layout>
      <section className="hero-gradient pt-[21px] md:pt-52 pb-20 md:pb-28">
        <div className="container max-w-2xl text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Claim UOR Identity
          </h1>
          <p className="text-muted-foreground font-body">
            Your identity claim is being processed…
          </p>
        </div>
      </section>
      <ClaimIdentityDialog open={open} onOpenChange={setOpen} />
    </Layout>
  );
};

export default ClaimIdentityPage;
