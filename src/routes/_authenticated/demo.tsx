import { createFileRoute } from '@tanstack/react-router';
import { DemoView } from '@/components/safety/demo-view';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/demo')({ head: () => safetyHead('Demo mode', 'A clearly labelled simulated GuardianAI safety alert and emergency walkthrough.'), component: DemoView });
