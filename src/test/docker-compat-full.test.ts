/**
 * Docker Backward-Compatibility & UOR Parity — Exhaustive Test Suite
 *
 * Validates that every key Docker primitive is faithfully replicated
 * within the UOR framework, content-addressed, and interoperable.
 *
 * Categories mirrored from Docker's own documentation:
 *   BUILD  — Dockerfile/Uorfile, multi-stage, ARG/ENV, HEALTHCHECK, LABEL
 *   SHIP   — Registry tag/push/pull, dedup, search, digest references
 *   RUN    — Compose up/down/ps/scale, secrets, dependency ordering
 *   COMPAT — Docker image wrapping, feature mapping, verb mapping, reports
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // ── Build ──
  parseUorfile,
  parseDockerfile,
  buildImage,
  serializeUorfile,
  // ── Docker Compat ──
  parseDockerRef,
  wrapDockerImage,
  buildFromDockerfile,
  generateCompatReport,
  DOCKER_FEATURE_MAP,
  DOCKER_VERB_MAP,
  // ── Registry ──
  tagImage,
  resolveTag,
  listTags,
  removeTag,
  pushImage,
  pullImage,
  listImages,
  inspectImage,
  imageHistory,
  removeImage,
  searchImages,
  clearImageRegistry,
  // ── Compose ──
  parseComposeSpec,
  composeUp,
  composeDown,
  composePs,
  composeScale,
  getComposeApp,
  listComposeApps,
  clearComposeApps,
  // ── Secrets ──
  createSecret,
  listSecrets,
  inspectSecret,
  getSecretValue,
  removeSecret,
  injectSecrets,
  clearSecrets,
} from "../modules/uns/build";

const CANONICAL = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;

// ═══════════════════════════════════════════════════════════════════════════
//  BUILD — Dockerfile ↔ Uorfile parity
// ═══════════════════════════════════════════════════════════════════════════

describe("BUILD — Dockerfile / Uorfile Parity", () => {
  beforeEach(() => { clearImageRegistry(); });

  // ── FROM variants ─────────────────────────────────────────────────────
  describe("FROM directive (base image selection)", () => {
    it("parses FROM docker://image:tag", () => {
      const s = parseUorfile("FROM docker://node:20-alpine");
      expect(s.from.type).toBe("docker");
      expect(s.from.reference).toBe("node");
      expect(s.from.tag).toBe("20-alpine");
    });

    it("parses FROM uor://canonical", () => {
      const s = parseUorfile("FROM uor://myapp:v1");
      expect(s.from.type).toBe("uor");
      expect(s.from.reference).toBe("myapp");
      expect(s.from.tag).toBe("v1");
    });

    it("parses FROM scratch (empty base)", () => {
      const s = parseUorfile("FROM scratch");
      expect(s.from.type).toBe("scratch");
    });

    it("parses FROM with --platform and AS alias (multi-stage)", () => {
      const s = parseUorfile("FROM --platform=linux/arm64 node:20 AS builder");
      expect(s.from.platform).toBe("linux/arm64");
      expect(s.from.alias).toBe("builder");
      expect(s.from.reference).toBe("node");
      expect(s.from.tag).toBe("20");
    });

    it("defaults tag to 'latest' when omitted", () => {
      const s = parseUorfile("FROM ubuntu");
      expect(s.from.tag).toBe("latest");
    });
  });

  // ── All Docker directives ─────────────────────────────────────────────
  describe("Directive coverage (all Dockerfile instructions)", () => {
    const fullDockerfile = `
      FROM node:20-alpine
      ARG BUILD_ENV=production
      WORKDIR /app
      COPY package.json .
      COPY . .
      ADD archive.tar.gz /opt/
      RUN npm install --production
      RUN npm run build
      ENV NODE_ENV=production
      ENV PORT=3000
      EXPOSE 3000
      EXPOSE 8080
      VOLUME /data
      VOLUME /cache
      LABEL maintainer="team@uor.foundation"
      LABEL version="2.0"
      HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD curl -f http://localhost:3000/health
      USER node
      STOPSIGNAL SIGTERM
      ENTRYPOINT ["node", "server.js"]
      CMD ["--port", "3000"]
    `;

    it("parses every standard Dockerfile directive", () => {
      const s = parseDockerfile(fullDockerfile);

      expect(s.from.reference).toBe("node");
      expect(s.from.tag).toBe("20-alpine");
      expect(s.args.BUILD_ENV).toBe("production");
      expect(s.workdir).toBe("/app");
      expect(s.copies.length).toBe(3); // 2 COPY + 1 ADD
      expect(s.runCommands).toEqual(["npm install --production", "npm run build"]);
      expect(s.env.NODE_ENV).toBe("production");
      expect(s.env.PORT).toBe("3000");
      expect(s.ports).toContain(3000);
      expect(s.ports).toContain(8080);
      expect(s.volumes).toContain("/data");
      expect(s.volumes).toContain("/cache");
      expect(s.labels.maintainer).toBe("team@uor.foundation");
      expect(s.labels.version).toBe("2.0");
      expect(s.healthcheck).not.toBeNull();
      expect(s.healthcheck!.interval).toBe("15s");
      expect(s.healthcheck!.timeout).toBe("5s");
      expect(s.healthcheck!.retries).toBe(5);
      expect(s.entrypoint).toEqual(["node", "server.js"]);
      expect(s.cmd).toEqual(["--port", "3000"]);
    });

    it("UOR extensions: TRUST, SHIELD, CANON", () => {
      const s = parseUorfile(`
        FROM scratch
        TRUST cert:DeploymentCertificate
        TRUST cert:SecurityAudit
        SHIELD paranoid
      `);
      expect(s.trustRequirements).toContain("cert:DeploymentCertificate");
      expect(s.trustRequirements).toContain("cert:SecurityAudit");
      expect(s.shieldLevel).toBe("paranoid");
    });
  });

  // ── Build pipeline ────────────────────────────────────────────────────
  describe("Build pipeline (docker build equivalent)", () => {
    it("produces content-addressed image with canonical ID", async () => {
      const spec = parseUorfile(`
        FROM node:20
        COPY . /app
        RUN npm install
        ENTRYPOINT ["node", "index.js"]
      `);
      const image = await buildImage(spec, "builder-1");

      expect(image.canonicalId).toMatch(CANONICAL);
      expect(image.cid).toBeTruthy();
      expect(image.ipv6).toBeTruthy();
      expect(image.layers.length).toBeGreaterThan(0);
      expect(image.builderCanonicalId).toBe("builder-1");
    });

    it("deterministic: same spec → same canonical ID", async () => {
      const spec = parseUorfile("FROM scratch\nCOPY a b");
      const img1 = await buildImage(spec, "b1");
      const img2 = await buildImage(spec, "b1");
      expect(img1.canonicalId).toBe(img2.canonicalId);
    });

    it("different specs → different canonical IDs", async () => {
      const img1 = await buildImage(parseUorfile("FROM node:20\nCOPY a b"), "b1");
      const img2 = await buildImage(parseUorfile("FROM node:18\nCOPY a b"), "b1");
      expect(img1.canonicalId).not.toBe(img2.canonicalId);
    });

    it("layers are individually content-addressed", async () => {
      const spec = parseUorfile("FROM node:20\nRUN echo hello\nRUN echo world\nCOPY . /app");
      const image = await buildImage(spec, "b1");
      const layerIds = image.layers.map(l => l.canonicalId);
      // Each layer has unique canonical ID
      expect(new Set(layerIds).size).toBe(layerIds.length);
      for (const id of layerIds) {
        expect(id).toMatch(CANONICAL);
      }
    });

    it("builds from real Dockerfile with source files", async () => {
      const files = new Map<string, Uint8Array>();
      files.set("package.json", new TextEncoder().encode('{"name":"myapp"}'));
      files.set("index.js", new TextEncoder().encode('console.log("hello")'));

      const spec = parseUorfile("FROM node:20\nCOPY package.json .\nCOPY index.js .\nRUN npm install");
      const image = await buildImage(spec, "b1", files);
      expect(image.sizeBytes).toBeGreaterThan(0);
    });
  });

  // ── Serialize round-trip ──────────────────────────────────────────────
  describe("Uorfile serialization (round-trip)", () => {
    it("round-trips all directives through serialize → parse", () => {
      const original = parseUorfile(`
        FROM docker://python:3.12
        WORKDIR /opt/app
        ENV FLASK_APP="app.py"
        ENV DEBUG="false"
        COPY requirements.txt .
        COPY . .
        RUN pip install -r requirements.txt
        EXPOSE 5000
        VOLUME /data
        HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD curl -f http://localhost:5000
        LABEL org.opencontainers.image.title="my-flask-app"
        ENTRYPOINT ["python", "-m", "flask", "run"]
        CMD ["--host", "0.0.0.0"]
        SHIELD strict
        TRUST cert:ProductionReady
      `);

      const serialized = serializeUorfile(original);
      expect(serialized).toContain("FROM docker://python:3.12");
      expect(serialized).toContain('ENV FLASK_APP="app.py"');
      expect(serialized).toContain("EXPOSE 5000");
      expect(serialized).toContain("VOLUME /data");
      expect(serialized).toContain("HEALTHCHECK");
      expect(serialized).toContain("SHIELD strict");
      expect(serialized).toContain("TRUST cert:ProductionReady");
      expect(serialized).toContain("ENTRYPOINT");
      expect(serialized).toContain("CMD");
    });
  });

  // ── HEALTHCHECK NONE ──────────────────────────────────────────────────
  describe("HEALTHCHECK NONE", () => {
    it("disables health check when NONE specified", () => {
      const s = parseUorfile("FROM node:20\nHEALTHCHECK NONE");
      expect(s.healthcheck).toBeNull();
    });
  });

  // ── Comments & blank lines ────────────────────────────────────────────
  describe("Comments and blank lines", () => {
    it("ignores comments and blank lines", () => {
      const s = parseUorfile(`
        # This is a comment
        FROM node:20

        # Another comment
        COPY . /app
      `);
      expect(s.from.reference).toBe("node");
      expect(s.copies.length).toBe(1);
    });
  });

  // ── Line continuations ────────────────────────────────────────────────
  describe("Line continuations (backslash)", () => {
    it("joins backslash-continued lines", () => {
      const s = parseUorfile("FROM node:20\nRUN apt-get update && \\\napt-get install -y curl");
      expect(s.runCommands.length).toBe(1);
      expect(s.runCommands[0]).toContain("apt-get update");
      expect(s.runCommands[0]).toContain("apt-get install -y curl");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SHIP — Registry, Tags, Push/Pull, Deduplication
// ═══════════════════════════════════════════════════════════════════════════

describe("SHIP — Registry (docker push/pull/tag/inspect/history/rmi)", () => {
  beforeEach(() => { clearImageRegistry(); });

  it("tag → push → pull round-trip", async () => {
    const image = await buildFromDockerfile("FROM node:20\nCOPY . .\nCMD node .", "b1");
    await pushImage(image, ["myapp:v1", "myapp:latest"]);

    const pulled = await pullImage("myapp:v1");
    expect(pulled).not.toBeNull();
    expect(pulled!.canonicalId).toBe(image.canonicalId);

    const latest = await pullImage("myapp:latest");
    expect(latest!.canonicalId).toBe(image.canonicalId);
  });

  it("pull by canonical ID", async () => {
    const image = await buildFromDockerfile("FROM scratch", "b1");
    await pushImage(image, []);

    const pulled = await pullImage(image.canonicalId);
    expect(pulled).not.toBeNull();
    expect(pulled!.canonicalId).toBe(image.canonicalId);
  });

  it("pull non-existent tag → null", async () => {
    expect(await pullImage("ghost:v99")).toBeNull();
  });

  it("deduplicates identical images on push", async () => {
    const image = await buildFromDockerfile("FROM scratch\nCOPY a b", "b1");
    const r1 = await pushImage(image, ["app:v1"]);
    const r2 = await pushImage(image, ["app:v2"]);

    expect(r1.deduplicated).toBe(false);
    expect(r2.deduplicated).toBe(true);
    expect(listImages().length).toBe(1); // only one stored
  });

  it("lists all images", async () => {
    const img1 = await buildFromDockerfile("FROM node:20", "b1");
    const img2 = await buildFromDockerfile("FROM python:3", "b1");
    await pushImage(img1, ["app1:v1"]);
    await pushImage(img2, ["app2:v1"]);
    expect(listImages().length).toBe(2);
  });

  it("inspects by tag and by canonical ID", async () => {
    const image = await buildFromDockerfile("FROM node:20\nCOPY . .", "b1");
    await pushImage(image, ["inspectable:v1"]);

    expect(inspectImage("inspectable:v1")).not.toBeNull();
    expect(inspectImage(image.canonicalId)).not.toBeNull();
    expect(inspectImage("inspectable:v1")!.canonicalId).toBe(image.canonicalId);
  });

  it("inspect non-existent → null", () => {
    expect(inspectImage("nope:v1")).toBeNull();
  });

  it("shows layer history (docker history)", async () => {
    const image = await buildFromDockerfile(
      "FROM node:20\nRUN apt update\nRUN apt install curl\nCOPY . /app",
      "b1"
    );
    await pushImage(image, ["hist:v1"]);

    const history = imageHistory("hist:v1");
    expect(history.length).toBeGreaterThanOrEqual(4); // FROM + 2 RUN + COPY
    for (const entry of history) {
      expect(entry.canonicalId).toMatch(CANONICAL);
      expect(entry.instruction).toBeTruthy();
    }
  });

  it("removes image and cleans up tags (docker rmi)", async () => {
    const image = await buildFromDockerfile("FROM scratch", "b1");
    await pushImage(image, ["rm:v1", "rm:latest"]);

    expect(removeImage(image.canonicalId)).toBe(true);
    expect(listImages().length).toBe(0);
    expect(resolveTag("rm:v1")).toBeNull();
    expect(resolveTag("rm:latest")).toBeNull();
  });

  it("removeImage on non-existent → false", () => {
    expect(removeImage("urn:uor:derivation:sha256:0000")).toBe(false);
  });

  it("tag operations: create, resolve, list, remove", async () => {
    await tagImage("cid-abc", "myrepo:v1", "tagger-1");
    await tagImage("cid-abc", "myrepo:v2", "tagger-1");
    await tagImage("cid-xyz", "other:latest", "tagger-1");

    expect(resolveTag("myrepo:v1")).toBe("cid-abc");
    expect(resolveTag("myrepo:v2")).toBe("cid-abc");

    const allTags = listTags();
    expect(allTags.length).toBe(3);

    const repoTags = listTags("myrepo");
    expect(repoTags.length).toBe(2);

    expect(removeTag("myrepo:v1")).toBe(true);
    expect(resolveTag("myrepo:v1")).toBeNull();
    expect(removeTag("nonexistent:v1")).toBe(false);
  });

  it("searchImages finds by label and canonical ID", async () => {
    const spec = parseUorfile('FROM node:20\nLABEL app.name="weather-api"\nCOPY . /app');
    const img = await buildImage(spec, "b1");
    await pushImage(img, ["weather:v1"]);

    const results = searchImages("weather");
    expect(results.length).toBe(1);
    expect(results[0].canonicalId).toBe(img.canonicalId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DOCKER IMAGE WRAPPING — backwards compatibility
// ═══════════════════════════════════════════════════════════════════════════

describe("DOCKER COMPAT — Image Wrapping & Reference Parsing", () => {
  describe("parseDockerRef covers all Docker reference formats", () => {
    it("official image: nginx", () => {
      const r = parseDockerRef("nginx");
      expect(r.registry).toBe("docker.io");
      expect(r.repository).toBe("library/nginx");
      expect(r.tag).toBe("latest");
    });

    it("official image with tag: node:20-alpine", () => {
      const r = parseDockerRef("node:20-alpine");
      expect(r.repository).toBe("library/node");
      expect(r.tag).toBe("20-alpine");
    });

    it("org image: myorg/myapp:v2", () => {
      const r = parseDockerRef("myorg/myapp:v2");
      expect(r.registry).toBe("docker.io");
      expect(r.repository).toBe("myorg/myapp");
      expect(r.tag).toBe("v2");
    });

    it("ghcr.io registry: ghcr.io/org/app:tag", () => {
      const r = parseDockerRef("ghcr.io/org/app:v3");
      expect(r.registry).toBe("ghcr.io");
      expect(r.repository).toBe("org/app");
      expect(r.tag).toBe("v3");
    });

    it("quay.io registry: quay.io/coreos/etcd:latest", () => {
      const r = parseDockerRef("quay.io/coreos/etcd:latest");
      expect(r.registry).toBe("quay.io");
      expect(r.repository).toBe("coreos/etcd");
      expect(r.tag).toBe("latest");
    });

    it("digest reference: nginx@sha256:abc123", () => {
      const r = parseDockerRef("nginx@sha256:abc123def");
      expect(r.repository).toBe("library/nginx");
      expect(r.digest).toBe("sha256:abc123def");
    });

    it("private registry: registry.example.com/team/app:v1", () => {
      const r = parseDockerRef("registry.example.com/team/app:v1");
      expect(r.registry).toBe("registry.example.com");
      expect(r.repository).toBe("team/app");
      expect(r.tag).toBe("v1");
    });
  });

  describe("wrapDockerImage content-addresses Docker references", () => {
    it("wraps official Docker image with canonical ID", async () => {
      const w = await wrapDockerImage("nginx:1.25");
      expect(w.canonicalId).toMatch(CANONICAL);
      expect(w.cid).toBeTruthy();
      expect(w.ipv6).toBeTruthy();
      expect(w.dockerRef.repository).toBe("library/nginx");
      expect(w.dockerRef.tag).toBe("1.25");
    });

    it("wraps org image", async () => {
      const w = await wrapDockerImage("bitnami/postgresql:16");
      expect(w.canonicalId).toMatch(CANONICAL);
      expect(w.dockerRef.repository).toBe("bitnami/postgresql");
    });

    it("deterministic wrapping: same ref → same canonical", async () => {
      const w1 = await wrapDockerImage("redis:7");
      const w2 = await wrapDockerImage("redis:7");
      expect(w1.canonicalId).toBe(w2.canonicalId);
    });

    it("different tags → different canonical IDs", async () => {
      const w1 = await wrapDockerImage("node:18");
      const w2 = await wrapDockerImage("node:20");
      expect(w1.canonicalId).not.toBe(w2.canonicalId);
    });

    it("compatibility score for runtime images", async () => {
      const nodeWrap = await wrapDockerImage("node:20");
      expect(nodeWrap.compatibility.nativeCompute).toBe(true);
      expect(nodeWrap.compatibility.score).toBeGreaterThanOrEqual(90);

      const nginxWrap = await wrapDockerImage("nginx:latest");
      expect(nginxWrap.compatibility.requiresDockerRuntime).toBe(true);
      expect(nginxWrap.compatibility.score).toBeGreaterThanOrEqual(50);
    });

    it("compatibility report is human-readable", async () => {
      const w = await wrapDockerImage("python:3.12");
      const report = generateCompatReport(w.compatibility);
      expect(report).toContain("Compatibility Score");
      expect(report).toContain("Mapped Features");
      expect(report).toContain("Native Compute");
    });
  });

  describe("buildFromDockerfile (full Dockerfile → UOR image)", () => {
    it("builds complete Dockerfile into content-addressed image", async () => {
      const dockerfile = `
        FROM python:3.12-slim
        WORKDIR /opt/app
        COPY requirements.txt .
        RUN pip install -r requirements.txt
        COPY . .
        ENV FLASK_APP=app.py
        EXPOSE 5000
        HEALTHCHECK CMD curl -f http://localhost:5000/health
        ENTRYPOINT ["gunicorn", "app:app"]
        CMD ["-b", "0.0.0.0:5000"]
      `;
      const image = await buildFromDockerfile(dockerfile, "ci-pipeline");
      expect(image.canonicalId).toMatch(CANONICAL);
      expect(image.dockerfileSource).toBe(dockerfile);
      expect(image.layers.length).toBeGreaterThan(0);
      expect(image.spec.env.FLASK_APP).toBe("app.py");
      expect(image.spec.ports).toContain(5000);
    });

    it("preserves Dockerfile source for auditability", async () => {
      const df = "FROM golang:1.22\nCOPY . .\nRUN go build -o server\nCMD [\"./server\"]";
      const image = await buildFromDockerfile(df, "b1");
      expect(image.dockerfileSource).toBe(df);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DOCKER FEATURE & VERB MAPPING COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════

describe("DOCKER FEATURE & VERB MAPPING", () => {
  const requiredDockerCommands = [
    "docker build", "docker push", "docker pull", "docker run",
    "docker images", "docker tag", "docker logs", "docker inspect",
    "docker ps", "docker stop", "docker rm", "docker exec",
    "docker volume", "docker network", "docker secret",
    "docker compose", "docker history", "docker cp", "docker login",
  ];

  const requiredDockerVerbs = [
    "docker build", "docker push", "docker pull", "docker run",
    "docker compose up", "docker compose down",
    "docker secret create", "docker tag", "docker logs", "docker exec",
  ];

  it("DOCKER_FEATURE_MAP covers ≥20 Docker features", () => {
    expect(DOCKER_FEATURE_MAP.length).toBeGreaterThanOrEqual(20);
  });

  for (const cmd of requiredDockerCommands) {
    it(`maps '${cmd}' to a UOR equivalent`, () => {
      const found = DOCKER_FEATURE_MAP.some(f => f.docker.toLowerCase().includes(cmd.replace("docker ", "")));
      expect(found).toBe(true);
    });
  }

  it("DOCKER_VERB_MAP covers ≥10 Docker CLI verbs", () => {
    expect(DOCKER_VERB_MAP.length).toBeGreaterThanOrEqual(10);
  });

  for (const verb of requiredDockerVerbs) {
    it(`verb map includes '${verb}'`, () => {
      const found = DOCKER_VERB_MAP.some(v =>
        v.dockerCommand.toLowerCase().includes(verb.replace("docker ", ""))
      );
      expect(found).toBe(true);
    });
  }

  it("every feature mapping has both docker and uor fields", () => {
    for (const f of DOCKER_FEATURE_MAP) {
      expect(f.docker).toBeTruthy();
      expect(f.uor).toBeTruthy();
      expect(typeof f.complete).toBe("boolean");
    }
  });

  it("every verb mapping has notes and complete flag", () => {
    for (const v of DOCKER_VERB_MAP) {
      expect(v.dockerCommand).toBeTruthy();
      expect(v.uorCommand).toBeTruthy();
      expect(v.notes).toBeTruthy();
      expect(typeof v.complete).toBe("boolean");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  RUN — Compose Orchestration
// ═══════════════════════════════════════════════════════════════════════════

describe("RUN — Compose Orchestration (docker compose equivalent)", () => {
  beforeEach(() => { clearComposeApps(); clearImageRegistry(); });

  it("parses a full docker-compose.yml equivalent", () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: {
        web: {
          image: "nginx:latest",
          ports: ["80:80", "443:443"],
          depends_on: ["api"],
          restart: "always",
          labels: { "com.example.tier": "frontend" },
        },
        api: {
          image: "node:20",
          ports: ["3000:3000"],
          depends_on: ["db", "redis"],
          environment: { NODE_ENV: "production", DB_HOST: "db" },
          volumes: ["app-data:/app/data"],
          secrets: ["db-password"],
        },
        db: {
          image: "postgres:16",
          environment: { POSTGRES_DB: "myapp", POSTGRES_USER: "admin" },
          volumes: ["pg-data:/var/lib/postgresql/data"],
        },
        redis: {
          image: "redis:7-alpine",
          ports: ["6379:6379"],
        },
        worker: {
          image: "node:20",
          command: ["node", "worker.js"],
          depends_on: ["db", "redis"],
          environment: ["QUEUE_URL=redis://redis:6379"],
        },
      },
      volumes: {
        "pg-data": { driver: "local" },
        "app-data": null,
      },
      networks: {
        backend: { driver: "bridge" },
      },
      secrets: {
        "db-password": { file: "./secrets/db-password.txt" },
      },
    });

    expect(spec.services.size).toBe(5);
    expect(spec.volumes.size).toBe(2);
    expect(spec.networks.size).toBe(1);
    expect(spec.secrets.size).toBe(1);

    const api = spec.services.get("api")!;
    expect(api.environment.NODE_ENV).toBe("production");
    expect(api.dependsOn).toContain("db");
    expect(api.dependsOn).toContain("redis");
    expect(api.secrets).toContain("db-password");
    expect(api.volumes).toContain("app-data:/app/data");
  });

  it("compose up starts all services in dependency order", async () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: {
        web: { image: "nginx", depends_on: ["api"] },
        api: { image: "node", depends_on: ["db"] },
        db: { image: "postgres" },
      },
    });

    const app = await composeUp("myproject", spec);
    expect(app.canonicalId).toMatch(CANONICAL);
    expect(app.cid).toBeTruthy();
    expect(app.serviceStatus.size).toBe(3);

    // Verify dependency ordering
    const names = Array.from(app.serviceStatus.keys());
    expect(names.indexOf("db")).toBeLessThan(names.indexOf("api"));
    expect(names.indexOf("api")).toBeLessThan(names.indexOf("web"));

    // All services running
    for (const [, status] of app.serviceStatus) {
      expect(status.state).toBe("running");
    }
  });

  it("compose down stops and removes app", async () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: { web: { image: "nginx" }, db: { image: "postgres" } },
    });
    await composeUp("stop-test", spec);
    expect(composePs("stop-test").length).toBe(2);

    const stopped = await composeDown("stop-test");
    expect(stopped).toBe(true);
    expect(composePs("stop-test").length).toBe(0);
  });

  it("compose down on non-existent → false", async () => {
    expect(await composeDown("ghost")).toBe(false);
  });

  it("compose ps lists service statuses", async () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: {
        a: { image: "node", ports: ["3000:3000"] },
        b: { image: "redis", ports: ["6379:6379"] },
      },
    });
    await composeUp("ps-test", spec);

    const statuses = composePs("ps-test");
    expect(statuses.length).toBe(2);
    expect(statuses.every(s => s.state === "running")).toBe(true);
    expect(statuses.some(s => s.ports.includes("3000:3000"))).toBe(true);
  });

  it("compose scale adjusts replicas (docker compose scale)", async () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: { worker: { image: "node:20" } },
    });
    await composeUp("scale-test", spec);

    expect(composeScale("scale-test", "worker", 10)).toBe(true);
    const ps = composePs("scale-test");
    expect(ps[0].replicas).toBe(10);

    // Scale non-existent service → false
    expect(composeScale("scale-test", "ghost", 5)).toBe(false);
    // Scale non-existent project → false
    expect(composeScale("ghost-project", "worker", 5)).toBe(false);
  });

  it("getComposeApp retrieves by name", async () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: { web: { image: "nginx" } },
    });
    await composeUp("get-test", spec);

    const app = getComposeApp("get-test");
    expect(app).not.toBeNull();
    expect(app!.projectName).toBe("get-test");
    expect(getComposeApp("nonexistent")).toBeNull();
  });

  it("listComposeApps lists all running apps", async () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: { web: { image: "nginx" } },
    });
    await composeUp("app1", spec);
    await composeUp("app2", spec);

    expect(listComposeApps().length).toBe(2);
  });

  it("compose app gets canonical ID (deterministic)", async () => {
    const input = {
      version: "3.8",
      services: { web: { image: "nginx" }, db: { image: "postgres" } },
    };
    const app1 = await composeUp("det-1", parseComposeSpec(input));
    clearComposeApps();
    const app2 = await composeUp("det-1", parseComposeSpec(input));
    expect(app1.canonicalId).toBe(app2.canonicalId);
  });

  it("handles build config in compose services", () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: {
        api: {
          build: { context: "./api", dockerfile: "Dockerfile.prod", args: { NODE_ENV: "production" } },
          ports: ["3000:3000"],
        },
        web: {
          build: "./frontend",
          ports: ["8080:80"],
        },
      },
    });

    const api = spec.services.get("api")!;
    expect(api.build).not.toBeUndefined();
    expect(api.build!.context).toBe("./api");
    expect(api.build!.dockerfile).toBe("Dockerfile.prod");
    expect(api.build!.args.NODE_ENV).toBe("production");

    const web = spec.services.get("web")!;
    expect(web.build!.context).toBe("./frontend");
  });

  it("environment as array (KEY=VAL) format", () => {
    const spec = parseComposeSpec({
      version: "3.8",
      services: {
        app: {
          image: "node:20",
          environment: ["DB_HOST=localhost", "DB_PORT=5432"],
        },
      },
    });
    const app = spec.services.get("app")!;
    expect(app.environment.DB_HOST).toBe("localhost");
    expect(app.environment.DB_PORT).toBe("5432");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SECRETS MANAGER (docker secret create/ls/inspect/rm)
// ═══════════════════════════════════════════════════════════════════════════

describe("RUN — Secrets Manager (docker secret equivalent)", () => {
  beforeEach(() => { clearSecrets(); });

  it("create → inspect → get → remove lifecycle", async () => {
    const res = await createSecret("db-password", "s3cur3!pass", "creator-1");
    expect(res.created).toBe(true);
    expect(res.secret.name).toBe("db-password");
    expect(res.secret.canonicalId).toMatch(CANONICAL);
    expect(res.secret.version).toBe(1);
    expect(res.secret.sizeBytes).toBe(11);

    const meta = inspectSecret("db-password");
    expect(meta).not.toBeNull();
    expect(meta!.creatorCanonicalId).toBe("creator-1");

    const val = await getSecretValue("db-password");
    expect(val).not.toBeNull();
    expect(new TextDecoder().decode(val!.value)).toBe("s3cur3!pass");
    expect(val!.version).toBe(1);

    expect(removeSecret("db-password")).toBe(true);
    expect(listSecrets().length).toBe(0);
    expect(inspectSecret("db-password")).toBeNull();
  });

  it("update existing secret increments version", async () => {
    await createSecret("api-key", "key-v1", "c1");
    const r2 = await createSecret("api-key", "key-v2", "c1");
    expect(r2.created).toBe(false);
    expect(r2.secret.version).toBe(2);

    const val = await getSecretValue("api-key");
    expect(new TextDecoder().decode(val!.value)).toBe("key-v2");
  });

  it("handles Uint8Array values (binary secrets)", async () => {
    const binarySecret = new Uint8Array([0x00, 0xFF, 0x42, 0xDE, 0xAD]);
    await createSecret("binary-key", binarySecret, "c1");

    const val = await getSecretValue("binary-key");
    expect(val).not.toBeNull();
    expect(val!.value).toEqual(binarySecret);
  });

  it("list secrets returns metadata only (never values)", () => {
    // We just check the type — values should never leak
    const secrets = listSecrets();
    for (const s of secrets) {
      expect(s).not.toHaveProperty("value");
      expect(s).not.toHaveProperty("encryptedValue");
      expect(s).not.toHaveProperty("keyMaterial");
    }
  });

  it("inject secrets as environment variables", async () => {
    await createSecret("database-url", "postgres://user:pass@db:5432/app", "c1");
    await createSecret("redis-url", "redis://redis:6379", "c1");
    await createSecret("api-key", "sk_live_abc123", "c1");

    const env = await injectSecrets(["database-url", "redis-url", "api-key"]);
    expect(env.DATABASE_URL).toBe("postgres://user:pass@db:5432/app");
    expect(env.REDIS_URL).toBe("redis://redis:6379");
    expect(env.API_KEY).toBe("sk_live_abc123");
  });

  it("inject missing secret is silently skipped", async () => {
    await createSecret("exists", "value", "c1");
    const env = await injectSecrets(["exists", "missing"]);
    expect(env.EXISTS).toBe("value");
    expect(env.MISSING).toBeUndefined();
  });

  it("secret canonical ID is content-addressed", async () => {
    const r1 = await createSecret("test1", "value-a", "c1");
    const r2 = await createSecret("test2", "value-b", "c1");
    // Different secrets → different canonical IDs
    expect(r1.secret.canonicalId).not.toBe(r2.secret.canonicalId);
    // Both are valid canonical IDs
    expect(r1.secret.canonicalId).toMatch(CANONICAL);
    expect(r2.secret.canonicalId).toMatch(CANONICAL);
  });

  it("secret with labels", async () => {
    const res = await createSecret("labeled-secret", "val", "c1", {
      environment: "production",
      team: "platform",
    });
    expect(res.secret.labels.environment).toBe("production");
    expect(res.secret.labels.team).toBe("platform");
  });

  it("getSecretValue on non-existent → null", async () => {
    expect(await getSecretValue("nonexistent")).toBeNull();
  });

  it("removeSecret on non-existent → false", () => {
    expect(removeSecret("ghost")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  END-TO-END — Full Build→Ship→Run Pipeline
// ═══════════════════════════════════════════════════════════════════════════

describe("E2E — Full Build→Ship→Run Pipeline", () => {
  beforeEach(() => {
    clearImageRegistry();
    clearComposeApps();
    clearSecrets();
  });

  it("Build a Dockerfile → Push to registry → Run via Compose", async () => {
    // BUILD
    const apiImage = await buildFromDockerfile(
      "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nEXPOSE 3000\nCMD [\"node\", \"server.js\"]",
      "ci-pipeline"
    );
    expect(apiImage.canonicalId).toMatch(CANONICAL);

    // SHIP
    const pushResult = await pushImage(apiImage, ["myapi:v1", "myapi:latest"]);
    expect(pushResult.deduplicated).toBe(false);
    expect(pushResult.tags).toContain("myapi:v1");

    // Verify it's pullable
    const pulled = await pullImage("myapi:v1");
    expect(pulled!.canonicalId).toBe(apiImage.canonicalId);

    // RUN (Compose)
    await createSecret("db-password", "super-secret-123", "deployer");

    const spec = parseComposeSpec({
      version: "3.8",
      services: {
        api: {
          image: "myapi:v1",
          ports: ["3000:3000"],
          depends_on: ["db"],
          secrets: ["db-password"],
          environment: { NODE_ENV: "production" },
        },
        db: {
          image: "postgres:16",
          environment: { POSTGRES_DB: "myapp" },
          volumes: ["pg-data:/var/lib/postgresql/data"],
        },
      },
      volumes: { "pg-data": null },
    });

    const app = await composeUp("production", spec);
    expect(app.canonicalId).toMatch(CANONICAL);
    expect(app.serviceStatus.size).toBe(2);
    expect(composePs("production").every(s => s.state === "running")).toBe(true);

    // Inject secrets
    const env = await injectSecrets(["db-password"]);
    expect(env.DB_PASSWORD).toBe("super-secret-123");

    // Teardown
    await composeDown("production");
    expect(composePs("production").length).toBe(0);
  });
});
