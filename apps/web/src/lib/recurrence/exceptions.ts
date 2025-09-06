import { 
  RecurrenceException, 
  RecurrentEvent, 
  EventInstance,
  CalendarEvent
} from './types';
import { isSameDay, format } from 'date-fns';

export interface ExceptionOperationResult {
  success: boolean;
  message: string;
  updatedEvent?: RecurrentEvent;
  newEvent?: CalendarEvent;
}

export class RecurrenceExceptionManager {
  /**
   * Cria uma exceção para modificar uma instância específica
   */
  static modifyInstance(
    event: RecurrentEvent,
    originalDate: Date,
    modifications: Partial<CalendarEvent>
  ): ExceptionOperationResult {
    try {
      // Verificar se já existe uma exceção para esta data
      const existingExceptionIndex = event.exceptions.findIndex(
        ex => isSameDay(ex.originalDate, originalDate)
      );

      const exception: RecurrenceException = {
        id: `${event.id}_exception_${format(originalDate, 'yyyy-MM-dd')}`,
        originalDate,
        type: 'MODIFIED',
        modifiedEvent: modifications,
        createdAt: new Date()
      };

      const updatedEvent = { ...event };

      if (existingExceptionIndex >= 0) {
        // Atualizar exceção existente
        updatedEvent.exceptions[existingExceptionIndex] = exception;
      } else {
        // Adicionar nova exceção
        updatedEvent.exceptions.push(exception);
      }

      return {
        success: true,
        message: 'Instância modificada com sucesso',
        updatedEvent
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao modificar instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Cria uma exceção para deletar uma instância específica
   */
  static deleteInstance(
    event: RecurrentEvent,
    originalDate: Date
  ): ExceptionOperationResult {
    try {
      // Verificar se já existe uma exceção para esta data
      const existingExceptionIndex = event.exceptions.findIndex(
        ex => isSameDay(ex.originalDate, originalDate)
      );

      const exception: RecurrenceException = {
        id: `${event.id}_exception_${format(originalDate, 'yyyy-MM-dd')}`,
        originalDate,
        type: 'DELETED',
        createdAt: new Date()
      };

      const updatedEvent = { ...event };

      if (existingExceptionIndex >= 0) {
        // Atualizar exceção existente
        updatedEvent.exceptions[existingExceptionIndex] = exception;
      } else {
        // Adicionar nova exceção
        updatedEvent.exceptions.push(exception);
      }

      return {
        success: true,
        message: 'Instância removida com sucesso',
        updatedEvent
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao remover instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Remove uma exceção (restaura instância original)
   */
  static removeException(
    event: RecurrentEvent,
    originalDate: Date
  ): ExceptionOperationResult {
    try {
      const updatedEvent = { ...event };
      const initialLength = updatedEvent.exceptions.length;
      
      updatedEvent.exceptions = updatedEvent.exceptions.filter(
        ex => !isSameDay(ex.originalDate, originalDate)
      );

      if (updatedEvent.exceptions.length === initialLength) {
        return {
          success: false,
          message: 'Nenhuma exceção encontrada para esta data'
        };
      }

      return {
        success: true,
        message: 'Exceção removida com sucesso',
        updatedEvent
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao remover exceção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Converte uma instância modificada em um evento independente
   */
  static convertToIndependentEvent(
    event: RecurrentEvent,
    originalDate: Date,
    newEventData: Partial<CalendarEvent>
  ): ExceptionOperationResult {
    try {
      // Primeiro, deletar a instância da série
      const deleteResult = this.deleteInstance(event, originalDate);
      if (!deleteResult.success) {
        return deleteResult;
      }

      // Criar novo evento independente
      const duration = event.endTime.getTime() - event.startTime.getTime();
      const startTime = new Date(originalDate);
      const endTime = new Date(originalDate.getTime() + duration);

      const newEvent: CalendarEvent = {
        id: `${event.id}_independent_${format(originalDate, 'yyyy-MM-dd')}`,
        title: newEventData.title || event.title,
        description: newEventData.description || event.description,
        startTime: newEventData.startTime || startTime,
        endTime: newEventData.endTime || endTime,
        location: newEventData.location || event.location,
        isRecurrent: false,
        createdBy: event.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return {
        success: true,
        message: 'Evento independente criado com sucesso',
        updatedEvent: deleteResult.updatedEvent,
        newEvent
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao converter para evento independente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Aplica modificações em massa para múltiplas instâncias
   */
  static bulkModifyInstances(
    event: RecurrentEvent,
    modifications: Array<{
      originalDate: Date;
      changes: Partial<CalendarEvent>;
    }>
  ): ExceptionOperationResult {
    try {
      let updatedEvent = { ...event };
      const results: string[] = [];

      for (const modification of modifications) {
        const result = this.modifyInstance(
          updatedEvent,
          modification.originalDate,
          modification.changes
        );

        if (result.success && result.updatedEvent) {
          updatedEvent = result.updatedEvent;
          results.push(`✓ ${format(modification.originalDate, 'dd/MM/yyyy')}`);
        } else {
          results.push(`✗ ${format(modification.originalDate, 'dd/MM/yyyy')}: ${result.message}`);
        }
      }

      return {
        success: true,
        message: `Modificações aplicadas:\n${results.join('\n')}`,
        updatedEvent
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro nas modificações em massa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Aplica exclusões em massa para múltiplas instâncias
   */
  static bulkDeleteInstances(
    event: RecurrentEvent,
    dates: Date[]
  ): ExceptionOperationResult {
    try {
      let updatedEvent = { ...event };
      const results: string[] = [];

      for (const date of dates) {
        const result = this.deleteInstance(updatedEvent, date);

        if (result.success && result.updatedEvent) {
          updatedEvent = result.updatedEvent;
          results.push(`✓ ${format(date, 'dd/MM/yyyy')}`);
        } else {
          results.push(`✗ ${format(date, 'dd/MM/yyyy')}: ${result.message}`);
        }
      }

      return {
        success: true,
        message: `Exclusões aplicadas:\n${results.join('\n')}`,
        updatedEvent
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro nas exclusões em massa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Obtém informações sobre uma exceção específica
   */
  static getExceptionInfo(
    event: RecurrentEvent,
    originalDate: Date
  ): RecurrenceException | null {
    return event.exceptions.find(ex => 
      isSameDay(ex.originalDate, originalDate)
    ) || null;
  }

  /**
   * Lista todas as exceções de um evento
   */
  static listExceptions(event: RecurrentEvent): {
    modified: RecurrenceException[];
    deleted: RecurrenceException[];
    total: number;
  } {
    const modified = event.exceptions.filter(ex => ex.type === 'MODIFIED');
    const deleted = event.exceptions.filter(ex => ex.type === 'DELETED');

    return {
      modified,
      deleted,
      total: event.exceptions.length
    };
  }

  /**
   * Valida se uma data pode ter exceção aplicada
   */
  static canApplyException(
    event: RecurrentEvent,
    targetDate: Date
  ): { canApply: boolean; reason?: string } {
    // Verificar se a data está no passado (opcional - pode permitir)
    const now = new Date();
    if (targetDate < now) {
      return {
        canApply: true, // Permitir modificar eventos passados
        reason: 'Data no passado - modificação permitida'
      };
    }

    // Verificar se a data está dentro do range da recorrência
    if (event.recurrenceRule.until && targetDate > event.recurrenceRule.until) {
      return {
        canApply: false,
        reason: 'Data está fora do período de recorrência'
      };
    }

    return { canApply: true };
  }

  /**
   * Limpa exceções antigas (opcional - para manutenção)
   */
  static cleanupOldExceptions(
    event: RecurrentEvent,
    olderThanDays: number = 365
  ): ExceptionOperationResult {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const initialCount = event.exceptions.length;
      const updatedEvent = { ...event };
      
      updatedEvent.exceptions = updatedEvent.exceptions.filter(
        ex => ex.originalDate >= cutoffDate
      );

      const removedCount = initialCount - updatedEvent.exceptions.length;

      return {
        success: true,
        message: `${removedCount} exceções antigas removidas`,
        updatedEvent
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro na limpeza: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
}
