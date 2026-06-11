"use client";

// Image-first sharing: the card PNG itself goes into the post — links get
// suppressed and ignored; images are the engagement object.

export async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  return res.blob();
}

// Mobile: hand the PNG to the OS share sheet — it attaches as a real image
// in X/IG/WhatsApp/iMessage composers.
export async function shareImageFile(
  url: string,
  fileName: string,
  text: string,
): Promise<boolean> {
  if (!("share" in navigator) || !("canShare" in navigator)) return false;
  try {
    const blob = await fetchImageBlob(url);
    const file = new File([blob], fileName, { type: "image/png" });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], text });
    return true;
  } catch {
    return false;
  }
}

// Desktop: put the PNG on the clipboard — paste (Ctrl+V) directly into the
// X/Facebook/Discord composer and it attaches as an image.
export async function copyImageToClipboard(url: string): Promise<boolean> {
  if (!("clipboard" in navigator) || typeof ClipboardItem === "undefined") {
    return false;
  }
  try {
    // Safari requires the promise form inside ClipboardItem.
    const item = new ClipboardItem({ "image/png": fetchImageBlob(url) });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

export async function downloadImage(url: string, fileName: string): Promise<void> {
  const blob = await fetchImageBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
