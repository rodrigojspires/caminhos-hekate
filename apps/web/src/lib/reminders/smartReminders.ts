import {
  SmartReminderContext,
  ReminderRule,
  ScheduledReminder,
  ReminderCondition,
  ReminderTiming
} from './types';
import { CalendarEvent, EventInstance } from '../recurrence/types';
import { addMinutes, isBefore, isAfter } from 'date-fns';

export interface WeatherData {
  condition: 'CLEAR' | 'CLOUDY' | 'RAIN' | 'STORM' | 'SNOW' | 'FOG';
  temperature: number;
  precipitation: number;
  windSpeed?: number;
  humidity?: number;
}

export interface TrafficData {
  estimatedTravelTime: number;
  normalTravelTime: number;
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  alternativeRoutes?: {
    name: string;
    duration: number;
    distance: number;
  }[];
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  city?: string;
  country?: string;
}

export class SmartReminderEngine {
  private static instance: SmartReminderEngine;
  private weatherCache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private trafficCache: Map<string, { data: TrafficData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

  private constructor() {}

  static getInstance(): SmartReminderEngine {
    if (!SmartReminderEngine.instance) {
      SmartReminderEngine.instance = new SmartReminderEngine();
    }
    return SmartReminderEngine.instance;
  }

  /**
   * Calcula timing inteligente baseado no contexto
   */
  async calculateSmartTiming(
    event: CalendarEvent | EventInstance,
    baseRule: ReminderRule,
    context: SmartReminderContext
  ): Promise<ReminderTiming> {
    let adjustedTiming = { ...baseRule.timing };

    // Ajustar baseado no clima
    if (context.weather && event.location) {
      adjustedTiming = await this.adjustForWeather(adjustedTiming, context.weather, event);
    }

    // Ajustar baseado no trânsito
    if (context.traffic && context.userLocation && event.location) {
      adjustedTiming = await this.adjustForTraffic(adjustedTiming, context.traffic, event);
    }

    // Ajustar baseado na localização do usuário
    if (context.userLocation && event.location) {
      adjustedTiming = await this.adjustForLocation(adjustedTiming, context.userLocation, event);
    }

    // Ajustar baseado no status do usuário
    if (context.userStatus) {
      adjustedTiming = this.adjustForUserStatus(adjustedTiming, context.userStatus);
    }

    return adjustedTiming;
  }

  /**
   * Ajusta timing baseado nas condições climáticas
   */
  private async adjustForWeather(
    timing: ReminderTiming,
    weather: SmartReminderContext['weather'],
    event: CalendarEvent | EventInstance
  ): Promise<ReminderTiming> {
    if (!weather) return timing;
    const adjustedTiming = { ...timing };

    // Condições que requerem mais tempo de preparação
    const badWeatherConditions = ['RAIN', 'STORM', 'SNOW', 'FOG'];
    
    if (badWeatherConditions.includes(weather.condition as any)) {
      // Adicionar 15-30 minutos extra dependendo da severidade
      let extraMinutes = 15;
      
      if (weather.condition === 'STORM' || weather.condition === 'SNOW') {
        extraMinutes = 30;
      } else if (weather.precipitation > 5) {
        extraMinutes = 20;
      }

      adjustedTiming.value += this.convertToTimingUnit(extraMinutes, 'MINUTES', timing.unit);
      adjustedTiming.description = `${timing.description} (+ ${extraMinutes}min devido ao clima)`;
    }

    // Temperatura extrema
    if (weather.temperature < 5 || weather.temperature > 35) {
      const extraMinutes = 10;
      adjustedTiming.value += this.convertToTimingUnit(extraMinutes, 'MINUTES', timing.unit);
      adjustedTiming.description = `${timing.description} (+ ${extraMinutes}min devido à temperatura)`;
    }

    return adjustedTiming;
  }

  /**
   * Ajusta timing baseado no trânsito
   */
  private async adjustForTraffic(
    timing: ReminderTiming,
    traffic: TrafficData,
    event: CalendarEvent | EventInstance
  ): Promise<ReminderTiming> {
    const adjustedTiming = { ...timing };
    const delayFactor = traffic.estimatedTravelTime / traffic.normalTravelTime;

    if (delayFactor > 1.2) { // 20% mais tempo que o normal
      let extraMinutes = Math.ceil((traffic.estimatedTravelTime - traffic.normalTravelTime) / 60);
      
      // Limitar o ajuste máximo
      extraMinutes = Math.min(extraMinutes, 60);
      
      adjustedTiming.value += this.convertToTimingUnit(extraMinutes, 'MINUTES', timing.unit);
      adjustedTiming.description = `${timing.description} (+ ${extraMinutes}min devido ao trânsito)`;
    }

    return adjustedTiming;
  }

  /**
   * Ajusta timing baseado na distância até o evento
   */
  private async adjustForLocation(
    timing: ReminderTiming,
    userLocation: LocationData,
    event: CalendarEvent | EventInstance
  ): Promise<ReminderTiming> {
    if (!event.location) return timing;

    const adjustedTiming = { ...timing };
    
    try {
      // Calcular distância e tempo de viagem
      const travelTime = await this.calculateTravelTime(userLocation, event.location);
      
      if (travelTime > 30) { // Mais de 30 minutos de viagem
        const bufferMinutes = Math.min(Math.ceil(travelTime * 0.2), 30); // 20% de buffer, máximo 30min
        
        adjustedTiming.value += this.convertToTimingUnit(bufferMinutes, 'MINUTES', timing.unit);
        adjustedTiming.description = `${timing.description} (+ ${bufferMinutes}min para deslocamento)`;
      }
    } catch (error) {
      console.warn('Erro ao calcular tempo de viagem:', error);
    }

    return adjustedTiming;
  }

  /**
   * Ajusta timing baseado no status do usuário
   */
  private adjustForUserStatus(
    timing: ReminderTiming,
    userStatus: SmartReminderContext['userStatus']
  ): ReminderTiming {
    if (!userStatus) return timing;

    const adjustedTiming = { ...timing };

    // Se o usuário não está ativo, enviar lembrete mais cedo
    if (!userStatus.isActive) {
      const extraMinutes = 10;
      adjustedTiming.value += this.convertToTimingUnit(extraMinutes, 'MINUTES', timing.unit);
      adjustedTiming.description = `${timing.description} (+ ${extraMinutes}min - usuário inativo)`;
    }

    // Ajustar baseado na atividade atual
    if (userStatus.currentActivity) {
      const busyActivities = ['meeting', 'call', 'driving', 'workout'];
      
      if (busyActivities.includes(userStatus.currentActivity.toLowerCase())) {
        const extraMinutes = 15;
        adjustedTiming.value += this.convertToTimingUnit(extraMinutes, 'MINUTES', timing.unit);
        adjustedTiming.description = `${timing.description} (+ ${extraMinutes}min - usuário ocupado)`;
      }
    }

    return adjustedTiming;
  }

  /**
   * Avalia condições inteligentes para determinar se deve enviar o lembrete
   */
  async evaluateSmartConditions(
    reminder: ScheduledReminder,
    context: SmartReminderContext
  ): Promise<{ shouldSend: boolean; reason?: string; adjustedTime?: Date }> {
    // Verificar condições climáticas
    if (context.weather) {
      const weatherCheck = this.evaluateWeatherConditions(context.weather);
      if (!weatherCheck.suitable) {
        return {
          shouldSend: false,
          reason: `Condições climáticas inadequadas: ${weatherCheck.reason}`
        };
      }
    }

    // Verificar trânsito severo
    if (context.traffic && context.traffic.congestionLevel === 'SEVERE') {
      // Sugerir envio mais cedo
      const adjustedTime = addMinutes(reminder.scheduledFor, -30);
      
      if (isBefore(adjustedTime, new Date())) {
        return {
          shouldSend: true,
          reason: 'Enviando imediatamente devido ao trânsito severo'
        };
      } else {
        return {
          shouldSend: false,
          reason: 'Reagendado devido ao trânsito severo',
          adjustedTime
        };
      }
    }

    // Verificar se o usuário está muito longe do local
    if (context.userLocation) {
      const locationCheck = await this.evaluateLocationProximity(
        context.userLocation,
        reminder
      );
      
      if (!locationCheck.suitable) {
        return {
          shouldSend: false,
          reason: locationCheck.reason,
          adjustedTime: locationCheck.suggestedTime
        };
      }
    }

    return { shouldSend: true };
  }

  /**
   * Avalia condições climáticas
   */
  private evaluateWeatherConditions(weather: SmartReminderContext['weather']): {
    suitable: boolean;
    reason?: string;
  } {
    if (!weather) return { suitable: true };
    // Condições extremas que podem afetar o evento
    if (weather.condition === 'STORM') {
      return {
        suitable: false,
        reason: 'Tempestade severa'
      };
    }

    if (weather.temperature < -10 || weather.temperature > 45) {
      return {
        suitable: false,
        reason: 'Temperatura extrema'
      };
    }

    if (weather.precipitation > 20) {
      return {
        suitable: false,
        reason: 'Chuva muito intensa'
      };
    }

    return { suitable: true };
  }

  /**
   * Avalia proximidade do usuário ao local do evento
   */
  private async evaluateLocationProximity(
    userLocation: LocationData,
    reminder: ScheduledReminder
  ): Promise<{
    suitable: boolean;
    reason?: string;
    suggestedTime?: Date;
  }> {
    // Implementar lógica de proximidade
    // Por enquanto, sempre retorna adequado
    return { suitable: true };
  }

  /**
   * Obtém dados climáticos para uma localização
   */
  async getWeatherData(location: string): Promise<WeatherData | null> {
    const cacheKey = location;
    const cached = this.weatherCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Implementar integração com API de clima (OpenWeatherMap, etc.)
      // Por enquanto, retorna dados simulados
      const weatherData: WeatherData = {
        condition: 'CLEAR',
        temperature: 22,
        precipitation: 0,
        windSpeed: 5,
        humidity: 60
      };

      this.weatherCache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('Erro ao obter dados climáticos:', error);
      return null;
    }
  }

