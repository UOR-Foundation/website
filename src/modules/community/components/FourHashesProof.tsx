import { useState } from "react";
import { Copy, Check } from "lucide-react";

const FOUR_HASHES = `Input: {"z": 1, "a": 2.0, "msg": "café"}

Python json.dumps (default)
  bytes   {"z": 1, "a": 2.0, "msg": "caf\\u00e9"}
  sha256  550fc94cbb2fd57391d634788e08b45fd0d6632b7bb41d18d7eca6e47c7ea840

Node JSON.stringify (default)
  bytes   {"z":1,"a":2,"msg":"café"}
  sha256  d0c31a49f78a1fac09174e97c6673eeaee0a123110d6b97630f5ee585900913a

UOR canonical form (RFC 8785 JCS)
  bytes   {"a":2,"msg":"café","z":1}
  sha256  9e8d55e66dd35b318d2cb0fa1cc47ed93ebea3ce529c9b69e47b17df2645a553
            ↑ the UOR passport fingerprint — same answer in every JCS runtime`;

const PROVE_AGENT_PROMPT = `Use uor.verify_passport with content
{"z": 1, "a": 2.0, "msg": "caf\\u00e9"}
and a dummy fingerprint of 64 zeros.`;

const PROVE_AGENT_RESPONSE = `computed_fingerprint: 9e8d55e66dd35b318d2cb0fa1cc47ed93ebea3ce529c9b69e47b17df2645a553`;

const PROVE_PYTHON_CMD = `pip install rfc8785

python -c "
import rfc8785, hashlib, unicodedata

def uor_hash(obj):
    # NFC-normalize every string in the tree (UOR's extension over JCS)
    def nfc(v):
        if isinstance(v, str):  return unicodedata.normalize('NFC', v)
        if isinstance(v, list): return [nfc(x) for x in v]
        if isinstance(v, dict): return {nfc(k): nfc(x) for k, x in v.items()}
        return v
    return hashlib.sha256(rfc8785.dumps(nfc(obj))).hexdigest()

print(uor_hash({'z': 1, 'a': 2.0, 'msg': 'café'}))
"`;

const PROVE_PYTHON_OUTPUT = `9e8d55e66dd35b318d2cb0fa1cc47ed93ebea3ce529c9b69e47b17df2645a553`;

const CodeBlock = ({ code, language }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="not-prose relative rounded-lg border border-border bg-muted/60 overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          {language ?? "code"}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-[13.5px] font-mono text-foreground leading-relaxed overflow-x-auto m-0">
        {code}
      </pre>
    </div>
  );
};

const FourHashesProof = () => (
  <div className="not-prose mt-8 rounded-xl border border-border bg-card p-5 md:p-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3 font-body">
      The property, in four hashes
    </p>
    <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7]">
      The fingerprint survives runtimes because the canonicalization is deterministic.
      Same object, four serializers, four hashes — watch what happens:
    </p>
    <CodeBlock code={FOUR_HASHES} language="same input · three serializers" />
    <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7] mt-4">
      Python leaves <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">2.0</code> alone and escapes <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">é</code> as <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">\u00e9</code>. Node normalises <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">2.0 → 2</code> and keeps <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">é</code> as literal UTF-8. Neither agrees with the other; hashing either one breaks at the first re-parse. UOR sorts keys, normalises the number, emits the canonical bytes — and every RFC 8785 JCS runtime produces the same 256 bits. Reproduce it yourself below.
    </p>

    <details className="mt-6 group">
      <summary className="cursor-pointer text-[15px] md:text-[16px] font-medium text-foreground hover:text-primary transition-colors font-body list-none flex items-center gap-2">
        <span className="text-muted-foreground group-open:rotate-90 transition-transform inline-block">›</span>
        Prove the UOR hash in your own agent (no install)
      </summary>
      <div className="mt-3 pl-5">
        <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7]">Ask your agent:</p>
        <CodeBlock code={PROVE_AGENT_PROMPT} language="ask your agent" />
        <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7] mt-3">Response field to look at:</p>
        <CodeBlock code={PROVE_AGENT_RESPONSE} language="response · field" />
        <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7] mt-3">
          Byte-identical to the UOR row above. Your agent just had the Rust server canonicalise the object and hash it; same 256 bits.
        </p>
      </div>
    </details>

    <details className="mt-4 group">
      <summary className="cursor-pointer text-[15px] md:text-[16px] font-medium text-foreground hover:text-primary transition-colors font-body list-none flex items-center gap-2">
        <span className="text-muted-foreground group-open:rotate-90 transition-transform inline-block">›</span>
        Prove it in a second runtime (30 s, one pip install)
      </summary>
      <div className="mt-3 pl-5">
        <CodeBlock code={PROVE_PYTHON_CMD} language="bash" />
        <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7] mt-3">Output:</p>
        <CodeBlock code={PROVE_PYTHON_OUTPUT} language="output" />
        <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7] mt-3">
          A bare <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">rfc8785.dumps(...)</code> matches the UOR server only on already-NFC input. For full cross-runtime convergence, any independent implementation must apply NFC normalization before JCS, as shown above. This is what makes <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">uor-sha256-v1</code> a complete scheme rather than a library call.
        </p>
        <p className="text-[15px] md:text-[16px] text-foreground/80 font-body leading-[1.7] mt-3">
          <strong>Reference implementations.</strong> Rust (server + verifier) and Python (verifier, via <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13.5px]">rfc8785</code> + NFC preprocessing as shown above) today. The full scheme is small enough — NFC pass, JCS serialization, SHA-256 — that a port to Node, Go, Java, or Swift is roughly 50 lines and an afternoon&rsquo;s work. Contributions welcome at{" "}
          <a href="https://github.com/humuhumu33/uor-passport" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">github.com/humuhumu33/uor-passport</a>.
        </p>
      </div>
    </details>
  </div>
);

export default FourHashesProof;