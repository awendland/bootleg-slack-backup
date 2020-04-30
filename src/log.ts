let infoEnabled = false;

export const setLogInfo = (enabled: boolean) => infoEnabled = enabled;

export const info = (...args: any[]) => {
    if (infoEnabled) console.warn(...args)
}