  /**
   * Obtém dados de trânsito entre duas localizações
   */
  async getTrafficData(
    origin: LocationData,
    destination: string
  ): Promise<TrafficData | null> {
    const cacheKey = `${origin.latitude},${origin.longitude}-${destination}`;
    const cached = this.trafficCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Implementar integração com API de trânsito (Google Maps, etc.)
      // Por enquanto, retorna dados simulados
      const trafficData: TrafficData = {
        estimatedTravelTime: 1800, // 30 minutos
        normalTravelTime: 1500, // 25 minutos
        congestionLevel: 'MODERATE',
        alternativeRoutes: [
          {
            name: 'Rota alternativa 1',
            duration: 1700,
            distance: 15000
          }
        ]
      };

      this.trafficCache.set(cacheKey, {
        data: trafficData,
        timestamp: Date.now()
      });

      return trafficData;
    } catch (error) {
      console.error('Erro ao obter dados de trânsito:', error);
      return null;
    }
  }

  /**
   * Calcula tempo de viagem entre duas localizações
   */
  private async calculateTravelTime(
    origin: LocationData,
    destination: string
  ): Promise<number> {
    const trafficData = await this.getTrafficData(origin, destination);
    return trafficData ? trafficData.estimatedTravelTime / 60 : 30; // Retorna em minutos
  }

  /**
   * Converte tempo entre diferentes unidades
   */
  private convertToTimingUnit(
    value: number,
    fromUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS',
    toUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS'
  ): number {
    if (fromUnit === toUnit) return value;

    // Converter tudo para minutos primeiro
    let minutes = value;
    switch (fromUnit) {
      case 'HOURS': minutes = value * 60; break;
      case 'DAYS': minutes = value * 60 * 24; break;
      case 'WEEKS': minutes = value * 60 * 24 * 7; break;
    }

    // Converter de minutos para a unidade desejada
    switch (toUnit) {
      case 'MINUTES': return minutes;
      case 'HOURS': return minutes / 60;
      case 'DAYS': return minutes / (60 * 24);
      case 'WEEKS': return minutes / (60 * 24 * 7);
      default: return minutes;
    }
  }

  /**
   * Gera recomendações inteligentes para lembretes
   */
  async generateSmartRecommendations(
    event: CalendarEvent | EventInstance,
    userLocation?: LocationData
  ): Promise<{
    recommendedTimings: ReminderTiming[];
    reasons: string[];
  }> {
    const recommendations: ReminderTiming[] = [];
    const reasons: string[] = [];

    // Recomendação baseada no tipo de evento
    if (event.title.toLowerCase().includes('reunião') || 
        event.title.toLowerCase().includes('meeting')) {
      recommendations.push({
        value: 15,
        unit: 'MINUTES',
        description: '15 minutos antes (reunião)'
      });
      reasons.push('Reuniões geralmente precisam de preparação prévia');
    }

    // Recomendação baseada na localização
    if (event.location && userLocation) {
      try {
        const travelTime = await this.calculateTravelTime(userLocation, event.location);
        
        if (travelTime > 15) {
          recommendations.push({
            value: Math.ceil(travelTime + 15),
            unit: 'MINUTES',
            description: `${Math.ceil(travelTime + 15)} minutos antes (incluindo deslocamento)`
          });
          reasons.push(`Tempo de deslocamento estimado: ${Math.ceil(travelTime)} minutos`);
        }
      } catch (error) {
        console.warn('Erro ao calcular recomendação de deslocamento:', error);
      }
    }

    // Recomendação baseada no horário
    const eventHour = event.startTime.getHours();
    if (eventHour < 9) { // Eventos matinais
      recommendations.push({
        value: 1,
        unit: 'HOURS',
        description: '1 hora antes (evento matinal)'
      });
      reasons.push('Eventos matinais podem precisar de mais tempo de preparação');
    }

    return {
      recommendedTimings: recommendations,
      reasons
    };
  }

  /**
   * Limpa cache antigo
   */
  clearOldCache(): void {
    const now = Date.now();
    
    // Limpar cache de clima
    for (const [key, value] of this.weatherCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.weatherCache.delete(key);
      }
    }

    // Limpar cache de trânsito
    for (const [key, value] of this.trafficCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.trafficCache.delete(key);
      }
    }
  }
}
