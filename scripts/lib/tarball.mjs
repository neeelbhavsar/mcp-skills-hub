// Fetch and unpack an npm tarball in memory, for static inspection only.
//
// SAFETY: nothing here executes, installs, or resolves the package. No
// `npm install`, no `require()`, no lifecycle scripts. The tarball is gunzipped
// into a buffer, the tar headers are walked, and matching source files are
// handed back as strings to be parsed. That is the whole contract — a package
// being inspected must never be able to run code on the build machine.
//
// Written against the tar format directly rather than adding a dependency:
// the ustar header is 512 bytes of fixed offsets and the body is padded to
// 512-byte blocks, which is less code than justifying another package.

import { gunzipSync } from "node:zlib";

const BLOCK = 512;
const MAX_TARBALL_BYTES = 12 * 1024 * 1024;
const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function readString(buf, offset, length) {
  const end = buf.indexOf(0, offset);
  const stop = end === -1 || end > offset + length ? offset + length : end;
  return buf.toString("utf8", offset, stop).trim();
}

/** Tar stores sizes as octal ASCII; GNU may use a base-256 extension. */
function readSize(buf, offset) {
  if (buf[offset] & 0x80) {
    let value = 0;
    for (let i = offset + 1; i < offset + 12; i++) value = value * 256 + buf[i];
    return value;
  }
  const raw = readString(buf, offset, 12).replace(/[^0-7]/g, "");
  return raw ? parseInt(raw, 8) : 0;
}

/**
 * Walk a gzipped tar and return `{ path, contents }` for entries `keep()`
 * accepts. Paths are normalized: npm wraps everything in `package/`.
 */
export function extractTarball(gzipped, keep) {
  const tar = gunzipSync(gzipped);
  const files = [];

  let offset = 0;
  // A long-name entry (GNU ‘L’) describes the *next* header's path.
  let pendingLongName = null;

  while (offset + BLOCK <= tar.length) {
    const name = readString(tar, offset, 100);
    if (!name) {
      // Two consecutive zero blocks terminate the archive.
      offset += BLOCK;
      continue;
    }

    const size = readSize(tar, offset + 124);
    const type = String.fromCharCode(tar[offset + 156] || 0x30);
    const prefix = readString(tar, offset + 345, 155);
    const bodyStart = offset + BLOCK;
    const bodyEnd = bodyStart + size;
    if (bodyEnd > tar.length) break;

    const fullName = pendingLongName ?? (prefix ? `${prefix}/${name}` : name);
    pendingLongName = null;

    if (type === "L") {
      pendingLongName = tar.toString("utf8", bodyStart, bodyEnd).replace(/\0+$/, "").trim();
    } else if (type === "0" || type === "\0") {
      // npm packs everything under a single top-level directory.
      const path = fullName.replace(/^[^/]+\//, "");
      if (size <= MAX_FILE_BYTES && keep(path)) {
        files.push({ path, contents: tar.toString("utf8", bodyStart, bodyEnd) });
      }
    }

    // Bodies are padded up to the next 512-byte boundary.
    offset = bodyStart + Math.ceil(size / BLOCK) * BLOCK;
  }

  return files;
}

/** Download a tarball, refusing anything implausibly large. */
export async function fetchTarball(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ai-library-bot/1.0" },
    });
    if (!res.ok) return null;

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_TARBALL_BYTES) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > MAX_TARBALL_BYTES ? null : buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
