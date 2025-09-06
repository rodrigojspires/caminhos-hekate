'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Trophy, 
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ChartPeriod = '7d' | '30d' | '90d' | '1y';
type ChartType = 'line' | 'bar' | 'pie';

interface ChartDataPoint {
  date: string;
  points: number;
  achievements: number;
  activities: number;
  level: number;
}

const PERIOD_CONFIG = {
  '7d': { label: '7 dias', days: 7 },
  '30d': { label: '30 dias', days: 30 },
  '90d': { label: '90 dias', days: 90 },
  '1y': { label: '1 ano', days: 365 }
};

const ACHIEVEMENT_COLORS = {
  COMMON: '#6B7280',
  UNCOMMON: '#10B981',
  RARE: '#3B82F6',
  EPIC: '#8B5CF6',
  LEGENDARY: '#F59E0B'
};

export function ProgressChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('30d');
  const [chartType, setChartType] = useState<ChartType>('line');
  
  const {
    userStats,
    recentTransactions,
    achievements,
    isLoadingStats,
    isLoadingAchievements,
    isLoadingPoints,
  } = useGamificationStore();
  const isLoading = isLoadingStats || isLoadingAchievements || isLoadingPoints;

  // Generate mock data for demonstration
  // In a real app, this would come from the API
  const generateChartData = (period: ChartPeriod): ChartDataPoint[] => {
    const days = PERIOD_CONFIG[period].days;
    const data: ChartDataPoint[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dayData: ChartDataPoint = {
        date: format(date, 'dd/MM', { locale: ptBR }),
        points: Math.floor(Math.random() * 50) + 10,
        achievements: Math.floor(Math.random() * 3),
        activities: Math.floor(Math.random() * 5) + 1,
        level: Math.floor(Math.random() * 2) + (userStats?.currentLevel || 1)
      };
      data.push(dayData);
    }
    
    return data;
  };

  const chartData = generateChartData(selectedPeriod);
  
  // Achievement distribution data
  const achievementDistribution = achievements?.reduce((acc, achievement) => {
    const rarity = achievement.rarity;
    acc[rarity] = (acc[rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pieData = Object.entries(achievementDistribution).map(([rarity, count]) => ({
    name: rarity,
    value: count,
    color: ACHIEVEMENT_COLORS[rarity as keyof typeof ACHIEVEMENT_COLORS]
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gráfico de Progresso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-gray-100 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gráfico de Progresso
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('pie')}
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Period Selector */}
            <div className="flex items-center gap-1">
              {Object.entries(PERIOD_CONFIG).map(([period, config]) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period as ChartPeriod)}
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={chartType} className="space-y-4">
          <TabsContent value="line" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    name="Pontos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="achievements" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                    name="Conquistas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bar" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="points" 
                    fill="#3B82F6" 
                    name="Pontos"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="activities" 
                    fill="#10B981" 
                    name="Atividades"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="pie" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Pontos Totais</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {chartData.reduce((sum, day) => sum + day.points, 0).toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Conquistas</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {chartData.reduce((sum, day) => sum + day.achievements, 0)}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Atividades</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {chartData.reduce((sum, day) => sum + day.activities, 0)}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Período</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {PERIOD_CONFIG[selectedPeriod].days}d
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProgressChart;
