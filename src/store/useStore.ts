import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  AppUser, Mode, PatientProfile, FluidProfile, FluidEvent, WeightEvent, SymptomEvent,
  SavedContainer, EditRecord, Reminder, FluidAllowance, Role, AccessibilityPrefs,
} from '../types';
import { patients as demoPatients, fluidProfiles as demoFluidProfiles, demoEvents, demoWeightEvents, PATIENT_HOME_ID } from '../lib/demoData';

// Persistence is intentionally routed only through this store (never direct
// localStorage access from components) so a real backend such as Supabase can
// later replace the `persist` middleware without touching the UI layer.

interface StoreState {
  currentUser: AppUser;
  mode: Mode;
  activePatientId: string;
  patients: PatientProfile[];
  fluidProfiles: FluidProfile[];
  events: FluidEvent[];
  weightEvents: WeightEvent[];
  symptomEvents: SymptomEvent[];

  setMode: (mode: Mode) => void;
  setActivePatient: (patientId: string) => void;
  setUserRole: (role: Role, displayName?: string) => void;
  setAccessibility: (changes: Partial<AccessibilityPrefs>) => void;

  addEvent: (e: Omit<FluidEvent, 'id' | 'recordedTime'> & { recordedTime?: string }) => FluidEvent;
  updateEvent: (id: string, changes: Partial<FluidEvent>, changedBy: string, reason?: string) => void;
  deleteEvent: (id: string, changedBy: string, reason?: string) => void;

  addFluidProfile: (fp: Omit<FluidProfile, 'id'>) => FluidProfile;
  updateFluidProfile: (id: string, changes: Partial<FluidProfile>) => void;
  toggleFavouriteFluid: (patientId: string, fluidProfileId: string) => void;

  addContainer: (patientId: string, container: Omit<SavedContainer, 'id'>) => SavedContainer;

  setAllowance: (patientId: string, allowance: FluidAllowance) => void;
  updatePatient: (patientId: string, changes: Partial<PatientProfile>) => void;

  addWeightEvent: (w: Omit<WeightEvent, 'id'>) => void;
  addSymptomEvent: (s: Omit<SymptomEvent, 'id'>) => void;

  addReminder: (patientId: string, reminder: Omit<Reminder, 'id'>) => void;
  updateReminder: (patientId: string, reminderId: string, changes: Partial<Reminder>) => void;

  resetDemoData: () => void;
}

