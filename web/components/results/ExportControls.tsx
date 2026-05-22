'use client';

import { TranscriptionResult, InstrumentKey } from '@/types/transcription';
import { exportAllInstrumentsPDF, exportSingleInstrumentPDF } from '@/lib/export/pdf';
import { toast } from 'sonner';

interface ExportControlsProps {
  result: TranscriptionResult;
  title: string;
  instrumentKey?: InstrumentKey;
  variant?: 'single' | 'all';
}

function BrassButton({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded transition-all hover:opacity-90 active:scale-95 ${className}`}
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        border: '1px solid #b5651d',
        color: '#b5651d',
        background: 'transparent',
      }}
    >
      {children}
    </button>
  );
}

export function ExportControls({ result, title, instrumentKey, variant = 'all' }: ExportControlsProps) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const copySargamText = (key: InstrumentKey, withTiming = false) => {
    const notes = result.instruments[key].notes;
    let text: string;
    if (withTiming) {
      text = notes.map(n => `${n.sargam}(${n.start.toFixed(2)}s)`).join(' ');
    } else {
      text = notes.map(n => n.sargam).join(' ');
    }
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const copyAllCompact = () => {
    const keys: InstrumentKey[] = ['trumpet', 'alto_saxophone', 'trombone', 'euphonium'];
    const text = keys.map(k => {
      const inst = result.instruments[k];
      return `[${inst.label}]\n${inst.notes.map(n => n.sargam).join(' ')}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('All instruments copied');
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-transcription.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (variant === 'single' && instrumentKey) {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <BrassButton onClick={() => copySargamText(instrumentKey)}>Copy Sargam</BrassButton>
        <BrassButton onClick={() => copySargamText(instrumentKey, true)}>Copy + Timing</BrassButton>
        <BrassButton onClick={() => exportSingleInstrumentPDF(result, instrumentKey, title, date)}>
          Export PDF
        </BrassButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <BrassButton
        onClick={() => exportAllInstrumentsPDF(result, title, date)}
        className="!bg-[#b5651d] !text-[#0a0a08] hover:!bg-[#d4943d]"
      >
        Export All PDF
      </BrassButton>
      <BrassButton onClick={exportJSON}>Export JSON</BrassButton>
      <BrassButton onClick={copyAllCompact}>Copy All Compact</BrassButton>
    </div>
  );
}
