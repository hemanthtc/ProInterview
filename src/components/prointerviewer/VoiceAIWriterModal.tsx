import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Sparkles, X, RotateCcw, Volume2 } from 'lucide-react';

interface VoiceAIWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (text: string) => void;
  title: string;
  section: 'workExperience' | 'projects' | 'customSections';
  top: number;
  left: number;
  right: number;
}

export const VoiceAIWriterModal: React.FC<VoiceAIWriterModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  title,
  section,
  top,
  left,
  right,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Position calculation variables
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const popupWidth = 450;
  const popupHeight = 420;

  let leftPos = isMobile ? (window.innerWidth - Math.min(window.innerWidth - 32, 450)) / 2 : right + 10;
  let topPos = isMobile ? (window.innerHeight - popupHeight) / 2 : top;

  if (!isMobile) {
    if (leftPos + popupWidth > window.innerWidth) {
      leftPos = Math.max(10, left - popupWidth - 10);
    }
    if (topPos + popupHeight > window.innerHeight) {
      topPos = Math.max(10, window.innerHeight - popupHeight - 20);
    }
  }

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line
      setPosition({ x: leftPos, y: topPos });
    } else {
      setPosition(null);
    }
  }, [isOpen, leftPos, topPos]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const currentX = position ? position.x : leftPos;
    const currentY = position ? position.y : topPos;

    dragStartRef.current = {
      clientX,
      clientY,
      posX: currentX,
      posY: currentY
    };
    setIsDragging(true);

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      let moveClientX = 0;
      let moveClientY = 0;
      if ('touches' in moveEvent) {
        if (moveEvent.touches.length === 0) return;
        moveClientX = moveEvent.touches[0].clientX;
        moveClientY = moveEvent.touches[0].clientY;
      } else {
        moveClientX = moveEvent.clientX;
        moveClientY = moveEvent.clientY;
      }

      const dx = moveClientX - dragStartRef.current.clientX;
      const dy = moveClientY - dragStartRef.current.clientY;

      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy
      });
    };

    const handleDragEnd = () => {
      dragStartRef.current = null;
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (dragStartRef.current || isDragging) return;
      const target = e.target as HTMLElement | null;
      if (cardRef.current && target && !cardRef.current.contains(target)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen, onClose, isDragging]);

  const recognitionRef = useRef<any>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Voice recording/Speech recognition is not supported in this browser. Please use Chrome, Safari or Edge.");
      return;
    }

    try {
      stopRecordingInstance();

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            // Can display interim results if needed
          }
        }
        if (finalTranscript) {
          setTranscript(prev => {
            const trimmedPrev = prev.trim();
            const trimmedFinal = finalTranscript.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedFinal}` : trimmedFinal;
          });
        }
      };

      rec.onerror = (e: any) => {
        const errorType = e.error || '';
        console.error("Speech recognition error event:", errorType, e);
        
        // Ignore aborted and no-speech as they are part of normal interaction flow
        if (errorType === 'aborted' || errorType === 'no-speech') {
          setIsListening(false);
          return;
        }

        if (errorType === 'not-allowed') {
          setErrorMessage("Microphone permission denied. Please enable microphone permissions in your browser settings.");
        } else if (errorType === 'audio-capture') {
          setErrorMessage("No microphone detected. Please plug in a microphone and try again.");
        } else {
          setErrorMessage(`Voice input error: ${errorType || 'Unknown error'}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error("Failed to start SpeechRecognition:", e);
      setErrorMessage("Could not start microphone recorder.");
    }
  };

  const stopRecordingInstance = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // 1. Initialize SpeechSynthesis (Text-to-Speech)
    const speakPrompt = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        // Fallback directly to Speech Recognition if TTS is not supported
        setTimeout(() => startRecording(), 0);
        return;
      }

      window.speechSynthesis.cancel(); // Halt previous speech

      const cleanTitle = title.replace(/[•\n]/g, ' ').trim();
      const promptText = `${cleanTitle}. Please explain what you did in this role and how it worked.`;
      const utterance = new SpeechSynthesisUtterance(promptText);
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        setTtsSpeaking(true);
      };

      utterance.onend = () => {
        setTtsSpeaking(false);
        startRecording();
      };

      utterance.onerror = () => {
        setTtsSpeaking(false);
        startRecording(); // fallback
      };

      // Find standard English voice
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
    };

    // Chrome requires a small delay or user interaction sometimes for voices to load
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.getVoices().length > 0) {
        speakPrompt();
      } else {
        window.speechSynthesis.onvoiceschanged = speakPrompt;
      }
    } else {
      setTimeout(() => startRecording(), 0);
    }

    // Clean up
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopRecordingInstance();
    };
  }, [isOpen, title]);

  const toggleRecording = () => {
    if (isListening) {
      stopRecordingInstance();
      setIsListening(false);
    } else {
      startRecording();
    }
  };

  const handleReset = () => {
    stopRecordingInstance();
    setTranscript('');
    setErrorMessage(null);
    startRecording();
  };

  const handleGenerate = async () => {
    stopRecordingInstance();
    setIsListening(false);

    if (!transcript.trim()) {
      setErrorMessage("Please speak or write an explanation before generating.");
      return;
    }

    setIsAiGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/generate-resume-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          topic: title,
          explanation: transcript
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate professional description.");
      }

      const data = await res.json();
      onGenerate(data.description || '');
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred while writing with AI.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'transparent',
        zIndex: 9999,
        pointerEvents: 'none',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }} 
      className="no-print"
    >
      <div 
        ref={cardRef}
        style={{
          position: 'fixed',
          top: position ? `${position.y}px` : `${topPos}px`,
          left: position ? `${position.x}px` : `${leftPos}px`,
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: isMobile ? `calc(100% - 32px)` : `${popupWidth}px`,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          pointerEvents: 'auto'
        }}
      >
        {/* Header */}
        <div 
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#8b5cf6' }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>Write with AI Voice</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '4px',
            display: 'inline-flex',
            borderRadius: '50%'
          }} onMouseEnter={(e) => e.currentTarget.style.color = '#374151'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Target Entry</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#374151' }}>{title}</div>
          </div>

          {/* Voice Prompt Status Indicator */}
          {ttsSpeaking ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#f5f3ff',
              border: '1px solid #ddd6fe',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#6d28d9',
              fontSize: '0.85rem'
            }}>
              <Volume2 size={18} className="animate-bounce" />
              <span>Prompting: <strong>Listening begins as soon as speech finishes...</strong></span>
            </div>
          ) : null}

          {/* Recording Circle Visualizer */}
          {!isAiGenerating && !ttsSpeaking && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '0.5rem 0' }}>
              <button
                onClick={toggleRecording}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isListening 
                    ? '0 0 0 8px rgba(239, 68, 68, 0.2), 0 0 0 16px rgba(239, 68, 68, 0.1)' 
                    : '0 4px 6px -1px rgba(139, 92, 246, 0.2)',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                className={isListening ? 'animate-pulse' : ''}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isListening ? '#ef4444' : '#6b7280' }}>
                {isListening ? "Listening... click to stop" : "Microphone active. Click to record"}
              </span>
            </div>
          )}

          {/* Transcript Output Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Spoken Explanation</div>
              {transcript && !isAiGenerating && (
                <button 
                  onClick={handleReset} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#4b5563',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <RotateCcw size={12} /> Clear & Restart
                </button>
              )}
            </div>
            
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={isAiGenerating || ttsSpeaking}
              placeholder={isListening ? "Speak now... what you did in this role, challenges you faced..." : "Your spoken response will appear here in real time. You can also edit it before generating."}
              style={{
                width: '100%',
                height: '110px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                padding: '0.75rem',
                fontSize: '0.9rem',
                color: '#1f2937',
                resize: 'none',
                backgroundColor: isAiGenerating ? '#f3f4f6' : '#ffffff',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 500
            }}>
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            paddingTop: '1rem',
            marginTop: '0.25rem'
          }}>
            <button
              onClick={onClose}
              disabled={isAiGenerating}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isAiGenerating || ttsSpeaking || !transcript.trim()}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: (isAiGenerating || ttsSpeaking || !transcript.trim()) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: (isAiGenerating || ttsSpeaking || !transcript.trim()) ? 0.65 : 1,
                boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)'
              }}
            >
              {isAiGenerating ? (
                <>
                  <svg className="animate-spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M4 12a8 8 0 0 1 8-8" />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate Description</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