const initialUser: AppUser = {
  id: 'demo-user',
  displayName: 'You',
  role: 'patient',
  mode: 'patient',
  accessibility: { largeText: false, highContrast: false, reduceMotion: false },
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentUser: initialUser,
      mode: 'patient',
      activePatientId: PATIENT_HOME_ID,
      patients: demoPatients,
      fluidProfiles: demoFluidProfiles,
      events: demoEvents,
      weightEvents: demoWeightEvents,
      symptomEvents: [],

      setMode: (mode) => {
        const state = get();
        const nextPatient = mode === 'healthcare'
          ? state.patients.find((p) => p.id !== PATIENT_HOME_ID)?.id ?? state.activePatientId
          : PATIENT_HOME_ID;
        set({
          mode,
          activePatientId: nextPatient,
          currentUser: {
            ...state.currentUser,
            mode,
            role: mode === 'healthcare' ? 'nurse' : 'patient',
            displayName: mode === 'healthcare' ? 'Staff Nurse (You)' : 'You',
          },
        });
      },

      setActivePatient: (patientId) => set({ activePatientId: patientId }),

      setUserRole: (role, displayName) => set((s) => ({
        currentUser: { ...s.currentUser, role, displayName: displayName ?? s.currentUser.displayName },
      })),

      setAccessibility: (changes) => set((s) => ({
        currentUser: { ...s.currentUser, accessibility: { ...s.currentUser.accessibility, ...changes } },
      })),

      addEvent: (e) => {
        const event: FluidEvent = { ...e, id: uuid(), recordedTime: e.recordedTime ?? new Date().toISOString() };
        set((s) => ({ events: [event, ...s.events] }));
        return event;
      },

      updateEvent: (id, changes, changedBy, reason) => set((s) => ({
        events: s.events.map((ev) => {
          if (ev.id !== id) return ev;
          const editHistory: EditRecord[] = [...(ev.editHistory ?? [])];
          for (const key of Object.keys(changes) as (keyof FluidEvent)[]) {
            if (changes[key] !== undefined && changes[key] !== ev[key]) {
              editHistory.push({
                time: new Date().toISOString(),
                field: String(key),
                originalValue: String(ev[key] ?? ''),
                updatedValue: String(changes[key]),
                changedBy,
                reason,
              });
            }
          }
          return { ...ev, ...changes, edited: true, editHistory };
        }),
      })),

      deleteEvent: (id, changedBy, reason) => set((s) => ({
        events: s.events.map((ev) => ev.id === id
          ? {
            ...ev,
            deleted: true,
            edited: true,
            editHistory: [...(ev.editHistory ?? []), {
              time: new Date().toISOString(), field: 'deleted', originalValue: 'false', updatedValue: 'true', changedBy, reason,
            }],
          }
          : ev),
      })),

      addFluidProfile: (fp) => {
        const profile: FluidProfile = { ...fp, id: uuid() };
        set((s) => ({ fluidProfiles: [...s.fluidProfiles, profile] }));
        return profile;
      },

      updateFluidProfile: (id, changes) => set((s) => ({
        fluidProfiles: s.fluidProfiles.map((fp) => (fp.id === id ? { ...fp, ...changes } : fp)),
      })),

      toggleFavouriteFluid: (patientId, fluidProfileId) => set((s) => ({
        patients: s.patients.map((p) => {
          if (p.id !== patientId) return p;
          const has = p.favouriteFluidIds.includes(fluidProfileId);
          return {
            ...p,
            favouriteFluidIds: has
              ? p.favouriteFluidIds.filter((id) => id !== fluidProfileId)
              : [...p.favouriteFluidIds, fluidProfileId],
          };
        }),
      })),

      addContainer: (patientId, container) => {
        const c: SavedContainer = { ...container, id: uuid() };
        set((s) => ({
          patients: s.patients.map((p) => (p.id === patientId ? { ...p, containers: [...p.containers, c] } : p)),
        }));
        return c;
      },

      setAllowance: (patientId, allowance) => set((s) => ({
        patients: s.patients.map((p) => (p.id === patientId ? { ...p, allowance } : p)),
      })),

      updatePatient: (patientId, changes) => set((s) => ({
        patients: s.patients.map((p) => (p.id === patientId ? { ...p, ...changes } : p)),
      })),

      addWeightEvent: (w) => set((s) => ({ weightEvents: [{ ...w, id: uuid() }, ...s.weightEvents] })),
      addSymptomEvent: (sy) => set((s) => ({ symptomEvents: [{ ...sy, id: uuid() }, ...s.symptomEvents] })),

      addReminder: (patientId, reminder) => set((s) => ({
        patients: s.patients.map((p) => (p.id === patientId ? { ...p, reminders: [...p.reminders, { ...reminder, id: uuid() }] } : p)),
      })),

      updateReminder: (patientId, reminderId, changes) => set((s) => ({
        patients: s.patients.map((p) => (p.id !== patientId ? p : {
          ...p,
          reminders: p.reminders.map((r) => (r.id === reminderId ? { ...r, ...changes } : r)),
        })),
      })),

      resetDemoData: () => set({
        patients: demoPatients,
        fluidProfiles: demoFluidProfiles,
        events: demoEvents,
        weightEvents: demoWeightEvents,
        symptomEvents: [],
      }),
    }),
    { name: 'fluidsense-store-v1' }
  )
);
