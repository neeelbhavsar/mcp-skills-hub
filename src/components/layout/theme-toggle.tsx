"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS: { key: Theme; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "Light", Icon: Sun },
  { key: "system", label: "System", Icon: Monitor },
  { key: "dark", label: "Dark", Icon: Moon },
];

export const THEME_KEY = "ai-library-theme";

/**
 * Runs before paint (see layout.tsx) so the correct palette is applied on the
 * very first frame. Without it every light-mode visitor gets a dark flash.
 */
export const themeInitScript = `
try {
  var t = localStorage.getItem(${JSON.stringify(THEME_KEY)});
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode — the choice just won't persist */
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  // The server can't know the stored preference, so the control renders in a
  // neutral state until mounted rather than claiming the wrong one.
  const [mounted, setMounted] = useState(false);

  // localStorage is unreadable on the server, so the stored choice can only be
  // picked up after mount. Runs once — no cascading renders.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {
      /* ignore */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function choose(next: Theme) {
    setTheme(next);
    apply(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center rounded-lg border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ key, label, Icon }) => {
        const active = mounted && theme === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(key)}
            className={cn(
              "ring-focus rounded-md p-1.5 transition-colors",
              active ? "bg-surface-2 text-foreground" : "text-muted-2 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
