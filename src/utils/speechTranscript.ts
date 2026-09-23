/**
 * Utility for assembling Web Speech API recognition results into text
 * without duplicate words or compounding interim updates.
 */

export interface SpeechTranscriptItem {
  isFinal?: boolean;
  [key: number]: { transcript: string } | undefined;
}

export interface AssembleSpeechResult {
  fullText: string;
  finalOnlyText: string;
}

/**
 * Combines existing base text with speech recognition results.
 * Iterates through all items from 0 to results.length deterministically,
 * preventing duplicate word accumulation on successive interim frames.
 */
export function assembleSpeechResults(
  baseText: string = '',
  results: ArrayLike<SpeechTranscriptItem>
): AssembleSpeechResult {
  const finalParts: string[] = [];
  const interimParts: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    if (!item) continue;
    
    const text = item[0]?.transcript?.trim();
    if (!text) continue;

    if (item.isFinal) {
      finalParts.push(text);
    } else {
      interimParts.push(text);
    }
  }

  const base = baseText.trim();
  const finalJoined = finalParts.join(' ');
  const interimJoined = interimParts.join(' ');

  const finalOnlyText = [base, finalJoined].filter(Boolean).join(' ').trim();
  const fullText = [base, finalJoined, interimJoined].filter(Boolean).join(' ').trim();

  return {
    fullText,
    finalOnlyText
  };
}
