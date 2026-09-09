"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import type { Readme } from "@/lib/types";
import { CodeBlock } from "@/components/fx/code-block";

/**
 * Minimal markdown renderer for fetched READMEs.
 *
 * Deliberately not a markdown library: the input is untrusted third-party
 * content, so rather than sanitising arbitrary HTML we tokenise the small
 * subset that matters (headings, code fences, lists, paragraphs, inline code
 * and links) and render it as React elements. Nothing reaches
 * dangerouslySetInnerHTML, so embedded HTML or script in a README is inert.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "code"; language: string; code: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "quote"; text: string }
  | { kind: "para"; text: string }
  | { kind: "rule" };

function parse(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(/^\s*```+\s*([\w+-]*)/);
    if (fence) {
      const language = fence[1] || "text";
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```+/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      blocks.push({ kind: "code", language, code: body.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ kind: "quote", text: body.join(" ").trim() });
      continue;
    }

    const bullet = /^\s*([-*+]|\d+\.)\s+/;
    if (bullet.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && bullet.test(lines[i])) items.push(lines[i++].replace(bullet, "").trim());
      blocks.push({ kind: "list", items, ordered });
      continue;
    }

    const body: string[] = [];
    while (i < lines.length && lines[i].trim() && !bullet.test(lines[i]) && !/^\s*(#|>|```)/.test(lines[i])) {
      body.push(lines[i++].trim());
    }
    blocks.push({ kind: "para", text: body.join(" ") });
  }

  return blocks;
}

/** Inline markdown: code spans, links, bold. Returns React nodes, never HTML. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${n++}`;

    if (token.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em] text-brand-2">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      // Only http(s) links are rendered as links; anything else stays text.
      if (link && /^https?:\/\//i.test(link[2])) {
        out.push(
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noreferrer nofollow"
            className="text-brand hover:underline"
          >
            {link[1]}
          </a>,
        );
      } else {
        out.push(link ? link[1] : token);
      }
    } else {
      out.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

const HEADING_CLASS: Record<number, string> = {
  1: "mt-6 text-lg font-semibold",
  2: "mt-6 text-base font-semibold",
  3: "mt-5 text-sm font-semibold",
};

export function ReadmeViewer({ readme }: { readme: Readme }) {
  const [expanded, setExpanded] = useState(false);
  const blocks = useMemo(() => parse(readme.markdown), [readme.markdown]);

  // Long READMEs are collapsed so they don't bury the setup steps below.
  const visible = expanded ? blocks : blocks.slice(0, 14);
  const hidden = blocks.length - visible.length;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BookOpen className="h-4 w-4 text-brand-2" />
          Documentation
        </h2>
        <a
          href={readme.url}
          target="_blank"
          rel="noreferrer"
          className="ring-focus inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
        >
          Full README <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="rounded-xl border border-border bg-surface/60 px-5 py-4 text-sm leading-relaxed text-muted">
        {visible.map((block, i) => {
          switch (block.kind) {
            case "heading":
              return (
                <p
                  key={i}
                  className={`${HEADING_CLASS[block.level] ?? "mt-4 text-sm font-semibold"} text-foreground first:mt-0`}
                >
                  {inline(block.text, `h${i}`)}
                </p>
              );
            case "code":
              return <CodeBlock key={i} code={block.code} language={block.language} className="my-3" />;
            case "list":
              return block.ordered ? (
                <ol key={i} className="my-3 list-decimal space-y-1 pl-5">
                  {block.items.map((item, j) => (
                    <li key={j}>{inline(item, `l${i}-${j}`)}</li>
                  ))}
                </ol>
              ) : (
                <ul key={i} className="my-3 list-disc space-y-1 pl-5">
                  {block.items.map((item, j) => (
                    <li key={j}>{inline(item, `l${i}-${j}`)}</li>
                  ))}
                </ul>
              );
            case "quote":
              return (
                <p key={i} className="my-3 border-l-2 border-brand/50 pl-3 italic">
                  {inline(block.text, `q${i}`)}
                </p>
              );
            case "rule":
              return <hr key={i} className="my-4 border-border" />;
            default:
              return (
                <p key={i} className="my-3 first:mt-0">
                  {inline(block.text, `p${i}`)}
                </p>
              );
          }
        })}

        {hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="ring-focus mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show {hidden} more section{hidden === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {readme.truncated && (
        <p className="mt-2 text-xs text-muted-2">
          Excerpt — the full document is on GitHub.
        </p>
      )}
    </section>
  );
}
