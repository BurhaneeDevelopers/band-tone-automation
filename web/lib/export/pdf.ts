import { TranscriptionResult, MelodicInstrumentKey, INSTRUMENT_DISPLAY } from '@/types/transcription';

export async function exportAllInstrumentsPDF(
  result: TranscriptionResult,
  title: string,
  date: string
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const instruments: MelodicInstrumentKey[] = ['trumpet', 'alto_saxophone', 'trombone', 'euphonium'];

  instruments.forEach((key, idx) => {
    if (idx > 0) doc.addPage();
    const inst = result.instruments[key];
    const display = INSTRUMENT_DISPLAY[key];

    // Header
    doc.setFillColor(10, 10, 8);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(181, 101, 29);
    doc.text('BURHANI GUARDS BAND', 105, 18, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(240, 235, 224);
    doc.text(title.toUpperCase(), 105, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(122, 112, 96);
    doc.text(`Date: ${date}  |  Concert Key: ${result.original_key}  |  Duration: ${result.duration.toFixed(1)}s`, 105, 36, { align: 'center' });

    // Instrument header
    doc.setFillColor(30, 28, 21);
    doc.rect(14, 42, 182, 14, 'F');
    doc.setFontSize(16);
    doc.setTextColor(212, 148, 61);
    doc.setFont('helvetica', 'bold');
    doc.text(`${inst.label.toUpperCase()}  —  KEY: ${inst.written_key}`, 105, 52, { align: 'center' });

    // Transposition badge
    const transpText = inst.transposition === 0 ? 'Concert Pitch' : `+${inst.transposition} semitones`;
    doc.setFontSize(9);
    doc.setTextColor(122, 112, 96);
    doc.text(`Transposition: ${transpText}  |  Notes: ${inst.notes.length}`, 105, 62, { align: 'center' });

    // Notes
    const sargamText = inst.notes.map(n => n.sargam).join('  ');
    doc.setFontSize(11);
    doc.setTextColor(240, 235, 224);
    doc.setFont('courier', 'normal');
    const lines = doc.splitTextToSize(sargamText, 180);
    doc.text(lines, 15, 72);
  });

  doc.save(`burhani-guards-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export async function exportSingleInstrumentPDF(
  result: TranscriptionResult,
  instrumentKey: MelodicInstrumentKey,
  title: string,
  date: string
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const inst = result.instruments[instrumentKey];

  doc.setFillColor(10, 10, 8);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(181, 101, 29);
  doc.text('BURHANI GUARDS BAND', 105, 18, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(240, 235, 224);
  doc.text(`${title.toUpperCase()} — ${inst.label.toUpperCase()}`, 105, 27, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(122, 112, 96);
  doc.text(`${date}  |  Key: ${inst.written_key}  |  Notes: ${inst.notes.length}`, 105, 35, { align: 'center' });

  const sargamText = inst.notes.map(n => n.sargam).join('  ');
  doc.setFontSize(12);
  doc.setTextColor(240, 235, 224);
  doc.setFont('courier', 'normal');
  const lines = doc.splitTextToSize(sargamText, 180);
  doc.text(lines, 15, 48);

  doc.save(`${inst.label.toLowerCase().replace(/\s+/g, '-')}-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
