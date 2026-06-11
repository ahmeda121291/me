"use client";

import { useState } from "react";
import {
  copyImageToClipboard,
  downloadImage,
  shareImageFile,
} from "@/lib/share-image";

interface Props {
  text: string; // share message, without the link
  url: string;
  trigger: string; // label on the closed-state button
  triggerClassName?: string;
  imageUrl?: string; // the card PNG — when present, image actions lead
  imageFileName?: string;
  onShare?: (target: string) => void;
}

// Image-first share menu. The card PNG is the engagement object — links get
// algorithmically buried — so image actions lead: share the file (mobile),
// copy to clipboard (desktop: paste straight into the composer), download.
// Link intents remain as the secondary row.
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

export default function ShareMenu({
  text,
  url,
  trigger,
  triggerClassName,
  imageUrl,
  imageFileName = "first-ballot.png",
  onShare,
}: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const pick = (key: string) => onShare?.(key);

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2600);
  };

  const copyImage = async () => {
    pick("image_copy");
    if (imageUrl && (await copyImageToClipboard(imageUrl))) {
      flash("Image copied — paste it (Ctrl+V) into your post ✓");
      return;
    }
    if (imageUrl) {
      await downloadImage(imageUrl, imageFileName);
      flash("Image downloaded — attach it to your post ✓");
    }
  };

  const shareImage = async () => {
    pick("image_share");
    if (imageUrl && (await shareImageFile(imageUrl, imageFileName, `${text} ${url}`))) {
      return;
    }
    // No file-share support (desktop) → fall through to clipboard.
    await copyImage();
  };

  const download = async () => {
    pick("image_download");
    if (imageUrl) {
      await downloadImage(imageUrl, imageFileName);
      flash("Saved ✓");
    }
  };

  const copyLink = async () => {
    pick("copy");
    await navigator.clipboard.writeText(`${text} ${url}`);
    flash("Link copied ✓");
  };

  const device = async () => {
    pick("device");
    try {
      await navigator.share({ text: `${text} ${url}` });
    } catch {
      /* dismissed */
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
    <div className="flex flex-col items-center gap-2.5">
      {imageUrl && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={shareImage}
            className="rounded-full bg-bronze px-4 py-2 text-xs font-semibold text-ivory"
          >
            Share the card 🖼
          </button>
          <button
            onClick={copyImage}
            className="rounded-full border border-bronze px-4 py-2 text-xs font-semibold text-bronze"
          >
            Copy image
          </button>
          <button
            onClick={download}
            className="rounded-full border border-line px-3.5 py-2 text-xs"
          >
            Download
          </button>
        </div>
      )}
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
          onClick={copyLink}
          className="rounded-full border border-line px-3.5 py-1.5 text-xs hover:border-bronze"
        >
          Copy link
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
      {note && <p className="text-xs font-semibold text-bronze">{note}</p>}
    </div>
  );
}
