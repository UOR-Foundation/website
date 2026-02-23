/**
 * UNS Build System — Test Suite
 *
 * Tests for: Uorfile parsing, Docker compatibility, Compose,
 * Secrets Manager, and Image Registry (tag/push/pull).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseUorfile,
  parseDockerfile,
  buildImage,
  serializeUorfile,
  parseDockerRef,
  wrapDockerImage,
  buildFromDockerfile,
  generateCompatReport,
  DOCKER_FEATURE_MAP,
  DOCKER_VERB_MAP,
  tagImage,
  resolveTag,
  listTags,
  pushImage,
  pullImage,
  listImages,
  inspectImage,
  imageHistory,
  removeImage,
  clearImageRegistry,
  parseComposeSpec,
  composeUp,
  composeDown,
  composePs,
  composeScale,
  clearComposeApps,
  createSecret,
  listSecrets,
  inspectSecret,
  getSecretValue,
  removeSecret,
  injectSecrets,
  clearSecrets,
} from "../modules/uns/build";

const CANONICAL_RE = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;

describe("UNS Build System", () => {
  beforeEach(() => {
    clearImageRegistry();
    clearComposeApps();
    clearSecrets();
  });

  // ── Uorfile ───────────────────────────────────────────────────────────

  describe("Uorfile Parser", () => {
    it("parses a basic Uorfile", () => {
      const spec = parseUorfile(`
        FROM node:20-alpine
        WORKDIR /app
        COPY package.json .
        RUN npm install
        COPY . .
        EXPOSE 3000
        ENV NODE_ENV=production
        ENTRYPOINT ["node", "server.js"]
      `);

      expect(spec.from.type).toBe("docker");
      expect(spec.from.reference).toBe("node");
      expect(spec.from.tag).toBe("20-alpine");
      expect(spec.workdir).toBe("/app");
      expect(spec.ports).toContain(3000);
      expect(spec.env.NODE_ENV).toBe("production");
      expect(spec.entrypoint).toEqual(["node", "server.js"]);
      expect(spec.copies.length).toBe(2);
      expect(spec.runCommands).toContain("npm install");
    });

    it("parses UOR-specific directives", () => {
      const spec = parseUorfile(`
        FROM uor://myapp:v1
        SHIELD strict
        TRUST cert:DeploymentCertificate
      `);

      expect(spec.from.type).toBe("uor");
      expect(spec.shieldLevel).toBe("strict");
      expect(spec.trustRequirements).toContain("cert:DeploymentCertificate");
    });

    it("handles FROM scratch", () => {
      const spec = parseUorfile("FROM scratch\nCOPY binary /app");
      expect(spec.from.type).toBe("scratch");
    });

    it("round-trips via serialize", () => {
      const original = parseUorfile(`
        FROM docker://node:20
        ENV PORT="8080"
        COPY . /app
        RUN npm build
        EXPOSE 8080
        ENTRYPOINT ["node", "dist/index.js"]
      `);
      const serialized = serializeUorfile(original);
      expect(serialized).toContain("FROM docker://node:20");
      expect(serialized).toContain('ENV PORT="8080"');
      expect(serialized).toContain("EXPOSE 8080");
    });
  });

  // ── Docker Compatibility ──────────────────────────────────────────────

  describe("Docker Compatibility", () => {
    it("parses Docker image references", () => {
      const ref = parseDockerRef("nginx:1.25-alpine");
      expect(ref.registry).toBe("docker.io");
      expect(ref.repository).toBe("library/nginx");
      expect(ref.tag).toBe("1.25-alpine");
    });

    it("parses ghcr.io references", () => {
      const ref = parseDockerRef("ghcr.io/myorg/myapp:v2");
      expect(ref.registry).toBe("ghcr.io");
      expect(ref.repository).toBe("myorg/myapp");
      expect(ref.tag).toBe("v2");
    });

    it("wraps Docker image with canonical ID", async () => {
      const wrapped = await wrapDockerImage("node:20-alpine");
      expect(wrapped.canonicalId).toMatch(CANONICAL_RE);
      expect(wrapped.dockerRef.repository).toBe("library/node");
      expect(wrapped.compatibility.score).toBeGreaterThan(0);
    });

    it("builds from Dockerfile", async () => {
      const dockerfile = `
        FROM node:20-alpine
        WORKDIR /app
        COPY package.json .
        RUN npm install
        COPY . .
        CMD ["node", "index.js"]
      `;
      const image = await buildFromDockerfile(dockerfile, "builder-123");
      expect(image.canonicalId).toMatch(CANONICAL_RE);
      expect(image.dockerfileSource).toBe(dockerfile);
      expect(image.layers.length).toBeGreaterThan(0);
    });

    it("has complete Docker feature mapping", () => {
      expect(DOCKER_FEATURE_MAP.length).toBeGreaterThanOrEqual(20);
      expect(DOCKER_VERB_MAP.length).toBeGreaterThanOrEqual(10);

      // Key Docker commands must all be mapped
      const dockerCmds = DOCKER_VERB_MAP.map(v => v.dockerCommand);
      expect(dockerCmds.some(c => c.includes("docker build"))).toBe(true);
      expect(dockerCmds.some(c => c.includes("docker push"))).toBe(true);
      expect(dockerCmds.some(c => c.includes("docker pull"))).toBe(true);
      expect(dockerCmds.some(c => c.includes("docker run"))).toBe(true);
      expect(dockerCmds.some(c => c.includes("docker compose"))).toBe(true);
      expect(dockerCmds.some(c => c.includes("docker secret"))).toBe(true);
    });

    it("generates a compatibility report", async () => {
      const wrapped = await wrapDockerImage("node:20");
      const report = generateCompatReport(wrapped.compatibility);
      expect(report).toContain("Compatibility Score");
      expect(report).toContain("Mapped Features");
    });
  });

  // ── Image Registry ────────────────────────────────────────────────────

  describe("Image Registry (tag/push/pull)", () => {
    it("tags, pushes, and pulls an image", async () => {
      const image = await buildFromDockerfile(
        "FROM node:20\nCOPY . .\nCMD node index.js",
        "builder-1"
      );

      const pushResult = await pushImage(image, ["myapp:v1", "myapp:latest"]);
      expect(pushResult.canonicalId).toMatch(CANONICAL_RE);
      expect(pushResult.deduplicated).toBe(false);

      const pulled = await pullImage("myapp:v1");
      expect(pulled).not.toBeNull();
      expect(pulled!.canonicalId).toBe(image.canonicalId);
    });

    it("deduplicates identical images", async () => {
      const image = await buildFromDockerfile("FROM scratch\nCOPY a b", "b1");
      await pushImage(image, ["app:v1"]);
      const second = await pushImage(image, ["app:v2"]);
      expect(second.deduplicated).toBe(true);
    });

    it("lists and inspects images", async () => {
      const image = await buildFromDockerfile("FROM node:20\nCOPY . .", "b1");
      await pushImage(image, ["testapp:v1"]);

      const images = listImages();
      expect(images.length).toBe(1);

      const inspected = inspectImage("testapp:v1");
      expect(inspected).not.toBeNull();
      expect(inspected!.canonicalId).toBe(image.canonicalId);
    });

    it("shows image history", async () => {
      const image = await buildFromDockerfile(
        "FROM node:20\nRUN npm install\nCOPY . .",
        "b1"
      );
      await pushImage(image, ["app:v1"]);

      const history = imageHistory("app:v1");
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].canonicalId).toMatch(CANONICAL_RE);
    });

    it("removes images and tags", async () => {
      const image = await buildFromDockerfile("FROM scratch", "b1");
      await pushImage(image, ["rm-test:v1"]);

      expect(removeImage(image.canonicalId)).toBe(true);
      expect(listImages().length).toBe(0);
      expect(resolveTag("rm-test:v1")).toBeNull();
    });
  });

  // ── Compose ───────────────────────────────────────────────────────────

  describe("Compose Orchestration", () => {
    it("starts and stops a multi-service app", async () => {
      const spec = parseComposeSpec({
        version: "3.8",
        services: {
          web: { image: "nginx:latest", ports: ["80:80"] },
          api: { image: "node:20", ports: ["3000:3000"], depends_on: ["db"] },
          db: { image: "postgres:16", environment: { POSTGRES_DB: "app" } },
        },
      });

      expect(spec.services.size).toBe(3);

      const app = await composeUp("my-project", spec);
      expect(app.canonicalId).toMatch(CANONICAL_RE);
      expect(app.serviceStatus.size).toBe(3);

      const ps = composePs("my-project");
      expect(ps.length).toBe(3);
      expect(ps.every(s => s.state === "running")).toBe(true);

      const stopped = await composeDown("my-project");
      expect(stopped).toBe(true);
      expect(composePs("my-project").length).toBe(0);
    });

    it("scales a service", async () => {
      const spec = parseComposeSpec({
        version: "3.8",
        services: {
          worker: { image: "node:20", ports: [] },
        },
      });

      await composeUp("scale-test", spec);
      expect(composeScale("scale-test", "worker", 5)).toBe(true);

      const ps = composePs("scale-test");
      expect(ps[0].replicas).toBe(5);
    });

    it("respects dependency ordering", async () => {
      const spec = parseComposeSpec({
        version: "3.8",
        services: {
          web: { image: "nginx", depends_on: ["api"] },
          api: { image: "node", depends_on: ["db"] },
          db: { image: "postgres" },
        },
      });

      const app = await composeUp("order-test", spec);
      const names = Array.from(app.serviceStatus.keys());
      // db should come before api, api before web
      expect(names.indexOf("db")).toBeLessThan(names.indexOf("api"));
      expect(names.indexOf("api")).toBeLessThan(names.indexOf("web"));
    });
  });

  // ── Secrets Manager ───────────────────────────────────────────────────

  describe("Secrets Manager", () => {
    it("creates, reads, and removes secrets", async () => {
      const result = await createSecret("db-password", "s3cur3!", "creator-1");
      expect(result.created).toBe(true);
      expect(result.secret.name).toBe("db-password");
      expect(result.secret.canonicalId).toMatch(CANONICAL_RE);

      const val = await getSecretValue("db-password");
      expect(val).not.toBeNull();
      expect(new TextDecoder().decode(val!.value)).toBe("s3cur3!");

      expect(listSecrets().length).toBe(1);
      expect(inspectSecret("db-password")).not.toBeNull();

      expect(removeSecret("db-password")).toBe(true);
      expect(listSecrets().length).toBe(0);
    });

    it("updates secrets with version increment", async () => {
      await createSecret("api-key", "key-v1", "creator-1");
      const result = await createSecret("api-key", "key-v2", "creator-1");
      expect(result.created).toBe(false);
      expect(result.secret.version).toBe(2);

      const val = await getSecretValue("api-key");
      expect(new TextDecoder().decode(val!.value)).toBe("key-v2");
    });

    it("injects secrets as environment variables", async () => {
      await createSecret("db-password", "secret123", "c1");
      await createSecret("api-key", "key456", "c1");

      const env = await injectSecrets(["db-password", "api-key"]);
      expect(env.DB_PASSWORD).toBe("secret123");
      expect(env.API_KEY).toBe("key456");
    });
  });
});
