import chalk from 'chalk'
import type { ResolvedConfig } from 'vite'

type Logger = ResolvedConfig['logger']

export const logSuccess = (message: string, logger: Logger) => logger.info(`${chalk.greenBright(message)}`)

export const logError = (message: string, logger: Logger) => logger.info(`${chalk.redBright(message)}`)
