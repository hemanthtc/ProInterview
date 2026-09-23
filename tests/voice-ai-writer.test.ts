import { describe, it, expect } from 'vitest';
import { assembleSpeechResults } from '../src/utils/speechTranscript';

describe('Voice AI Writer Speech Transcript Assembler', () => {
  it('combines finalized speech recognition results without repeating words', () => {
    // Simulating multiple finalized chunks
    const mockResults = [
      { isFinal: true, 0: { transcript: 'Developed backend APIs' } },
      { isFinal: true, 0: { transcript: 'using Node.js and TypeScript' } }
    ];

    const result = assembleSpeechResults('', mockResults);

    expect(result.finalOnlyText).toBe('Developed backend APIs using Node.js and TypeScript');
    expect(result.fullText).toBe('Developed backend APIs using Node.js and TypeScript');
  });

  it('prevents word duplication across sequential interim events', () => {
    // Frame 1: User says "the", finalized
    const frame1Results = [
      { isFinal: true, 0: { transcript: 'the' } }
    ];
    const frame1 = assembleSpeechResults('', frame1Results);
    expect(frame1.fullText).toBe('the');

    // Frame 2: User starts saying next word "project", interim event arrives
    // Chrome provides results[0] as finalized "the", results[1] as interim "pro"
    const frame2Results = [
      { isFinal: true, 0: { transcript: 'the' } },
      { isFinal: false, 0: { transcript: 'pro' } }
    ];
    const frame2 = assembleSpeechResults('', frame2Results);
    // Should NOT duplicate "the the"
    expect(frame2.fullText).toBe('the pro');
    expect(frame2.finalOnlyText).toBe('the');

    // Frame 3: Another interim update for "project"
    const frame3Results = [
      { isFinal: true, 0: { transcript: 'the' } },
      { isFinal: false, 0: { transcript: 'project' } }
    ];
    const frame3 = assembleSpeechResults('', frame3Results);
    expect(frame3.fullText).toBe('the project');
    expect(frame3.finalOnlyText).toBe('the');

    // Frame 4: Second word finalizes
    const frame4Results = [
      { isFinal: true, 0: { transcript: 'the' } },
      { isFinal: true, 0: { transcript: 'project' } }
    ];
    const frame4 = assembleSpeechResults('', frame4Results);
    expect(frame4.fullText).toBe('the project');
    expect(frame4.finalOnlyText).toBe('the project');
  });

  it('preserves existing base text when dictating additional speech', () => {
    const existingBase = 'Initial draft notes.';
    const mockResults = [
      { isFinal: true, 0: { transcript: 'Added microservice scaling.' } }
    ];

    const result = assembleSpeechResults(existingBase, mockResults);

    expect(result.fullText).toBe('Initial draft notes. Added microservice scaling.');
    expect(result.finalOnlyText).toBe('Initial draft notes. Added microservice scaling.');
  });

  it('handles empty results and whitespace gracefully', () => {
    const emptyResults: any[] = [];
    const result = assembleSpeechResults('', emptyResults);
    expect(result.fullText).toBe('');
    expect(result.finalOnlyText).toBe('');

    const whitespaceResults = [
      { isFinal: true, 0: { transcript: '   ' } }
    ];
    const result2 = assembleSpeechResults('  Existing  ', whitespaceResults);
    expect(result2.fullText).toBe('Existing');
    expect(result2.finalOnlyText).toBe('Existing');
  });
});
