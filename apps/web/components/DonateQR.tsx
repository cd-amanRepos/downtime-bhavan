'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  upiId: string;
  amountInr?: number;  // optional pre-filled amount (V1 leaves it blank for user choice)
  imagePath?: string;  // if set, use this static image instead of generating
}

/** Renders a UPI QR code. When `imagePath` is provided, uses the static image
 *  (e.g. /donate-qr.jpeg) — useful for pre-branded QR codes from a UPI app's
 *  share-QR feature. Otherwise generates a generic deep-link QR client-side.
 *  Either way, scanning with any UPI app opens the payment flow. */
export function DonateQR({ upiId, amountInr, imagePath }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Downtime Bhavan')}&cu=INR${amountInr ? `&am=${amountInr}` : ''}`;

  useEffect(() => {
    if (imagePath) return;  // static image — skip generation
    QRCode.toDataURL(upiLink, {
      width: 280,
      margin: 1,
      color: { dark: '#0E1B2D', light: '#FFFFFF' },
    }).then(setDataUrl).catch(console.error);
  }, [upiLink, imagePath]);

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  const qrSrc = imagePath ?? dataUrl;

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-6 max-w-[420px] mx-auto text-center">
      <div className="flex justify-center mb-4">
        {qrSrc
          ? <img src={qrSrc} alt="UPI QR code for Downtime Bhavan donations" className="rounded-lg max-w-[280px] w-full h-auto" />
          : <div className="w-[280px] h-[280px] bg-[var(--color-paper-2)] rounded-lg" />
        }
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1">UPI ID</p>
      <p className="text-base font-mono font-semibold text-[var(--color-ink)] mb-3">{upiId}</p>
      <button onClick={copyUpi}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] text-[var(--color-ink-soft)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)] transition-all">
        {copied ? '✓ Copied' : 'Copy UPI ID'}
      </button>
    </div>
  );
}
