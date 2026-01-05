import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GamificationDashboard } from '@/components/gamification/dashboard/GamificationDashboard';

export const metadata: Metadata = {
  title: 'Meu Progresso | Caminhos de Hekate',
  description: 'Acompanhe seu progresso, metas, conquistas e ranking.'
};

export default function GamificationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Progresso</h1>
          <p className="text-muted-foreground">
            Metas ativas, conquistas e evolução da sua jornada.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/gamification/emblemas">Ver emblemas</Link>
        </Button>
      </div>
      
      <GamificationDashboard />
    </div>
  );
}
