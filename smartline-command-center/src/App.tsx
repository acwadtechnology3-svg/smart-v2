import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DriverRequests from "./pages/DriverRequests";
import Drivers from "./pages/Drivers";
import Trips from "./pages/Trips";
import Customers from "./pages/Customers";
import Wallet from "./pages/Wallet";
import Promos from "./pages/Promos";
import Support from "./pages/Support";
import Safety from "./pages/Safety";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/driver-requests" element={<DriverRequests />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/promos" element={<Promos />} />
          <Route path="/support" element={<Support />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
