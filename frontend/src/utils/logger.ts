/**
 * Système de logging conditionnel
 */
import { DEV_CONFIG } from '@/config/api'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

class Logger {
  private level: LogLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR
  private enabledModules: Set<string> = new Set()

  /**
   * Configure le niveau de log
   */
  setLevel(level: LogLevel) {
    this.level = level
  }

  /**
   * Active les logs pour un module spécifique
   */
  enableModule(module: string) {
    this.enabledModules.add(module)
  }

  /**
   * Désactive les logs pour un module spécifique
   */
  disableModule(module: string) {
    this.enabledModules.delete(module)
  }

  /**
   * Vérifie si on doit logger selon le niveau et le module
   */
  private shouldLog(level: LogLevel, module?: string): boolean {
    if (level > this.level) return false
    if (module && !this.enabledModules.has(module)) return false
    return true
  }

  /**
   * Log d'erreur (toujours affiché)
   */
  error(message: string, data?: any, module?: string) {
    if (this.shouldLog(LogLevel.ERROR, module)) {
      console.error(`[ERROR${module ? `:${module}` : ''}] ${message}`, data)
    }
  }

  /**
   * Log d'avertissement
   */
  warn(message: string, data?: any, module?: string) {
    if (this.shouldLog(LogLevel.WARN, module)) {
      console.warn(`[WARN${module ? `:${module}` : ''}] ${message}`, data)
    }
  }

  /**
   * Log d'information
   */
  info(message: string, data?: any, module?: string) {
    if (this.shouldLog(LogLevel.INFO, module)) {
      console.info(`[INFO${module ? `:${module}` : ''}] ${message}`, data)
    }
  }

  /**
   * Log de debug
   */
  debug(message: string, data?: any, module?: string) {
    if (this.shouldLog(LogLevel.DEBUG, module)) {
      console.log(`[DEBUG${module ? `:${module}` : ''}] ${message}`, data)
    }
  }

  /**
   * Log verbeux (uniquement si explicitement activé)
   */
  verbose(message: string, data?: any, module?: string) {
    if (this.shouldLog(LogLevel.VERBOSE, module) && DEV_CONFIG.enableVerboseLogs) {
      console.log(`[VERBOSE${module ? `:${module}` : ''}] ${message}`, data)
    }
  }
}

// Instance singleton
export const logger = new Logger()

// En développement, activer les modules principaux
if (import.meta.env.DEV) {
  logger.enableModule('API')
  logger.enableModule('AUTH')
  logger.enableModule('STORE')
}

// Helpers pour les modules spécifiques
export const apiLogger = {
  error: (message: string, data?: any) => logger.error(message, data, 'API'),
  warn: (message: string, data?: any) => logger.warn(message, data, 'API'),
  info: (message: string, data?: any) => logger.info(message, data, 'API'),
  debug: (message: string, data?: any) => logger.debug(message, data, 'API'),
  verbose: (message: string, data?: any) => logger.verbose(message, data, 'API'),
}

export const authLogger = {
  error: (message: string, data?: any) => logger.error(message, data, 'AUTH'),
  warn: (message: string, data?: any) => logger.warn(message, data, 'AUTH'),
  info: (message: string, data?: any) => logger.info(message, data, 'AUTH'),
  debug: (message: string, data?: any) => logger.debug(message, data, 'AUTH'),
  verbose: (message: string, data?: any) => logger.verbose(message, data, 'AUTH'),
}

export const storeLogger = {
  error: (message: string, data?: any) => logger.error(message, data, 'STORE'),
  warn: (message: string, data?: any) => logger.warn(message, data, 'STORE'),
  info: (message: string, data?: any) => logger.info(message, data, 'STORE'),
  debug: (message: string, data?: any) => logger.debug(message, data, 'STORE'),
  verbose: (message: string, data?: any) => logger.verbose(message, data, 'STORE'),
} 