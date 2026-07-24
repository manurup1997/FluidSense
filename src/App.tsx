import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/nav/AppShell';
import { TodayPage } from './pages/TodayPage';
import { AddPage } from './pages/AddPage';
import { IntakeFlowPage } from './pages/IntakeFlowPage';
import { OutputFlowPage } from './pages/OutputFlowPage';
import { VoicePage } from './pages/VoicePage';
import { HistoryPage } from './pages/HistoryPage';
import { SummaryPage } from './pages/SummaryPage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { DrinksPage } from './pages/DrinksPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/add" element={<AddPage />} />
          <Route path="/add/intake" element={<IntakeFlowPage />} />
          <Route path="/add/output" element={<OutputFlowPage />} />
          <Route path="/voice" element={<VoicePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/drinks" element={<DrinksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
