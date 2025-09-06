'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp } from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';

interface LevelConfig {
  level: number;
  pointsRequired: number;
  title: string;
  color: string;
  benefits: string[];
}

const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    pointsRequired: 0,
    title: 'Iniciante',
    color: 'bg-gray-500',
    benefits: ['Acesso básico à plataforma']
  },
  {
    level: 2,
    pointsRequired: 100,
    title: 'Explorador',
    color: 'bg-green-500',
    benefits: ['Badge personalizado', 'Acesso a conteúdo exclusivo']
  },
  {
    level: 3,
    pointsRequired: 300,
    title: 'Estudioso',
    color: 'bg-blue-500',
    benefits: ['Desconto em cursos', 'Prioridade no suporte']
  },
  {
    level: 4,
    pointsRequired: 600,
    title: 'Especialista',
    color: 'bg-purple-500',
    benefits: ['Acesso antecipado', 'Mentoria exclusiva']
  },
  {
    level: 5,
    pointsRequired: 1000,
    title: 'Mestre',
    color: 'bg-yellow-500',
    benefits: ['Certificação premium', 'Comunidade VIP']
  },
  {
    level: 6,
    pointsRequired: 1500,
    title: 'Guru',
    color: 'bg-orange-500',
    benefits: ['Acesso total', 'Programa de embaixadores']
  },
  {
    level: 7,
    pointsRequired: 2500,
    title: 'Lenda',
    color: 'bg-red-500',
    benefits: ['Status lendário', 'Benefícios vitalícios']
  }
];

export function LevelProgress() {
  const { userStats } = useGamificationStore();

  if (!userStats) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </CardContent>
      </Card>
    );
  }

  const currentLevel = userStats.currentLevel || 1;
  const totalPoints = userStats.totalPoints || 0;
  
  const currentLevelConfig = LEVEL_CONFIGS.find(config => config.level === currentLevel) || LEVEL_CONFIGS[0];
  const nextLevelConfig = LEVEL_CONFIGS.find(config => config.level === currentLevel + 1);
  
  const currentLevelPoints = currentLevelConfig.pointsRequired;
  const nextLevelPoints = nextLevelConfig?.pointsRequired || currentLevelPoints;
  const pointsForNextLevel = nextLevelPoints - currentLevelPoints;
  const currentProgress = totalPoints - currentLevelPoints;
  const progressPercentage = nextLevelConfig 
    ? Math.min((currentProgress / pointsForNextLevel) * 100, 100)
    : 100;

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-indigo-600" />
          Progresso de Nível
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Level Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${currentLevelConfig.color} flex items-center justify-center text-white font-bold text-lg`}>
              {currentLevel}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{currentLevelConfig.title}</h3>
              <p className="text-sm text-muted-foreground">
                {totalPoints.toLocaleString()} pontos totais
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
            Nível {currentLevel}
          </Badge>
        </div>

        {/* Progress Bar */}
        {nextLevelConfig && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso para o próximo nível</span>
              <span className="font-medium">
                {currentProgress.toLocaleString()} / {pointsForNextLevel.toLocaleString()} pontos
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentLevelConfig.title}</span>
              <span>{nextLevelConfig.title}</span>
            </div>
          </div>
        )}

        {/* Next Level Benefits */}
        {nextLevelConfig && (
          <div className="bg-white/50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-sm">Próximo nível: {nextLevelConfig.title}</span>
            </div>
            <div className="space-y-1">
              {nextLevelConfig.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-indigo-600 mt-2 font-medium">
              Faltam {(nextLevelPoints - totalPoints).toLocaleString()} pontos
            </p>
          </div>
        )}

        {/* Current Level Benefits */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm text-green-800">Benefícios atuais</span>
          </div>
          <div className="space-y-1">
            {currentLevelConfig.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-green-700">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LevelProgress;