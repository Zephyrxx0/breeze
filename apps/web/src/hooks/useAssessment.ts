import { useQuery } from "@tanstack/react-query";
import type { AssessResponse } from "@breeze/core";

export async function fetchAssessment(lat: number, lon: number): Promise<AssessResponse> {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const res = await fetch(`${apiBase}/api/assess?lat=${lat}&lon=${lon}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch assessment: ${res.statusText}`);
  }
  const data = (await res.json()) as AssessResponse;
  // Zero air data honesty: if air.current is missing, treat as total failure
  if (!data.air?.current) {
    throw new Error("Air quality data temporarily unavailable");
  }
  return data;
}

export function useAssessment(lat: number, lon: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ["assess", lat, lon],
    queryFn: () => fetchAssessment(lat, lon),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    enabled: enabled && !isNaN(lat) && !isNaN(lon),
    refetchOnWindowFocus: false,
  });
}

