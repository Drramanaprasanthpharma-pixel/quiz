"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Maximize2, Check } from "lucide-react";

export function QRCodeCard({ joinUrl, pin }: { joinUrl: string; pin: string }) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `buzzr-${pin}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <>
      <div className="rounded-panel border border-white/10 bg-ink-soft p-6">
        <div ref={canvasWrapRef} className="mx-auto w-fit rounded-tile bg-white p-4">
          <QRCodeCanvas value={joinUrl} size={220} level="M" />
        </div>
        <p className="mt-4 text-center text-sm text-paper/60">Scan to join, or go to</p>
        <p className="text-center font-display text-lg font-semibold text-paper">
          {joinUrl.replace(/^https?:\/\//, "")}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            onClick={handleCopy}
            className="flex flex-col items-center gap-1 rounded-panel bg-white/10 px-2 py-3 text-xs font-medium text-paper transition hover:bg-white/20"
          >
            {copied ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-1 rounded-panel bg-white/10 px-2 py-3 text-xs font-medium text-paper transition hover:bg-white/20"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={() => setFullscreen(true)}
            className="flex flex-col items-center gap-1 rounded-panel bg-white/10 px-2 py-3 text-xs font-medium text-paper transition hover:bg-white/20"
          >
            <Maximize2 className="h-4 w-4" />
            Full screen
          </button>
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-label="Full screen QR code"
        >
          <p className="font-display text-2xl text-paper/70">Game PIN</p>
          <p className="font-display text-6xl font-bold tracking-widest text-gold">{pin}</p>
          <div className="rounded-tile bg-white p-6">
            <QRCodeCanvas value={joinUrl} size={360} level="M" />
          </div>
          <p className="text-paper/50">Tap anywhere to close</p>
        </div>
      )}
    </>
  );
}
