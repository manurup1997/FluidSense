import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  onerror: ((event: any) => void) | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setError('Speech recognition is not available in this browser.'); return; }
    setError(null);
    setTranscript('');
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone access was blocked.' : 'Could not hear that — please try again.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => { setTranscript(''); setError(null); }, []);

  return { supported, listening, transcript, error, start, stop, reset, setTranscript };
}
