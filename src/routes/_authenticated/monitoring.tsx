import { createFileRoute } from '@tanstack/react-router';
import { MonitoringView } from '@/components/safety/detail-views';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/monitoring')({ head: () => safetyHead('Behaviour monitoring', 'Live behaviour monitoring with deterministic anomaly scoring and safety checks.'), component: MonitoringView });
