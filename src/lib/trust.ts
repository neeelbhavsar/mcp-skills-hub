import type { Mcp } from "./types";
import { launchFor } from "./compat";

/**
 * Trust signals for MCP servers.
 *
 * An MCP server runs with the user's credentials, and a stdio one executes
 * arbitrary code on their machine. Directories that render a three-star
 * weekend project identically to a maintained, widely-installed one push that
 * judgement onto the reader without giving them anything to judge with.
 *
 * These are *signals*, deliberately not a safety verdict: none of them proves
 * a server is safe or malicious. The UI states them plainly and lets the
 * reader decide.
 */

export type Level = "good" | "caution" | "risk" | "neutral";

export interface Signal {
  label: string;
  detail: string;
  level: Level;
}

const DAY = 86_400_000;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

function formatAge(days: number): string {
  if (days < 1) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

function repoSignals(mcp: Mcp): Signal[] {
  const repo = mcp.repoMeta;
  const hasRepoUrl = !!mcp.repository;

  // Distinguish "the entry links to no repo" (a real signal) from "we could
  // not resolve it this build" (says nothing about the server). Asserting the
  // former when only the latter is true would be worse than staying quiet.
  if (!hasRepoUrl) {
    return [
      {
        label: "No source repository",
        detail:
          "This registry entry does not link to a public repo, so its code cannot be reviewed before you install it.",
        level: "risk",
      },
    ];
  }

  if (!repo) return [];

  const out: Signal[] = [];

  if (repo.archived) {
    out.push({
      label: "Repository archived",
      detail: "The maintainer has archived this project. It will not receive fixes.",
      level: "risk",
    });
  }

  const pushed = daysSince(repo.pushedAt);
  if (pushed !== null) {
    const level: Level = pushed > 365 ? "risk" : pushed > 180 ? "caution" : "good";
    out.push({
      label: `Last commit ${formatAge(pushed)}`,
      detail:
        level === "good"
          ? "Actively maintained."
          : level === "caution"
            ? "No commits in over six months."
            : "No commits in over a year — likely unmaintained.",
      level,
    });
  }

  const created = daysSince(repo.createdAt);
  if (created !== null && created < 90) {
    out.push({
      label: `Repository created ${formatAge(created)}`,
      detail: "Very new project with little track record yet.",
      level: "caution",
    });
  }

  if (repo.isFork) {
    out.push({
      label: "Fork of another repository",
      detail: "Check whether the upstream project is the one you actually want.",
      level: "caution",
    });
  }

  if (repo.stars !== null) {
    out.push({
      label: `${formatCount(repo.stars)} GitHub stars`,
      detail: repo.stars < 10 ? "Very little community usage so far." : "Community adoption signal.",
      level: repo.stars < 10 ? "caution" : "good",
    });
  }

  if (!repo.license) {
    out.push({
      label: "No license declared",
      detail: "Without a license the code is not legally reusable in a commercial project.",
      level: "caution",
    });
  }

  return out;
}

function packageSignals(mcp: Mcp): Signal[] {
  const out: Signal[] = [];

  for (const pkg of mcp.packages) {
    if (pkg.deprecated) {
      out.push({
        label: `${pkg.identifier} is deprecated`,
        detail: "The publisher has marked this package deprecated on npm.",
        level: "risk",
      });
    }

    if (typeof pkg.weeklyDownloads === "number") {
      const low = pkg.weeklyDownloads < 100;
      out.push({
        label: `${formatCount(pkg.weeklyDownloads)} weekly downloads`,
        detail: low
          ? "Very few installs — you would be an early user."
          : "Regularly installed by other developers.",
        level: low ? "caution" : "good",
      });
    }

    const published = daysSince(pkg.lastPublished);
    if (published !== null && published > 365) {
      out.push({
        label: `Package last published ${formatAge(published)}`,
        detail: "No release in over a year.",
        level: "caution",
      });
    }

    if (pkg.repoMatchesRegistry === false) {
      out.push({
        label: "Package repo does not match registry entry",
        detail: `The npm package points at ${pkg.declaredRepo}, while the registry lists ${
          mcp.repoMeta?.slug ?? "a different repo"
        }. Worth confirming you are installing what you think you are.`,
        level: "risk",
      });
    }
  }

  return out;
}

/** What the server can reach once it is running. */
export function accessSummary(mcp: Mcp): { label: string; detail: string }[] {
  const launch = launchFor(mcp);
  const out: { label: string; detail: string }[] = [];

  if (launch.mode === "stdio") {
    const runner = launch.registryType?.toLowerCase() ?? "";
    out.push({
      label: "Runs code on your machine",
      detail: runner.includes("oci")
        ? "Executes as a Docker container with whatever mounts and env you pass it."
        : "Executes as a local process with your user's permissions, including filesystem access.",
    });
    out.push({
      label: "Downloads at launch",
      detail: "The package is fetched from its registry each run unless you pin a version.",
    });
  } else if (launch.mode === "remote") {
    out.push({
      label: "Third-party hosted service",
      detail: `Your requests and any data in them are sent to ${safeHost(launch.url)}.`,
    });
    out.push({
      label: "No local execution",
      detail: "Nothing is installed or run on your machine.",
    });
  }

  return out;
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "the provider";
  }
}

export function trustSignals(mcp: Mcp): Signal[] {
  return [...repoSignals(mcp), ...packageSignals(mcp)];
}

/** Worst level present, for the compact card badge. */
export function overallLevel(signals: Signal[]): Level {
  if (signals.some((s) => s.level === "risk")) return "risk";
  if (signals.some((s) => s.level === "caution")) return "caution";
  return signals.length ? "good" : "neutral";
}
