import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import VotingPortal from "./pages/VotingPortal";
import PaymentPortal from "./pages/PaymentPortal";
import ProposalDetail from "./pages/ProposalDetail";
import AccessCenters from "./pages/AccessCenters";

import VoteHistory from "./pages/VoteHistory";
import ParticipationProvider from "./components/ParticipationProvider";
import "./App.css";

function App() {
  return (
    <ParticipationProvider><BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/voting" element={<VotingPortal />} />
        <Route path="/payment" element={<PaymentPortal />} />
        <Route path="/proposal/:id" element={<ProposalDetail />} />
        <Route path="/history" element={<VoteHistory />} />
        <Route path="*" element={<VotingPortal />} />
        <Route path="/access" element={<AccessCenters />} />
      </Routes>
    </BrowserRouter></ParticipationProvider>
  );
}

export default App;