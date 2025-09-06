import { Metadata } from 'next';
import { CalendarIntegrations } from '@/components/calendar/CalendarIntegrations';

export const metadata: Metadata = {
  title: 'Integrações de Calendário | Caminhos de Hekate',
  description: 'Gerencie suas integrações com calendários externos como Google Calendar e Outlook.',
};

export default function CalendarIntegrationsPage() {
  return (
    <div className="container mx-auto py-6">
      <CalendarIntegrations />
    </div>
  )
}