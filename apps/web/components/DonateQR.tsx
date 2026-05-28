'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  upiId: string;
  amountInr?: number;  // optional pre-filled amount (V1 leaves it blank for user choice)
}

/** Renders a UPI deep-link QR code client-side. Reading the QR with any UPI
 *  app (GPay, PhonePe, Paytm, BHIM) opens the payment flow pre-filled with
 *  the recipient UPI ID. */
export function DonateQR({ upiId, amountInr }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Downtime Bhavan')}&cu=INR${amountInr ? `&am=${amountInr}` : ''}`;

  useEffect(() => {
    QRCode.toDataURL(upiLink, {
      width: 280,
      margin: 1,
      color: { dark: '#0E1B2D', light: '#FFFFFF' },
    }).then(setDataUrl).catch(console.error);
  }, [upiLink]);

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-6 max-w-[420px] mx-auto text-center">
      <div className="flex justify-center mb-4">
        {dataUrl
          ? <img src={dataUrl} alt="UPI QR code" className="rounded-lg" />
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
