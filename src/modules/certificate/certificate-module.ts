/**
 * Certificate — UorModule<ModuleCertificate> Implementation
 * ═════════════════════════════════════════════════════════
 *
 * The certificate engine using the generic lifecycle base.
 * Certificate issuance and verification are automatically
 * observed for coherence.
 *
 * @module certificate/certificate-module
 */

import { UorModule, type ModuleCertificate as BaseCert } from "@/modules/core/uor-module";

/** A certificate verification event tracked by the lifecycle. */
export interface CertEvent {
  readonly certId: string;
  readonly subject: string;
  readonly verified: boolean;
  readonly timestamp: string;
}

export class CertificateModule extends UorModule<CertEvent> {
  private _events: CertEvent[] = [];

  constructor() {
    super("certificate", "Certificate Engine");
    this.register();
  }

  /**
   * Record a certificate issuance/verification event
   * with automatic lifecycle observation.
   */
  recordEvent(
    certId: string,
    subject: string,
    verified: boolean,
  ): CertEvent {
    const event: CertEvent = {
      certId,
      subject,
      verified,
      timestamp: new Date().toISOString(),
    };

    this._events.push(event);
    if (this._events.length > 200) this._events = this._events.slice(-200);

    // Observe: verified → isometric (input≈output), failed → high distance
    const inByte = hashStr(certId) & 0xff;
    const outByte = verified ? inByte : (inByte ^ 0xff); // Perfect match or max distance
    this.observe(`cert:${verified ? "verify" : "fail"}`, inByte, outByte, event);

    return event;
  }

  get events(): readonly CertEvent[] { return this._events; }

  protected verifySelf(): { verified: boolean; failures: string[] } {
    const failures: string[] = [];
    const recent = this._events.slice(-20);
    const failCount = recent.filter(e => !e.verified).length;
    if (recent.length > 0 && failCount / recent.length > 0.5) {
      failures.push(`High failure rate: ${failCount}/${recent.length} recent verifications failed`);
    }
    return { verified: failures.length === 0, failures };
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
