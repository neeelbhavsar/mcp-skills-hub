import type { Mcp, McpPackage } from "./types";

/**
 * Client compatibility, derived entirely from data the registry already gives
 * us. 205 of 259 servers are remote-only and 52 are packaged, which decides
 * whether a given client can run them directly, needs an mcp-remote bridge, or
 * cannot run them at all.
 */

export type Support = "native" | "bridged" | "unsupported";

export interface ClientSupport {
  id: string;
  name: string;
  support: Support;
  reason: string;
}

/** How a server can be launched. Shared with the config generator. */
export type Launch =
  | { mode: "stdio"; command: string; args: string[]; registryType: string | null }
  | { mode: "remote"; transport: "http" | "sse"; url: string }
  | { mode: "unknown" };

export function commandFor(pkg: McpPackage): { command: string; args: string[] } {
  const reg = (pkg.registryType || "").toLowerCase();
  if (reg.includes("pypi") || reg.includes("python")) return { command: "uvx", args: [pkg.identifier] };
  if (reg.includes("oci") || reg.includes("docker"))
    return { command: "docker", args: ["run", "-i", "--rm", pkg.identifier] };
  if (reg.includes("nuget")) return { command: "dnx", args: [pkg.identifier] };
  return { command: "npx", args: ["-y", pkg.identifier] };
}

export function launchFor(mcp: Mcp): Launch {
  const pkg = mcp.packages[0];
  if (pkg) return { mode: "stdio", ...commandFor(pkg), registryType: pkg.registryType };

  const remote = mcp.remotes[0];
  if (remote) {
    const t = (remote.type || "").toLowerCase();
    return { mode: "remote", transport: t.includes("sse") ? "sse" : "http", url: remote.url };
  }
  // Neither a package nor an endpoint — nothing to install.
  return { mode: "unknown" };
}

/** True when the registry entry has no usable installation path at all. */
export function isInstallable(mcp: Mcp) {
  return launchFor(mcp).mode !== "unknown";
}

/** Clients that can only launch local processes, so remote servers must be bridged. */
const STDIO_ONLY = new Set(["claude-desktop", "codex"]);

export function supportFor(mcp: Mcp, clientId: string, clientName: string): ClientSupport {
  const launch = launchFor(mcp);

  if (launch.mode === "unknown") {
    return {
      id: clientId,
      name: clientName,
      support: "unsupported",
      reason: "This registry entry ships no package and no endpoint.",
    };
  }

  if (launch.mode === "stdio") {
    return { id: clientId, name: clientName, support: "native", reason: "Runs as a local process." };
  }

  if (STDIO_ONLY.has(clientId)) {
    return {
      id: clientId,
      name: clientName,
      support: "bridged",
      reason: "Launches local processes only — proxied through mcp-remote.",
    };
  }

  return {
    id: clientId,
    name: clientName,
    support: "native",
    reason: `Connects directly over ${launch.transport.toUpperCase()}.`,
  };
}

export function supportMatrix(mcp: Mcp, clients: { id: string; name: string }[]): ClientSupport[] {
  return clients.map((c) => supportFor(mcp, c.id, c.name));
}

/** Does this client run the server without a bridge? Used by the catalog filter. */
export function isNativeFor(mcp: Mcp, clientId: string) {
  return supportFor(mcp, clientId, "").support === "native";
}
