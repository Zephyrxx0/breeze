import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRoute } from "./lib/route";
import { Landing } from "./views/Landing";

// The dashboard (charts, map, share card) is a separate chunk so the landing page stays tiny.
const MainView = lazy(() => import("./views/MainView").then((m) => ({ default: m.MainView })));

const queryClient = new QueryClient();

function AppFallback() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading Breeze">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
    </div>
  );
}

export function App() {
  const route = useRoute();
  return (
    <QueryClientProvider client={queryClient}>
      {route === "landing" ? (
        <Landing />
      ) : (
        <Suspense fallback={<AppFallback />}>
          <MainView />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

export default App;
