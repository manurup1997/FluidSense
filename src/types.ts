// FluidSense core data model.
// Kept as plain TS types + localStorage persistence so a backend (e.g. Supabase)
// can be swapped in later without changing the shape consumers rely on.

export type Mode = 'patient' | 'healthcare';

export type Role = 'patient' | 'family_carer' | 'nurse' | 'healthcare_assistant' | 'clinician';

export type Units = 'mL' | 'L';

export interface AccessibilityPrefs {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface AppUser {
  id: string;
  displayName: string;
  role: Role;
  mode: Mode;
  accessibility: AccessibilityPrefs;
}

// --- Measurement status -----------------------------------------------------

export type MeasurementStatus = 'measured' | 'container_estimated' | 'approximate' | 'unmeasured';

export const STATUS_LABEL: Record<MeasurementStatus, string> = {
  measured: 'Measured',
  container_estimated: 'Container estimate',
  approximate: 'Approximate',
  unmeasured: 'Unmeasured',
};

// True numeric statuses that contribute to the recorded numeric balance.
export const NUMERIC_STATUSES: MeasurementStatus[] = ['measured', 'container_estimated', 'approximate'];

// --- Containers & fluid profiles --------------------------------------------

export interface SavedContainer {
  id: string;
  name: string;
  fullVolumeMl: number;
  icon?: string;
  isStandard?: boolean; // true = built-in standard container, not user-created
}

export type ContainerFraction = 0.25 | 0.5 | 0.75 | 1 | number;

export type FluidCategory =
  | 'water' | 'tea' | 'coffee' | 'juice' | 'milk' | 'squash' | 'soup'
  | 'nutritional_drink' | 'ice' | 'enteral_feed' | 'iv_fluid' | 'iv_medication' | 'other_intake';

export type OutputCategory =
  | 'urine' | 'continence' | 'vomit' | 'diarrhoea' | 'stoma' | 'drain' | 'nasogastric' | 'sweating' | 'other_output';

export interface FluidProfile {
  id: string;
  name: string;
  brand?: string;
  category: FluidCategory;
  containerId?: string;
  containerVolumeMl?: number;
  usualServingFraction?: ContainerFraction;
  waterContentPercent?: number;
  waterContentSource?: string;
  verified: boolean; // verified demo profile vs user-created
  favourite: boolean;
  isIv?: boolean;
}

// --- Fluid / output events --------------------------------------------------

export type Direction = 'intake' | 'output';
export type InputMethod = 'tap' | 'manual' | 'voice';

export interface FluidEvent {
  id: string;
  patientId: string;
  direction: Direction;
  category: FluidCategory | OutputCategory;
  subtype?: string; // e.g. 'measured_urine', 'wet_pad_heavy', 'diarrhoea_watery'
  amountMl?: number; // numerical amount if known
  unit: Units;
  status: MeasurementStatus;
  episodeCount?: number; // e.g. diarrhoea episodes
  containerId?: string;
  containerFraction?: ContainerFraction;
  fluidProfileId?: string;
  waterContentPercent?: number;
  estimatedWaterContributionMl?: number;
  eventTime: string; // ISO
  recordedTime: string; // ISO
  enteredBy: string; // display name / role
  inputMethod: InputMethod;
  transcript?: string;
  note?: string;
  edited?: boolean;
  editHistory?: EditRecord[];
  deleted?: boolean;
}

export interface EditRecord {
  time: string;
  field: string;
  originalValue: string;
  updatedValue: string;
  changedBy: string;
  reason?: string;
}

// --- Weight & symptoms -------------------------------------------------------

export interface WeightEvent {
  id: string;
  patientId: string;
  weightKg: number;
  time: string;
  note?: string;
}

export type SymptomSeverity = 'mild' | 'moderate' | 'severe';

export interface SymptomEvent {
  id: string;
  patientId: string;
  symptom: string;
  severity: SymptomSeverity;
  time: string;
  note?: string;
}

// --- Reminders ---------------------------------------------------------------

export type ReminderKind = 'record_drink' | 'record_output' | 'daily_weight' | 'evening_review' | 'check_forgotten';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  enabled: boolean;
  intervalHours?: number;
  lastFiredAt?: string;
  snoozedUntil?: string;
}

// --- Patient profile -----------------------------------------------------------

export interface FluidAllowance {
  dailyMl: number;
  setByName: string;
  setByRole: Role;
  setAt: string;
}

export interface QuickButtonPref {
  id: string;
  kind: 'intake' | 'output';
  category: FluidCategory | OutputCategory;
  label: string;
  fluidProfileId?: string;
  order: number;
  enabled: boolean;
}

export interface PatientProfile {
  id: string;
  displayName: string; // fictional name only
  careSetting: string; // e.g. 'Home', 'Ward 4B', 'ICU'
  monitoringReason?: string;
  allowance?: FluidAllowance;
  monitoringPeriod: 'rolling_24h' | 'shift' | 'since_midnight';
  units: Units;
  favouriteFluidIds: string[];
  containers: SavedContainer[];
  quickButtons: QuickButtonPref[];
  dailyWeightEnabled: boolean;
  reminders: Reminder[];
  contactInstructions?: string;
}

// --- Reliability ---------------------------------------------------------------

export type ReliabilityLevel = 'High' | 'Moderate' | 'Low';

export interface ReliabilityResult {
  periodLabel: string;
  level: ReliabilityLevel;
  reasons: string[];
  unmeasuredEventCount: number;
  documentationGaps: string[];
  unresolvedWarnings: string[];
}

// --- Calculation result ---------------------------------------------------------

export interface BalanceBreakdown {
  measuredIntakeMl: number;
  estimatedIntakeMl: number; // container_estimated + approximate
  totalIntakeMl: number;
  oralIntakeMl: number;
  ivIntakeMl: number;

  measuredOutputMl: number;
  estimatedOutputMl: number;
  totalNumericOutputMl: number;

  recordedBalanceMl: number;

  unmeasuredEvents: FluidEvent[];
  unmeasuredCount: number;
}

export type SummaryPeriod = 'shift' | '6h' | '12h' | '24h' | 'since_midnight' | 'custom';
