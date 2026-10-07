import { createFileRoute } from '@tanstack/react-router';
import { TwinView } from '@/components/safety/detail-views';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/digital-twin')({ head: () => safetyHead('AI Digital Twin', 'Your learned active hours, movement, activity frequency, usual locations and behavioural baseline.'), component: TwinView });
