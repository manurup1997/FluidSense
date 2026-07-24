import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ReliabilityPill } from '../components/ui/ReliabilityPill';
import { eventsInWindow, computeBalance, formatMl, formatMlPlain } from '../lib/calc';
import { computeReliability } from '../lib/reliability';
import { getPeriodRange } from '../lib/period';
import { formatDistanceToNow } from 'date-fns';

type SortKey = 'reliability' | 'output_gap' | 'largest_positive' | 'largest_negative' | 'unmeasured';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'reliability', label: 'Lowest reliability' },
  { value: 'output_gap', label: 'Longest time since output' },
  { value: 'largest_positive', label: 'Largest recorded positive balance' },
  { value: 'largest_negative', label: 'Largest recorded negative balance' },
  { value: 'unmeasured', label: 'Most unmeasured events' },
];

const RELIABILITY_RANK = { Low: 0, Moderate: 1, High: 2 };

export function DashboardPage() {
  const navigate = useNavigate();
  const patients = useStore((s) => s.patients);
  const events = useStore((s) => s.events);
  const weightEvents = useStore((s) => s.weightEvents);
  const setActivePatient = useStore((s) => s.setActivePatient);
  const [sortKey, setSortKey] = useState<SortKey>('reliability');

  const now = useMemo(() => new Date(), []);
  const range = useMemo(() => getPeriodRange('24h', now), [now]);

  const rows = useMemo(() => patients.map((p) => {
    const windowEvents = eventsInWindow(events, p.id, range.start, range.end);
    const balance = computeBalance(windowEvents);
    const reliability = computeReliability(windowEvents, range.label, range.start, range.end);
    const lastIntake = windowEvents.find((e) => e.direction === 'intake');
    const lastOutput = windowEvents.find((e) => e.direction === 'output');
    const lastWeight = weightEvents.filter((w) => w.patientId === p.id).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
    const outputGapMs = lastOutput ? now.getTime() - new Date(lastOutput.eventTime).getTime() : Infinity;
    return { patient: p, balance, reliability, lastIntake, lastOutput, lastWeight, outputGapMs };
  }), [patients, events, weightEvents, range, now]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    switch (sortKey) {
      case 'reliability':
        return arr.sort((a, b) => RELIABILITY_RANK[a.reliability.level] - RELIABILITY_RANK[b.reliability.level]);
      case 'output_gap':
        return arr.sort((a, b) => b.outputGapMs - a.outputGapMs);
      case 'largest_positive':
        return arr.sort((a, b) => b.balance.recordedBalanceMl - a.balance.recordedBalanceMl);
      case 'largest_negative':
        return arr.sort((a, b) => a.balance.recordedBalanceMl - b.balance.recordedBalanceMl);
      case 'unmeasured':
        return arr.sort((a, b) => b.balance.unmeasuredCount - a.balance.unmeasuredCount);
      default:
        return arr;
    }
  }, [rows, sortKey]);

  const openPatient = (id: string) => { setActivePatient(id); navigate('/'); };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Patient dashboard</h1>
        <p className="text-sm text-fog-600">Fictional demo patients · Last 24 hours</p>
      </div>

      <label className="block text-sm font-semibold text-navy-700 max-w-xs">
        Sort by
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="mt-1 w-full rounded-xl border border-navy-900/15 px-3 py-2.5 font-normal bg-white">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map(({ patient, balance, reliability, lastIntake, lastOutput, lastWeight }) => (
          <Card key={patient.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-navy-900">{patient.displayName}</h2>
                <p className="text-xs text-fog-500">{patient.careSetting}</p>
                {patient.monitoringReason && <p className="text-xs text-fog-500">{patient.monitoringReason}</p>}
              </div>
              <ReliabilityPill level={reliability.level} />
            </div>

            <dl className="mt-3 space-y-1.5">
              <Row label="Recorded intake" value={formatMlPlain(balance.totalIntakeMl)} />
              <Row label="Measured output" value={formatMlPlain(balance.measuredOutputMl)} />
              <Row label="Recorded balance" value={formatMl(balance.recordedBalanceMl)} strong />
              <Row label="Unmeasured events" value={String(balance.unmeasuredCount)} />
              <Row label="Last intake" value={lastIntake ? formatDistanceToNow(new Date(lastIntake.eventTime), { addSuffix: true }) : 'None recorded'} />
              <Row label="Last output" value={lastOutput ? formatDistanceToNow(new Date(lastOutput.eventTime), { addSuffix: true }) : 'None recorded'} />
              <Row label="Last weight" value={lastWeight ? `${lastWeight.weightKg} kg` : 'Not recorded'} />
              {patient.allowance && <Row label="Fluid allowance" value={formatMlPlain(patient.allowance.dailyMl)} />}
            </dl>

            <Button fullWidth variant="secondary" className="mt-4" onClick={() => openPatient(patient.id)}>Open patient</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-sm text-fog-600">{label}</dt>
      <dd className={`font-semibold text-navy-900 ${strong ? 'text-base font-bold' : 'text-sm'}`}>{value}</dd>
    </div>
  );
}
