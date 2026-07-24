import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { PrototypeBanner } from '../ui/PrototypeBanner';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { ModeSwitcher } from './ModeSwitcher';
import { PatientSwitcher } from './PatientSwitcher';
import { useStore } from '../../store/useStore';

export function AppShell() {
  const mode = useStore((s) => s.mode);
  const accessibility = useStore((s) => s.currentUser.accessibility);

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', accessibility.largeText);
    document.documentElement.classList.toggle('high-contrast', accessibility.highContrast);
    document.documentElement.classList.toggle('reduce-motion', accessibility.reduceMotion);
  }, [accessibility]);

  return (
    <div className="min-h-dvh flex flex-col bg-fog-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow">
        Skip to main content
      </a>
      <PrototypeBanner />
      <div className="flex flex-1 min-h-0">
        {mode === 'healthcare' && <Sidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 bg-fog-50/95 backdrop-blur border-b border-navy-900/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-navy-900 tracking-tight md:hidden">FluidSense</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <PatientSwitcher />
              <ModeSwitcher />
            </div>
          </header>
          <main id="main-content" className="flex-1 px-4 pt-4 pb-28 md:pb-10 max-w-3xl w-full mx-auto md:mx-0 md:max-w-none">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
