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

    public formatNumber(num: number, decimals: number = 2, suffixStart: number = 1000, isInt: boolean = false): string {
        return this.ns.formatNumber(num, decimals, suffixStart, isInt);
    }

    public formatPercent(num: number, decimals: number = 2, suffixStart: number = 1e6): string {
        return this.ns.formatPercent(num, decimals, suffixStart);
    }

    public formatTime(ms: number, showMillis: boolean = false): string {
        return this.ns.tFormat(ms, showMillis);
    }

    public formatRam(ram: number, decimals: number = 2): string {
        return this.ns.formatRam(ram, decimals);
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
