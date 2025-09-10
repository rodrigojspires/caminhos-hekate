'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Flame,
  CheckCircle,
  X,
  Info
} from 'lucide-react';
import { UserStreak } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  isBefore,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StreakCalendarProps {
  streak?: UserStreak | null;
  activityDates?: Date[];
  className?: string;
  showStats?: boolean;
  compact?: boolean;
}

interface DayActivity {
  date: Date;
  hasActivity: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  dayOfWeek: number;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function StreakCalendar({ 
  streak, 
  activityDates = [], 
  className, 
  showStats = true,
  compact = false 
}: StreakCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(date => ({
      date,
      hasActivity: activityDates.some(activityDate => isSameDay(date, activityDate)),
      isToday: isToday(date),
      isCurrentMonth: date >= monthStart && date <= monthEnd,
      dayOfWeek: date.getDay()
    }));
  }, [currentDate, activityDates, calendarStart, calendarEnd, monthStart, monthEnd]);
  
  const stats = useMemo(() => {
    const currentMonth = calendarDays.filter(day => day.isCurrentMonth);
    const activeDays = currentMonth.filter(day => day.hasActivity).length;
    const totalDays = currentMonth.length;
    const completionRate = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;
    
    // Calculate current streak from activity dates
    const sortedDates = [...activityDates].sort((a, b) => b.getTime() - a.getTime());
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    for (const activityDate of sortedDates) {
      const activityDay = new Date(activityDate);
      activityDay.setHours(0, 0, 0, 0);
      
      if (isSameDay(activityDay, checkDate)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (isBefore(activityDay, checkDate)) {
        break;
      }
    }
    
    return {
      activeDays,
      totalDays,
      completionRate,
      currentStreak: streak?.currentStreak || currentStreak
    };
  }, [calendarDays, activityDates, streak]);
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };
  
  const getDayClassName = (day: DayActivity) => {
    const baseClasses = cn(
      'aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer',
      compact ? 'text-xs' : 'text-sm'
    );
    
    if (!day.isCurrentMonth) {
      return cn(baseClasses, 'text-gray-300 hover:text-gray-400');
    }
    
    if (day.isToday && day.hasActivity) {
      return cn(baseClasses, 'bg-green-500 text-white ring-2 ring-green-200 shadow-lg');
    }
    
    if (day.isToday) {
      return cn(baseClasses, 'bg-blue-100 text-blue-700 ring-2 ring-blue-200');
    }
    
    if (day.hasActivity) {
      return cn(baseClasses, 'bg-green-100 text-green-700 hover:bg-green-200');
    }
    
    return cn(baseClasses, 'text-gray-600 hover:bg-gray-100');
  };
  
  const getDayIcon = (day: DayActivity) => {
    if (day.hasActivity) {
      return <CheckCircle className={cn('w-3 h-3', compact ? 'w-2 h-2' : 'w-3 h-3')} />;
    }
    
    if (day.isToday) {
      return <div className={cn('w-2 h-2 bg-current rounded-full', compact ? 'w-1 h-1' : 'w-2 h-2')} />;
    }
    
    return null;
  };
  
  return (
    <Card className={className}>
      {!compact && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário de Atividades
            </CardTitle>
            
            {showStats && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Flame className="h-3 w-3 mr-1" />
                  {stats.currentStreak} dias
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats.completionRate.toFixed(0)}% do mês
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={cn('space-y-4', compact && 'p-4')}>
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map(day => (
              <div 
                key={day} 
                className={cn(
                  'text-center font-medium text-gray-500',
                  compact ? 'text-xs py-1' : 'text-sm py-2'
                )}
              >
                {compact ? day.slice(0, 1) : day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={getDayClassName(day)}
                title={`${format(day.date, 'dd/MM/yyyy')} - ${day.hasActivity ? 'Atividade realizada' : 'Sem atividade'}`}
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <span>{format(day.date, 'd')}</span>
                  {getDayIcon(day)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Stats Summary */}
        {showStats && !compact && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-lg font-bold text-green-600">
                  {stats.activeDays}
                </span>
              </div>
              <p className="text-xs text-gray-600">Dias ativos</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="h-4 w-4 text-orange-600" />
                <span className="text-lg font-bold text-orange-600">
                  {stats.currentStreak}
                </span>
              </div>
              <p className="text-xs text-gray-600">Sequência atual</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-lg font-bold text-blue-600">
                  {stats.completionRate.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-gray-600">Taxa mensal</p>
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 rounded border" />
            <span>Com atividade</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded border" />
            <span>Sem atividade</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 rounded border" />
            <span>Hoje</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StreakCalendar;