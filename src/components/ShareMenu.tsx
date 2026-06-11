"use client";

import { useState } from "react";

interface Props {
  text: string; // share message, without the link
  url: string;
  trigger: string; // label on the closed-state button
  triggerClassName?: string;
  onShare?: (target: string) => void;
}

// Direct platform targets — the OS share sheet only lists installed apps,
// which on desktop means no X/Reddit/Facebook. These web intents work
// everywhere; the device sheet stays available as "More" (and is still the
// best path on phones, where the social apps are installed).
const TARGETS: Array<{ key: string; label: string; href: (text: string, url: string) => string }> = [
  {
    key: "x",
    label: "𝕏",
    href: (text, url) =>
      `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: "reddit",
    label: "Reddit",
    href: (text, url) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    href: (_text, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: (text, url) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    key: "telegram",
    label: "Telegram",
    href: (text, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

export default function ShareMenu({ text, url, trigger, triggerClassName, onShare }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const pick = (key: string) => onShare?.(key);

  const copy = async () => {
    pick("copy");
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const device = async () => {
    pick("device");
    try {
      await navigator.share({ text: `${text} ${url}` });
    } catch {
      /* user dismissed */
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {trigger}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {TARGETS.map((t) => (
        <a
          key={t.key}
          href={t.href(text, url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pick(t.key)}
          className="rounded-full border border-line px-3.5 py-1.5 text-xs hover:border-bronze"
        >
          {t.label}
        </a>
      ))}
      <button
        onClick={copy}
        className="rounded-full border border-line px-3.5 py-1.5 text-xs hover:border-bronze"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          onClick={device}
          className="rounded-full border border-line px-3.5 py-1.5 text-xs hover:border-bronze"
        >
          More…
        </button>
      )}
    </div>
  );
}
