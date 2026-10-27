import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import coverImage from "@/assets/blog-lexlean-v0-4.jpg";

const SLUG = "/blog/lexlean-v0-4";
const DEMO = "/blog/lexlean-v0-4/mnist-demo.html";
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

const SCORECARD = [
  ["Proved", "The contract, the step by step run on one image, decoding of the stored numbers, and the certificates from source to Rust", "Machine checked"],
  ["Measured", "98.92% accuracy on all 10,000 test images, identical to the industry standard runtime (onnxruntime)", "Gated by tests"],
  ["Measured", "About 8.7 ms per image versus about 66 µs for onnxruntime", "Reported only"],
  ["Not proved", "That internal running totals never overflow", "Checked at every step instead"],
];

const BlogLexLeanV04 = () => {
  const related = blogPosts
    .filter((p) => p.href !== SLUG)
    .slice(0, 3)
    .map((p) => ({ title: p.title, href: p.href, meta: `${p.tag} · ${p.date}`, image: getBlogCover(p.coverKey) }));

  return (
    <ArticleLayout
      kicker="Engineering"
      date="October 27, 2026"
      title="Write It Once. Read It, Prove It, Run It."
      heroImage={coverImage}
      backHref="/news"
      backLabel="Back to News"
      sourceUrl="https://github.com/UOR-Foundation/LexLean"
      sourceLabel="LexLean on GitHub"
      related={related}
    >
      <p><strong>LexLean v0.4 is here. Write an idea once in plain, precise English and get a readable paper, a machine checked proof and a working program that provably say the same thing.</strong></p>
      <p>Most software comes with two stories. One is the paper or report that explains what the program is supposed to do. The other is the code that actually runs. People read the first and trust the second, and almost nobody can check that the two really match.</p>
      <p><strong>LexLean</strong> closes that gap. You write your idea once, in plain, carefully structured English. From that single source, LexLean produces a document you can read, a proof a computer can check, and a program you can run, and it shows that all three say exactly the same thing.</p>
      <p>Version 0.4 is out today, and you can try the result below.</p>

      <h2>Why this matters</h2>
      <p>When a paper says "this model always returns a digit from 0 to 9", you are taking someone's word for it. When the code is rewritten, optimized or translated into another language, every step is a new chance for the story and the behavior to drift apart.</p>
      <p>The usual fixes are reviews, tests and good intentions. They help, but they are belief, not evidence. LexLean is built around a stricter idea: <strong>a claim only counts if a machine has checked it, and anyone can check it again.</strong></p>

      <h2>How it works</h2>
      <p>You write in a controlled language that reads like English but has a fixed, precise meaning, a little like a legal contract where every word is defined. Because nothing is ambiguous, LexLean never has to guess what you meant. From that one source it produces:</p>
      <ul>
        <li><strong>A paper.</strong> A clean, readable document, generated fresh from your source rather than copied, so it cannot fall out of date.</li>
        <li><strong>A proof.</strong> A program for Lean, a widely used proof checker: software that checks a mathematical argument one step at a time and rejects anything that does not follow.</li>
        <li><strong>A program.</strong> Working Rust code, a fast and widely used programming language, ready to deploy.</li>
      </ul>
      <p>Each translation step comes with a <strong>certificate</strong>: machine checked evidence that nothing changed meaning along the way. The paper you read, the proof that was checked and the program that runs are tied together, link by link.</p>

      <h2>Evidence, not belief</h2>
      <p>LexLean is strict about what it will say about itself.</p>
      <ul>
        <li>Only the <code className="text-fluid-body">verify</code> command runs the real proof checker and writes a tamper evident record. The everyday <code className="text-fluid-body">check</code> and <code className="text-fluid-body">build</code> commands never claim that anything is verified.</li>
        <li>Every claim the project makes is backed by an automated test. If a test is weakened or removed, the release fails.</li>
        <li>What is still missing is reported openly. Version 0.4 does not claim to meet the full specification; that is reserved for version 1.0.</li>
      </ul>

      <h2>What is new in v0.4</h2>
      <p>Earlier versions focused on proving mathematical statements. Version 0.4 moves into <strong>real programs</strong>: you can now write substantial software in the controlled language and turn it into certified Rust. Parts of LexLean's own compiler are already written in LexLean and pass the same checks, with the rest planned for coming releases.</p>
      <p>The release adds:</p>
      <ul>
        <li><strong>A richer language.</strong> Nested data, functions you can pass around, loops that are proven to finish, and predictable lists, maps and graphs.</li>
        <li><strong>Certified Rust.</strong> Certificates that link your source, an intermediate step and the final Rust code.</li>
        <li><strong>Proven best answers.</strong> A program may only claim it found the best possible result when there is a proof behind it.</li>
        <li><strong>Checked models.</strong> Rules, scoring systems and small neural networks, each with a contract the machine verifies.</li>
        <li><strong>Safe reasoning systems.</strong> Rule based systems with proven safety properties.</li>
        <li><strong>Text and language model parts</strong> with an audited guarantee that a prompt can never be run as code.</li>
        <li><strong>A standard library</strong>, including the SHA 256 fingerprint function, checked against official US government (NIST) test values.</li>
        <li><strong>Trustworthy releases.</strong> Checksums, a full list of ingredients and a container that anyone can use to verify the release again.</li>
      </ul>

      <h2>See it work: a digit reader you can check</h2>
      <p>The clearest example of v0.4 is a small handwriting reader. It recognizes digits drawn by hand, a classic test known as MNIST, using a compact model of about 6,000 numbers.</p>
      <p>The entire model is written in LexLean's controlled language; nothing else implements it. Draw a digit below and it is read live, entirely in your browser.</p>
      <div className="not-prose my-6 overflow-hidden rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-fluid-body text-muted-foreground">
          <span>Draw a digit from 0 to 9</span>
          <a href={DEMO} {...ext} className="text-primary hover:underline">Open full screen</a>
        </div>
        <iframe src={DEMO} title="LexLean MNIST digit reader" className="block h-[560px] sm:h-[520px] w-full" loading="lazy" />
      </div>
      <p>Before it runs, the page recomputes the program's fingerprint, a short code that changes completely if even one byte changes. If the fingerprint does not match the certified program, the page refuses to run.</p>
      <p>From that one source, LexLean derived:</p>
      <ul>
        <li><strong>Fingerprinted weights.</strong> The model's numbers are stored under their SHA 256 fingerprints, with a proof that the decoded numbers match those bytes exactly.</li>
        <li><strong>A checked run.</strong> A step by step, machine checked calculation on a real test image.</li>
        <li><strong>A proven contract.</strong> The input must be 784 bytes (a 28 by 28 image), and the output is always a digit from 0 to 9.</li>
        <li><strong>Linked certificates</strong> from source to intermediate step to Rust.</li>
        <li><strong>A standalone Rust package</strong> with no outside dependencies that can be verified again offline, without the source, without Lean and without a network connection.</li>
      </ul>

      <h2>The honest scorecard</h2>
      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full border-collapse text-fluid-body">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4"></th><th className="py-2 pr-4">What it covers</th><th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {SCORECARD.map(([k, what, status], i) => (
              <tr key={i} className="border-b border-border align-top">
                <td className="py-2 pr-4 font-semibold text-foreground">{k}</td>
                <td className="py-2 pr-4 text-foreground">{what}</td>
                <td className="py-2 text-muted-foreground">{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>This is a demonstration of correctness, not speed, and the project says so itself.</p>

      <h2>How it compares</h2>
      <p>There are other serious tools for trustworthy software, and they solve different problems.</p>
      <ul>
        <li><strong>Proof assistants</strong> such as Lean, Coq and Isabelle are tools you write proofs inside. LexLean uses Lean as its checker, rather than competing with it.</li>
        <li><strong>Languages with built in contracts</strong> such as Dafny and F* let you write code with rules attached and try to prove those rules automatically. They are more flexible and more mature, and F* already secures widely used encryption software.</li>
        <li><strong>LexLean</strong> trades that freedom for a closed, precise language. There is no back door and no guessing, so every result can be reproduced byte for byte. And it is the only one that produces the readable paper from the same source as the proof and the program.</li>
      </ul>
      <p>LexLean is still early. Its language is deliberately small, it is slower than established runtimes, and it is not yet at 1.0. Its strength is the complete, auditable chain: <strong>one document, from which the paper, the proof and the program are all generated and bound together, and which never claims more than its evidence shows.</strong></p>

      <h2>Try it</h2>
      <ul>
        <li>Explore the project on GitHub: <a href="https://github.com/UOR-Foundation/LexLean" {...ext}>LexLean</a></li>
        <li>See the full digit reader example: <a href="https://github.com/UOR-Foundation/MNIST" {...ext}>MNIST</a></li>
        <li>Share questions and feedback with the community on <a href="https://discord.gg/U7EAUXFTVF" {...ext}>Discord</a></li>
      </ul>
    </ArticleLayout>
  );
};

export default BlogLexLeanV04;
