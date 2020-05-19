enum LogLevel {
  // In order of decreasing severity / increasing verbosity
  ERROR,
  WARN,
  INFO,
  TRACE,
}

type LogLevelStr = keyof typeof LogLevel

let logLevel: LogLevel = LogLevel.ERROR;

export const setLevelByString = (strLevel: string, silent = false) => {
  const level: LogLevel | undefined = LogLevel[strLevel as LogLevelStr]
  if (!silent && typeof level === "undefined") {
    const validIds = Object.keys(LogLevel).join(', ')
    throw new Error(`Invalid LogLevel specified: unknown level '${strLevel}. Valid identifiers: ${validIds}'`)
  }
  setLevel(level)
}

export const setLevel = (level: LogLevel) => logLevel = level

export const error = (...args: any[]) => {
  if (logLevel >= LogLevel.ERROR) console.error(...args)
}

export const warn = (...args: any[]) => {
  if (logLevel >= LogLevel.WARN) console.warn(...args)
}

export const info = (...args: any[]) => {
  if (logLevel >= LogLevel.INFO) console.warn(...args)
}

export const trace = (...args: any[]) => {
  if (logLevel >= LogLevel.TRACE) console.warn(...args)
}

export const doIf = (level: LogLevel, fn: () => {}) => {
  if (logLevel >= level) fn()
}
