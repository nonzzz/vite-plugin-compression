import chalk from 'chalk'
import { ViteInternalLogger } from './interface'

/**
 * From vite source code. we can know that the logger is a function that wrapper the
 * consola.
 * Examples:
 *  logger.info is equal to console.log
 *  logger.error is equal to console.error
 *  logger.warn is equal to console.warn
 */

export const printf = (logger: ViteInternalLogger) => {
  return {
    info: (message: string) => logger.info(`${chalk.greenBright(message)}`),
    error: (message: string) => logger.error(`${chalk.redBright(message)}`),
    warn: (message: string) => logger.warn(`${chalk.yellowBright(message)}`)
  }
}
