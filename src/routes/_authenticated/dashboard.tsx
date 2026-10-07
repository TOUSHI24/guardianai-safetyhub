import { createFileRoute } from '@tanstack/react-router';
import { DashboardView } from '@/components/safety/dashboard-view';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/dashboard')({ head: () => safetyHead('Safety overview', 'Your personal safety status, behavioural risk, location, trusted contacts and emergency SOS.'), component: DashboardView });
