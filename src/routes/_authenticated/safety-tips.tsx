import { createFileRoute } from '@tanstack/react-router';
import { TipsView } from '@/components/safety/tips-view';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/safety-tips')({ head: () => safetyHead('Safety tips', 'Practical advice for travel, night journeys, public spaces, online safety and digital privacy.'), component: TipsView });
