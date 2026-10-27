"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/*
 * Transform-only. These used to start at opacity 0, which the server rendered
 * into the HTML as an inline style: until hydration finished, every section
 * (and every listing page's H1, via PageHeader) was invisible — an empty first
 * frame, a late LCP, and nothing on screen if JavaScript failed. Content is
 * now always painted; it only slides into place.
 */
const variants: Variants = {
  hidden: { y: 18 },
  show: (i: number) => ({
    y: 0,
    transition: { duration: 0.6, ease: EASE, delay: i * 0.06 },
  }),
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  delayIndex?: number;
  once?: boolean;
}

export function Reveal({ children, className, delayIndex = 0, once = true }: RevealProps) {
  return (
    <motion.div
      className={className}
      custom={delayIndex}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container: children rise in sequence as the group enters. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { y: 14 },
        show: { y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
