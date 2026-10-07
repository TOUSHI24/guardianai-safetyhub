import { createFileRoute } from '@tanstack/react-router';
import { ContactsView } from '@/components/safety/contacts-view';
import { safetyHead } from '@/lib/safety-meta';
export const Route = createFileRoute('/_authenticated/contacts')({ head: () => safetyHead('Trusted contacts', 'Manage your trusted contacts, primary contact and emergency email notifications.'), component: ContactsView });
