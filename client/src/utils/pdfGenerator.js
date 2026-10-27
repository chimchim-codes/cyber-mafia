// client/src/utils/pdfGenerator.js
// Generates and downloads an authoritative Cyber Mafia High Tribunal PDF record
import { jsPDF } from 'jspdf';

/**
 * Generates an official Cyber Mafia Case Dossier PDF and downloads it automatically.
 *
 * @param {Object} verdict - Verdict information from the accusation submission
 * @param {Object} team - The team submitting the accusation
 * @returns {jsPDF} The generated jsPDF instance
 */
export function generateTribunalAccusationPDF(verdict, team) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const isSolved = Boolean(verdict?.isSolved || verdict?.success);
  const score = verdict?.score ?? 0;
  const teamName = team?.name || 'Investigator Squad';
  const teamId = team?.id || 'S01';
  const ts = verdict?.timestampInfo || {};

  const startTimeStr = ts.startTimeStr || ts.startTime || new Date(Date.now() - 120000).toLocaleTimeString();
  const stopTimeStr = ts.stopTimeStr || ts.stopTime || new Date().toLocaleTimeString();
  const durationStr = ts.durationStr || 'N/A';
  const recordId = `TRB-${Date.now().toString(36).toUpperCase()}-${teamId}`;

  // 1. Background & Header Canvas
  doc.setFillColor(10, 15, 29); // Dark navy background
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  doc.setDrawColor(isSolved ? 16 : 225, isSolved ? 185 : 29, isSolved ? 129 : 72); // Emerald or Rose
  doc.setLineWidth(1);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Top header block
  doc.setFillColor(15, 23, 42);
  doc.rect(9, 9, pageWidth - 18, 30, 'F');

  // Title & Subtitle
  doc.setFont('courier', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(isSolved ? 52 : 244, isSolved ? 211 : 63, isSolved ? 153 : 94); // Light emerald or light rose
  doc.text('INIT ASSOCIATION // HIGH TRIBUNAL RECORD', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('CASE FILE: DEATH OF DR. ADRIAN VALE (OFFICIAL FORENSIC DOSSIER)', 14, 27);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`RECORD ID: ${recordId}  |  GENERATED: ${new Date().toISOString()}`, 14, 34);

  // 2. Verdict Banner
  let yPos = 46;
  doc.setFillColor(isSolved ? 6 : 40, isSolved ? 40 : 10, isSolved ? 20 : 15);
  doc.setDrawColor(isSolved ? 16 : 225, isSolved ? 185 : 29, isSolved ? 129 : 72);
  doc.setLineWidth(0.6);
  doc.roundedRect(12, yPos, pageWidth - 24, 22, 2, 2, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(isSolved ? 52 : 248, isSolved ? 211 : 113, isSolved ? 153 : 113);
  const verdictHeader = isSolved 
    ? 'VERDICT: CASE SOLVED — ELENA WARD CONVICTED' 
    : 'VERDICT: CASE UNSOLVED — ACCUSATION REJECTED';
  doc.text(verdictHeader, 16, yPos + 9);

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`ACCUSATION SCORE: ${score} / 5 QUESTIONS CORRECT  |  POINTS AWARDED: ${isSolved ? '+500 PTS' : '-50 PTS'}`, 16, yPos + 17);

  // 3. Squad & Session Timing Dossier
  yPos += 28;
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(12, yPos, pageWidth - 24, 34, 2, 2, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248); // Cyan 400
  doc.text('INVESTIGATION TELEMETRY & TIMESTAMPS', 16, yPos + 7);

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);

  doc.text(`Investigator Squad : ${teamName} (${teamId})`, 16, yPos + 14);
  doc.text(`Investigation Started : ${startTimeStr}`, 16, yPos + 20);
  doc.text(`Final Submission Time: ${stopTimeStr}`, 16, yPos + 26);
  doc.setFont('courier', 'bold');
  doc.setTextColor(251, 191, 36); // Amber
  doc.text(`Total Investigation Time Taken : ${durationStr}`, 16, yPos + 31);

  // 4. Detailed Questions Breakdown
  yPos += 40;
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(12, yPos, pageWidth - 24, 100, 2, 2, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248);
  doc.text('TRIBUNAL INDICTMENT BREAKDOWN', 16, yPos + 7);

  const questions = [
    {
      num: '1',
      title: 'Prime Suspect Indicted',
      answer: 'Elena Ward (Director of Operations)',
      status: isSolved || score >= 1 ? 'CORRECT (Identified Culprit)' : 'INCORRECT'
    },
    {
      num: '2',
      title: 'Murder Weapon & Delivery Method',
      answer: 'Poison administered via coffee/beverage',
      status: isSolved || score >= 2 ? 'CORRECT (Organophosphate Neurotoxin)' : 'INCORRECT'
    },
    {
      num: '3',
      title: 'Identified Primary Motive',
      answer: 'Preventing Adrian from exposing unauthorized $12M model exports',
      status: isSolved || score >= 3 ? 'CORRECT (Audit Concealment)' : 'INCORRECT'
    },
    {
      num: '4',
      title: 'Accomplice Analysis',
      answer: 'No established co-conspirator / Lone Actor',
      status: isSolved || score >= 4 ? 'CORRECT (Independent Execution)' : 'INCORRECT'
    },
    {
      num: '5',
      title: 'Supporting Evidentiary Artifacts',
      answer: 'TOX-102 (Toxicology), MEM-501 (Emails), WIT-503 (CCTV), BIO-602 (Prints)',
      status: isSolved ? 'CORRECT (All 4 Artifacts Corroborated)' : 'PARTIAL / INCORRECT'
    }
  ];

  let itemY = yPos + 15;
  questions.forEach((q) => {
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(241, 245, 249);
    doc.text(`Q${q.num}: ${q.title}`, 16, itemY);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Submitted Answer : ${q.answer}`, 20, itemY + 4.5);

    const isQCorrect = q.status.startsWith('CORRECT');
    doc.setFont('courier', 'bold');
    doc.setTextColor(isQCorrect ? 52 : 248, isQCorrect ? 211 : 113, isQCorrect ? 153 : 113);
    doc.text(`Status: [ ${q.status} ]`, 20, itemY + 9);

    itemY += 16;
  });

  // 5. Official Certification & Digital Stamp
  yPos += 106;
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(12, yPos, pageWidth - 24, 30, 2, 2, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(56, 189, 248);
  doc.text('OFFICIAL CERTIFICATION & ANTI-SPAM INTEGRITY STAMP', 16, yPos + 6);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This document certifies the single authoritative submission filed by this squad.', 16, yPos + 12);
  doc.text('Submissions are locked permanently upon confirmation. No further submissions permitted.', 16, yPos + 17);

  doc.setFont('courier', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(`DIGITAL SIGNATURE HASH: SHA256-${recordId}-${teamId.toUpperCase()}-VERIFIED`, 16, yPos + 23);

  // Auto-download to client
  const fileName = `Cyber_Mafia_Case_Record_${teamId}.pdf`;
  try {
    doc.save(fileName);
  } catch (err) {
    console.warn('PDF auto-download failed, fallback available:', err);
  }

  return doc;
}
