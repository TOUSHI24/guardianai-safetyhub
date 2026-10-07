import { createFileRoute } from '@tanstack/react-router';
import { HistoryView } from '@/components/safety/detail-views';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/history')({ head: () => safetyHead('Emergency and alert history', 'Review emergency events, risk assessments, responses and contact notification status.'), component: HistoryView });
