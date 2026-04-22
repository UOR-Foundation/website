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
import rfc8785, hashlib
obj = {'z': 1, 'a': 2.0, 'msg': 'café'}
canonical = rfc8785.dumps(obj)
print('canonical :', canonical)
print('sha256    :', hashlib.sha256(canonical).hexdigest())
"`;

const PROVE_PYTHON_OUTPUT = `canonical : b'{"a":2,"msg":"caf\\xc3\\xa9","z":1}'
sha256    : 9e8d55e66dd35b318d2cb0fa1cc47ed93ebea3ce529c9b69e47b17df2645a553`;

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
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2 font-body">
      The property, in four hashes
    </p>
    <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed">
      The fingerprint survives runtimes because the canonicalization is deterministic.
      Same object, four serializers, four hashes — watch what happens:
    </p>
    <CodeBlock code={FOUR_HASHES} language="same input · three serializers" />
    <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed mt-3">
      Python leaves <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">2.0</code> alone and escapes <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">é</code> as <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">\u00e9</code>. Node normalises <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">2.0 → 2</code> and keeps <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">é</code> as literal UTF-8. Neither agrees with the other; hashing either one breaks at the first re-parse. UOR sorts keys, normalises the number, emits the canonical bytes — and every RFC 8785 JCS runtime produces the same 256 bits. Reproduce it yourself below.
    </p>

    <details className="mt-5 group">
      <summary className="cursor-pointer text-[14.5px] font-medium text-foreground hover:text-primary transition-colors font-body list-none flex items-center gap-2">
        <span className="text-muted-foreground group-open:rotate-90 transition-transform inline-block">›</span>
        Prove the UOR hash in your own agent (no install)
      </summary>
      <div className="mt-3 pl-5">
        <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed">Ask your agent:</p>
        <CodeBlock code={PROVE_AGENT_PROMPT} language="ask your agent" />
        <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed mt-3">Response field to look at:</p>
        <CodeBlock code={PROVE_AGENT_RESPONSE} language="response · field" />
        <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed mt-3">
          Byte-identical to the UOR row above. Your agent just had the Rust server canonicalise the object and hash it; same 256 bits.
        </p>
      </div>
    </details>

    <details className="mt-4 group">
      <summary className="cursor-pointer text-[14.5px] font-medium text-foreground hover:text-primary transition-colors font-body list-none flex items-center gap-2">
        <span className="text-muted-foreground group-open:rotate-90 transition-transform inline-block">›</span>
        Prove it in a second runtime (30 s, one pip install)
      </summary>
      <div className="mt-3 pl-5">
        <CodeBlock code={PROVE_PYTHON_CMD} language="bash" />
        <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed mt-3">Output:</p>
        <CodeBlock code={PROVE_PYTHON_OUTPUT} language="output" />
        <p className="text-[14.5px] text-foreground/80 font-body leading-relaxed mt-3">
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[12.5px]">rfc8785</code> is an independent Python implementation of RFC 8785 JCS — zero shared code with the UOR Rust server. Same spec, same canonical bytes, same fingerprint. Two binaries, two runtimes, one answer.
        </p>
      </div>
    </details>
  </div>
);

export default FourHashesProof;