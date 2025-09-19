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

    constructor(ns: NS, level: LogLevel = "info", scriptName?: string, disableNSLogs: boolean = true) {
        this.ns = ns;
        this.level = level;
        this.scriptName = scriptName;
        if (disableNSLogs) {
            this.ns.disableLog("ALL");
        }
    }

    public success(message: string, ...args: any[]): void {
        if (this.shouldLog("info")) {
            this.print(this.colorText(`SUCCESS: ${this.format(message, args)}`, LogColor.Green));
        }
    }

    public info(message: string, ...args: any[]): void {
        if (this.shouldLog("info")) {
            this.print(this.colorText(`INFO: ${this.format(message, args)}`, LogColor.White));
        }
    }

    public warn(message: string, ...args: any[]): void {
        if (this.shouldLog("warn")) {
            this.print(this.colorText(`WARN: ${this.format(message, args)}`, LogColor.Yellow));
        }
    }

    public error(message: string, ...args: any[]): void {
        if (this.shouldLog("error")) {
            this.print(this.colorText(`ERROR: ${this.format(message, args)}`, LogColor.Red));
            this.printToTerminal(this.colorText(`ERROR (${this.scriptName}): ${this.format(message, args)}`, LogColor.Red));
        }
    }

    public debug(message: string, ...args: any[]): void {
        if (this.shouldLog("debug")) {
            this.print(this.colorText(`DEBUG: ${this.format(message, args)}`, LogColor.Blue));
        }
    }

    public colorLog(message: string, color: LogColor, ...args: any[]): void {
        if (this.shouldLog("info")) {
            this.print(this.colorText(this.format(message, args), color));
        }
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
