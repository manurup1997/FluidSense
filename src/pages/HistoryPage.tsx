import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useActivePatient } from '../hooks/useFluidData';
import { Card } from '../components/ui/Card';
import { EventRow } from '../components/EventRow';
import { EditEventModal } from '../components/EditEventModal';
import type { FluidEvent } from '../types';

type DirectionFilter = 'all' | 'intake' | 'output' | 'unmeasured';
type StatusFilter = 'all' | 'measured' | 'estimated';
type MethodFilter = 'all' | 'voice' | 'manual';

export function HistoryPage() {
  const patient = useActivePatient();
  const events = useStore((s) => s.events);
  const [editing, setEditing] = useState<FluidEvent | null>(null);

  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [method, setMethod] = useState<MethodFilter>('all');
  const [enteredBy, setEnteredBy] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const patientEvents = useMemo(
    () => events.filter((e) => !e.deleted && e.patientId === patient?.id).sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()),
    [events, patient]
  );

  const recorders = useMemo(() => Array.from(new Set(patientEvents.map((e) => e.enteredBy))), [patientEvents]);

  const filtered = useMemo(() => patientEvents.filter((e) => {
    if (direction === 'intake' && e.direction !== 'intake') return false;
    if (direction === 'output' && e.direction !== 'output') return false;
    if (direction === 'unmeasured' && e.status !== 'unmeasured') return false;
    if (status === 'measured' && e.status !== 'measured') return false;
    if (status === 'estimated' && !(e.status === 'container_estimated' || e.status === 'approximate')) return false;
    if (method === 'voice' && e.inputMethod !== 'voice') return false;
    if (method === 'manual' && e.inputMethod === 'voice') return false;
    if (enteredBy !== 'all' && e.enteredBy !== enteredBy) return false;
    if (from && new Date(e.eventTime) < new Date(from)) return false;
    if (to && new Date(e.eventTime) > new Date(to)) return false;
    return true;
  }), [patientEvents, direction, status, method, enteredBy, from, to]);

  if (!patient) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">History</h1>
        <p className="text-sm text-fog-600">{patient.displayName} · audit-style event log</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FilterSelect label="Direction" value={direction} onChange={(v) => setDirection(v as DirectionFilter)} options={[
            ['all', 'All entries'], ['intake', 'Intake'], ['output', 'Output'], ['unmeasured', 'Unmeasured events'],
          ]} />
          <FilterSelect label="Status" value={status} onChange={(v) => setStatus(v as StatusFilter)} options={[
            ['all', 'All statuses'], ['measured', 'Measured'], ['estimated', 'Estimated'],
          ]} />
          <FilterSelect label="Input method" value={method} onChange={(v) => setMethod(v as MethodFilter)} options={[
            ['all', 'All methods'], ['voice', 'Voice entries'], ['manual', 'Manual / tap entries'],
          ]} />
          <FilterSelect label="Recorded by" value={enteredBy} onChange={setEnteredBy} options={[['all', 'Everyone'], ...recorders.map((r) => [r, r] as [string, string])]} />
          <label className="text-xs font-semibold text-navy-700">
            From
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-navy-900/15 px-2 py-2 text-sm font-normal" />
          </label>
          <label className="text-xs font-semibold text-navy-700">
            To
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-navy-900/15 px-2 py-2 text-sm font-normal" />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm text-fog-500 mb-2">{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</p>
        {filtered.length === 0 ? (
          <p className="text-sm text-fog-600">No entries match these filters.</p>
        ) : (
          <ul>
            {filtered.map((e) => <EventRow key={e.id} event={e} onEdit={setEditing} />)}
          </ul>
        )}
      </Card>

      {editing && <EditEventModal event={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="text-xs font-semibold text-navy-700">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-navy-900/15 px-2 py-2 text-sm font-normal bg-white">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
