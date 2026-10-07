import { createFileRoute } from '@tanstack/react-router';
import { LocationView } from '@/components/safety/detail-views';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/location')({ head: () => safetyHead('Location', 'Your current location, OpenStreetMap map and saved location history.'), component: LocationView });
