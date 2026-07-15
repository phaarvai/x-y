import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import BrowsePage from "@/pages/browse";
import ManufacturerPage from "@/pages/manufacturer";
import BookingPage from "@/pages/booking";
import AIAssistantPage from "@/pages/ai-assistant";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForBusinessPage from "@/pages/for-business";
import BookingConfirmationPage from "@/pages/booking-confirmation";
import ProviderSetupPage from "@/pages/provider-setup";
import { AuthProvider } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/browse" component={BrowsePage} />
      <Route path="/manufacturer/:id" component={ManufacturerPage} />
      <Route path="/booking/:manufacturerId/:machineId" component={BookingPage} />
      <Route path="/ai-assistant" component={AIAssistantPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/for-business" component={ForBusinessPage} />
      <Route path="/booking-confirmation" component={BookingConfirmationPage} />
      <Route path="/provider-setup" component={ProviderSetupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
