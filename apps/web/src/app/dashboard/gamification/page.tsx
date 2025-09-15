import { Metadata } from 'next';
import { GamificationDashboard } from '@/components/gamification/dashboard/GamificationDashboard';

export const metadata: Metadata = {
  title: 'Gamificação | Minha Escola',
  description: 'Acompanhe seu progresso, conquistas e ranking no sistema de gamificação.'
};

export default function GamificationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gamificação</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso, conquistas e posição no ranking
          </p>
        </div>
      </div>
      
      <GamificationDashboard />
    </div>
  );
}
