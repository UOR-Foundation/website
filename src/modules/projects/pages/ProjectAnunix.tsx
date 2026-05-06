import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-anunix.jpg";

const ProjectAnunix = () => (
  <ProjectDetailLayout
    name="Anunix"
    slug="anunix"
    category="Core Infrastructure"
    tagline="The AI-native operating system. Anunix redefines UNIX primitives — files, processes, pipes, sockets — around state, transformation, memory, routing, and validation. Written in C and assembly, no C++, no Rust, no Go."
    heroImage={heroImg}
    repoUrl="https://github.com/AdamPippert/Anunix"
    agentInstructions={[
      { action: "Set up the toolchain", detail: "On macOS with Xcode CLT installed, run `make toolchain` to fetch ld.lld and llvm-objcopy, then `make qemu-deps` to build QEMU from source." },
      { action: "Build the kernel", detail: "Run `make` to produce the Anunix kernel binary, or `make iso` to build a bootable BIOS+UEFI ISO suitable for USB installation." },
      { action: "Boot in QEMU", detail: "Use `make run` to launch the kernel under QEMU virt (ARM64) or x86_64 with networking, framebuffer, and Claude API access enabled." },
      { action: "Drive it remotely", detail: "SSH into a running instance on port 22 or hit the HTTP API at port 8080 (`/api/v1/exec`) to script tensors, workflows, and the kernel browser engine." },
    ]}
    sections={[
      {
        heading: "Why",
        content: (
          <>
            <p>
              Classical UNIX was designed for a world of files, processes, and byte streams — abstractions that predate AI workloads by half a century. Modern systems graft tensors, model servers, and content-addressed objects onto that substrate as afterthoughts, leaving correctness, provenance, and resource control to user-space conventions.
            </p>
            <p>
              Anunix treats AI as the primary workload, not a guest. Every kernel primitive is rebuilt around what AI systems actually need: typed state, lifecycle-managed execution, semantic memory, type-aware routing, and unforgeable capabilities — so the OS itself enforces the guarantees that today's stacks beg for at the application layer.
            </p>
          </>
        ),
      },
      {
        heading: "How",
        content: (
          <>
            <p>
              Anunix replaces classical UNIX abstractions with primitives designed for AI-native workloads, all running on bare metal in roughly 25,000 lines of C and assembly:
            </p>
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">State Objects replace files.</strong> Content-addressed, versioned, with end-to-end provenance baked in at the object level rather than bolted on through filesystems.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Execution Cells replace processes.</strong> Lifecycle-managed, composable units of work with explicit resource budgets — the kernel, not the application, governs cost.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Memory Planes replace malloc/mmap.</strong> Tiered memory with semantic decay and promotion, so hot context naturally migrates and cold context naturally falls away.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Routing Plane replaces pipes.</strong> Type-aware dispatch with pluggable transformation engines, including kernel-level model hosting, leasing, and route feedback.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">5</span>
                <span><strong className="text-foreground">Capabilities replace chmod.</strong> Object-level, unforgeable, delegatable rights — combined with kernel-enforced Credential Objects whose payloads never appear in traces or logs.</span>
              </li>
            </ol>
          </>
        ),
      },
      {
        heading: "What",
        content: (
          <>
            <p>
              A bare-metal kernel that boots on QEMU virt (ARM64), x86_64 (BIOS and UEFI), and real hardware (AMD Ryzen 9 HX 370). It ships a tensor-native runtime (RFC-0013), a kernel-resident HTML/CSS/JS browser engine streamed at ~30 FPS, an HTTP API on port 8080, an SSH-2.0 server on port 22, and a graphical desktop with a window manager, workflow designer, and object viewer.
            </p>
            <p>
              Anunix can talk to Claude from a cold boot — initializing networking, reading API credentials from the kernel-enforced secret store, and parsing JSON responses entirely in-kernel. Crypto primitives (SHA-256/512, ChaCha20-Poly1305, AES-256-CTR, Curve25519, Ed25519) and an IP stack (Ethernet/ARP/IPv4/ICMP/UDP/TCP, DNS, HTTP/1.1) are first-class kernel features.
            </p>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI-native edge deployments.</strong> Boot a single, auditable kernel that runs models, serves HTTP, and brokers credentials without a userland LLM stack.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Verifiable agent infrastructure.</strong> State Objects, Execution Cells, and Capabilities give external agents a substrate where every action carries provenance and budget.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Research on OS primitives.</strong> A working laboratory for redesigning UNIX from first principles around AI workloads, with formal RFCs covering each subsystem.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Sovereign appliances.</strong> A bootable ISO that turns a laptop or server into an AI-native node with its own credential store, secrets management, and HTTP/SSH control surface.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectAnunix;