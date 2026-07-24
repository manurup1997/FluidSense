import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseVoiceTranscript, type ParsedEntry } from '../lib/voiceParser';
import { useStore } from '../store/useStore';
import { useActivePatient } from '../hooks/useFluidData';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { CATEGORY_LABEL, INTAKE_CATEGORIES, OUTPUT_CATEGORIES } from '../lib/eventMeta';
import type { Direction, MeasurementStatus, FluidCategory, OutputCategory } from '../types';

type ViewState = 'idle' | 'listening' | 'review' | 'summary_prompt';

export function VoicePage() {
  const navigate = useNavigate();
  const patient = useActivePatient();
  const addEvent = useStore((s) => s.addEvent);
  const currentUser = useStore((s) => s.currentUser);
  const events = useStore((s) => s.events);
  const { supported, transcript, error, start, stop, reset } = useSpeechRecognition();

  const [view, setView] = useState<ViewState>('idle');
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const [typedText, setTypedText] = useState('');
  const [editing, setEditing] = useState(false);

  const runParse = (text: string) => {
    if (!text.trim()) return;
    const result = parseVoiceTranscript(text);
    if (result.kind === 'summary_request') {
      setView('summary_prompt');
      return;
    }
    setParsed(result);
    setView('review');
  };

  const handleStart = () => {
    reset();
    setView('listening');
    start();
  };

  const handleStop = () => {
    stop();
    runParse(transcript);
  };

  const cancelAll = () => {
    setView('idle');
    setParsed(null);
    reset();
    setTypedText('');
    setEditing(false);
  };

  const confirmSave = () => {
    if (!parsed || !patient || !parsed.category || !parsed.direction) return;
    addEvent({
      patientId: patient.id,
      direction: parsed.direction,
      category: parsed.category,
      subtype: parsed.subtype,
      amountMl: parsed.amountMl,
      unit: 'mL',
      status: parsed.status ?? 'unmeasured',
      episodeCount: parsed.episodeCount,
      eventTime: new Date().toISOString(),
      enteredBy: currentUser.displayName,
      inputMethod: 'voice',
      transcript: parsed.transcript,
      note: parsed.note,
    });
    cancelAll();
    navigate('/');
  };

  // duplicate detection against last 5 minutes of matching events
  const possibleDuplicate = parsed && patient
    ? events.find((e) => !e.deleted && e.patientId === patient.id && e.category === parsed.category && e.direction === parsed.direction && e.amountMl === parsed.amountMl && Math.abs(new Date().getTime() - new Date(e.eventTime).getTime()) < 5 * 60 * 1000)
    : undefined;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Voice entry</h1>
        <p className="text-sm text-fog-600">Nothing is saved until you confirm it.</p>
      </div>

      {view === 'idle' && (
        <>
          <Card className="p-6 flex flex-col items-center text-center gap-4">
            <button
              onClick={handleStart}
              disabled={!supported}
              aria-label="Speak an entry"
              className="w-28 h-28 rounded-full bg-intake-600 text-white text-4xl flex items-center justify-center shadow-lg hover:bg-intake-700 disabled:opacity-40"
            >
              🎙️
            </button>
            <p className="font-bold text-navy-900">Speak an entry</p>
            {!supported && <p className="text-sm text-amber-700">Speech recognition isn't available in this browser — use the text box below instead.</p>}
            {error && <p className="text-sm text-alert-600" role="alert">{error}</p>}
          </Card>

          <Card className="p-5">
            <label className="block text-sm font-bold text-navy-800 mb-2" htmlFor="voice-text-fallback">
              Type an entry in your own words
            </label>
            <textarea
              id="voice-text-fallback"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              rows={3}
              placeholder='e.g. "I finished my 500 mL bottle of water"'
              className="w-full rounded-xl border border-navy-900/15 px-3 py-2.5"
            />
            <Button fullWidth className="mt-3" disabled={!typedText.trim()} onClick={() => runParse(typedText)}>Process entry</Button>
          </Card>

          <ExampleList />
        </>
      )}

      {view === 'listening' && (
        <Card className="p-6 flex flex-col items-center text-center gap-4" role="status" aria-live="polite">
          <div className="w-28 h-28 rounded-full bg-intake-100 flex items-center justify-center relative">
            <span className="absolute inset-0 rounded-full bg-intake-300/50 animate-ping" aria-hidden="true" />
            <span className="text-4xl relative">🎙️</span>
          </div>
          <p className="font-bold text-navy-900">Listening…</p>
          <p className="text-sm text-fog-600 min-h-6">{transcript || 'Say your entry now'}</p>
          <Button onClick={handleStop}>Done speaking</Button>
        </Card>
      )}

      {view === 'summary_prompt' && (
        <Card className="p-6 text-center space-y-4">
          <p className="font-bold text-navy-900">That sounded like a request for a summary.</p>
          <Button fullWidth onClick={() => navigate('/summary')}>Go to last-24-hours summary</Button>
          <Button fullWidth variant="ghost" onClick={cancelAll}>Cancel</Button>
        </Card>
      )}

      {view === 'review' && parsed && (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-fog-500 mb-1">We heard</p>
            <p className="text-navy-900 italic">"{parsed.transcript}"</p>
          </Card>

          <Card className="p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fog-500">Proposed entry</p>
            {!editing ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-navy-900">
                    {parsed.category ? CATEGORY_LABEL[parsed.category] : 'Unclear entry'} ({parsed.direction ?? '?'})
                  </span>
                  {parsed.status && <StatusBadge status={parsed.status} />}
                </div>
                <p className="text-2xl font-extrabold text-navy-900">
                  {parsed.amountMl != null ? `${Math.round(parsed.amountMl)} mL` : 'No volume'}
                </p>
                {parsed.episodeCount && <p className="text-sm text-fog-600">{parsed.episodeCount} episode(s)</p>}
                <p className="text-sm text-fog-600">Time: now</p>
              </>
            ) : (
              <EditProposed parsed={parsed} onChange={setParsed} />
            )}

            {(parsed.warnings.length > 0 || possibleDuplicate) && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1">
                <p className="text-sm font-bold text-amber-700">Please check this entry</p>
                {parsed.warnings.map((w, i) => <p key={i} className="text-sm text-amber-700">{w}</p>)}
                {possibleDuplicate && <p className="text-sm text-amber-700">This looks similar to an entry recorded a few minutes ago. Please confirm it isn't a duplicate.</p>}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setEditing((v) => !v)}>{editing ? 'Done editing' : 'Edit'}</Button>
            <Button variant="secondary" onClick={handleStart}>Try again</Button>
            <Button variant="ghost" onClick={cancelAll}>Cancel</Button>
            <Button disabled={!parsed.category || !parsed.direction} onClick={confirmSave}>Confirm</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditProposed({ parsed, onChange }: { parsed: ParsedEntry; onChange: (p: ParsedEntry) => void }) {
  const categories = parsed.direction === 'output' ? OUTPUT_CATEGORIES : INTAKE_CATEGORIES;
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-navy-700">
        Direction
        <select value={parsed.direction ?? ''} onChange={(e) => onChange({ ...parsed, direction: e.target.value as Direction })} className="mt-1 w-full rounded-xl border border-navy-900/15 px-3 py-2 font-normal">
          <option value="intake">Intake</option>
          <option value="output">Output</option>
        </select>
      </label>
      <label className="block text-sm font-semibold text-navy-700">
        Type
        <select value={parsed.category ?? ''} onChange={(e) => onChange({ ...parsed, category: e.target.value as FluidCategory | OutputCategory })} className="mt-1 w-full rounded-xl border border-navy-900/15 px-3 py-2 font-normal">
          {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-navy-700">
        Volume (mL) — leave blank if unmeasured
        <input inputMode="decimal" value={parsed.amountMl ?? ''} onChange={(e) => onChange({ ...parsed, amountMl: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1 w-full rounded-xl border border-navy-900/15 px-3 py-2 font-normal" />
      </label>
      <label className="block text-sm font-semibold text-navy-700">
        Status
        <select value={parsed.status ?? 'unmeasured'} onChange={(e) => onChange({ ...parsed, status: e.target.value as MeasurementStatus })} className="mt-1 w-full rounded-xl border border-navy-900/15 px-3 py-2 font-normal">
          <option value="measured">Measured</option>
          <option value="container_estimated">Container estimate</option>
          <option value="approximate">Approximate</option>
          <option value="unmeasured">Unmeasured</option>
        </select>
      </label>
    </div>
  );
}

function ExampleList() {
  const examples = [
    'I just drank half a cup of coffee.',
    'I finished my 500 mL bottle of water.',
    'The patient passed 450 mL of urine.',
    'I went to the toilet but did not measure the urine.',
    'The patient had two episodes of watery diarrhoea.',
    'Summarise my fluid balance for the last 24 hours.',
  ];
  return (
    <Card className="p-5">
      <p className="text-sm font-bold text-navy-800 mb-2">Try saying something like…</p>
      <ul className="text-sm text-fog-600 space-y-1.5 list-disc list-inside">
        {examples.map((e) => <li key={e}>"{e}"</li>)}
      </ul>
    </Card>
  );
}
