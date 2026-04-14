/**
 * Claim Identity Page. redirect landing for OAuth/magic-link callbacks.
 * Opens the claim dialog automatically inside the page layout.
 */

import { useState } from "react";
import Layout from "@/modules/core/components/Layout";
import ClaimIdentityDialog from "@/modules/identity/components/ClaimIdentityDialog";

const ClaimIdentityPage = () => {
  const [open, setOpen] = useState(true);

  return (
    <Layout>
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-2xl text-center">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground mb-4">
            Claim Identity
          </h1>
          <p className="text-fluid-body text-foreground/70 font-body">
            Your identity claim is being processed…
          </p>
        </div>
      </section>
      <ClaimIdentityDialog open={open} onOpenChange={setOpen} />
    </Layout>
  );
};

export default ClaimIdentityPage;
