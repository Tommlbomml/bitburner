export type LogLevel = "info" | "warn" | "error" | "debug";

export enum LogColor {
    Base = "\u001b[0m",
    Red = "\u001b[31m",
    Yellow = "\u001b[33m",
    Green = "\u001b[32m",
    Blue = "\u001b[34m",
    Magenta = "\u001b[35m",
    Cyan = "\u001b[36m",
    White = "\u001b[37m",
    Black = "\u001b[30m",
}

export class Logger {
    private readonly ns: NS;
    private readonly level: LogLevel;
    private readonly scriptName?: string;
    private readonly terminal: boolean = false;

    constructor(ns: NS, level: LogLevel = "info", scriptName?: string, disableNSLogs: boolean = true, printToTerminal: boolean = false) {
        this.ns = ns;
        this.level = level;
        this.scriptName = scriptName;
        this.terminal = printToTerminal;
        if (disableNSLogs) {
            this.ns.disableLog("ALL");
        }
    }

    public success(message: string, ...args: any[]): void {
        if (!this.shouldLog("info")) return;
        this.print(this.colorText(`SUCCESS: ${this.format(message, args)}`, LogColor.Green));
        if (this.terminal) {
            this.printToTerminal(this.colorText(`SUCCESS (${this.scriptName}): ${this.format(message, args)}`, LogColor.Green));
        }
    }

    public info(message: string, ...args: any[]): void {
        if (!this.shouldLog("info")) return;
        this.print(this.colorText(`INFO: ${this.format(message, args)}`, LogColor.White));
        if (this.terminal) {
            this.printToTerminal(this.colorText(`INFO (${this.scriptName}): ${this.format(message, args)}`, LogColor.White));
        }
    }

    public warn(message: string, ...args: any[]): void {
        if (!this.shouldLog("warn")) return;
        this.print(this.colorText(`WARN: ${this.format(message, args)}`, LogColor.Yellow));
        if (this.terminal) {
            this.printToTerminal(this.colorText(`WARN (${this.scriptName}): ${this.format(message, args)}`, LogColor.Yellow));
        }
    }

    public error(message: string, ...args: any[]): void {
        if (!this.shouldLog("error")) return;
        this.print(this.colorText(`ERROR: ${this.format(message, args)}`, LogColor.Red));
        if (this.terminal) {
            this.printToTerminal(this.colorText(`ERROR (${this.scriptName}): ${this.format(message, args)}`, LogColor.Red));
        }
    }

    public debug(message: string, ...args: any[]): void {
        if (!this.shouldLog("debug")) return;
        this.print(this.colorText(`DEBUG: ${this.format(message, args)}`, LogColor.Blue));
        if (this.terminal) {
            this.printToTerminal(this.colorText(`DEBUG (${this.scriptName}): ${this.format(message, args)}`, LogColor.Blue));
        }
    }

    public colorLog(message: string, color: LogColor, ...args: any[]): void {
        if (!this.shouldLog("info")) return;
        this.print(this.colorText(this.format(message, args), color));
        if (this.terminal) {
            this.printToTerminal(this.colorText(this.format(message, args), color));
        }
    }

    public terminalLog(message: string, ...args: any[]): void {
        if (!this.shouldLog("info")) return;
        this.printToTerminal(this.colorText(this.format(message, args), LogColor.White));
    }

    public clearLog(): void {
        this.ns.clearLog();
    }

    public humanReadableNumber(num: number, decimals: number = 2): string {
        if (!isFinite(num)) return String(num);
        if (num === 0) return "0";
        const sign = num < 0 ? "-" : "";
        const abs = Math.abs(num);
        const largeSuffixes = ["", "K", "M", "G", "T", "P", "E", "Z"];
        const smallSuffixes = ["", "m", "µ", "n", "p", "f", "a", "z"];
        let suffix = "";
        let value = abs;
        if (abs >= 1) {
            let i = 0;
            while (value >= 1000 && i < largeSuffixes.length - 1) {
                value /= 1000;
                i++;
            }
            suffix = largeSuffixes[i];
        } else {
            let i = 0;
            while (value < 1 && i < smallSuffixes.length - 1) {
                value *= 1000;
                i++;
            }
            suffix = smallSuffixes[i];
        }
        const out = value.toFixed(decimals).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
        return sign + out + suffix;
    }

    public humanReadableTime(ms: number, ignoreMs: boolean = true): string {
        if (ms < 0) return "-" + this.humanReadableTime(-ms, ignoreMs);
        if (ms === 0) return ignoreMs ? "0 s" : "0 ms";
        ms = Math.floor(ms);
        if (ms < 1) return ignoreMs ? "< 1 s" : "< 1 ms";
        const units = [{ label: "d", ms: 86400000 }, { label: "h", ms: 3600000 }, { label: "m", ms: 60000 }, { label: "s", ms: 1000 }, ...(ignoreMs ? [] : [{ label: "ms", ms: 1 }])];
        if (ignoreMs) {
            ms = Math.round(ms / 1000) * 1000;
        }
        let remaining = ms;
        const parts: string[] = [];
        for (const unit of units) {
            if (remaining >= unit.ms) {
                const value = Math.floor(remaining / unit.ms);
                remaining -= value * unit.ms;
                parts.push(`${value} ${unit.label}`);
            }
        }
        return parts.join(", ");
    }

    private print(message: string): void {
        this.ns.print(message);
    }

    private printToTerminal(message: string): void {
        this.ns.tprint(message);
    }

    private colorText(text: string, color: LogColor): string {
        return `${color}${text}${LogColor.Base}`;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ["debug", "info", "warn", "error"];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    private format(message: string, args: any[]): string {
        return args.length ? message.replace(/%s/g, () => String(args.shift())) : message;
    }
}
