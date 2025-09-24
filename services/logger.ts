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
    private logLevel: LogLevel;
    private targetOutput: "terminal" | "tail" | "both";
    private printPrefix: boolean;

    constructor(ns: NS, logLevel: LogLevel = "info", targetOutput: "terminal" | "tail" | "both" = "tail", printPrefix: boolean = true, disableNSLogs: boolean = true) {
        this.ns = ns;
        this.logLevel = logLevel;
        this.targetOutput = targetOutput;
        this.printPrefix = printPrefix;
        if (disableNSLogs) {
            this.ns.disableLog("ALL");
        }
    }

    setTargetOutput(targetOutput: "terminal" | "tail" | "both") {
        this.targetOutput = targetOutput;
    }

    setLogLevel(level: LogLevel) {
        this.logLevel = level;
    }

    setPrintPrefix(printPrefix: boolean) {
        this.printPrefix = printPrefix;
    }

    disableNSLogs() {
        this.ns.disableLog("ALL");
    }

    enableNSLogs() {
        this.ns.enableLog("ALL");
    }

    public success(message: string, targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        const prefix = this.printPrefix ? "SCS: " : "";
        if (!this.shouldLog("info")) return;
        message = `${prefix}${message}`;
        message = this.colorText(message, LogColor.Green);
        this.print(message, targetOutput);
    }

    public info(message: string, targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        const prefix = this.printPrefix ? "INF: " : "";
        if (!this.shouldLog("info")) return;
        message = `${prefix}${message}`;
        message = this.colorText(message, LogColor.White);
        this.print(message, targetOutput);
    }

    public warn(message: string, targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        const prefix = this.printPrefix ? "WRN: " : "";
        if (!this.shouldLog("warn")) return;
        message = `${prefix}${message}`;
        message = this.colorText(message, LogColor.Yellow);
        this.print(message, targetOutput);
    }

    public error(message: string, targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        const prefix = this.printPrefix ? "ERR: " : "";
        if (!this.shouldLog("error")) return;
        message = `${prefix}${message}`;
        message = this.colorText(message, LogColor.Red);
        this.print(message, targetOutput);
    }

    public debug(message: string, targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        const prefix = this.printPrefix ? "DBG: " : "";
        if (!this.shouldLog("debug")) return;
        message = `${prefix}${message}`;
        message = this.colorText(message, LogColor.Blue);
        this.print(message, targetOutput);
    }

    public colorLog(message: string, color: LogColor, targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        if (!this.shouldLog("info")) return;
        message = this.colorText(message, color);
        this.print(message, targetOutput);
    }

    public terminalLog(message: string): void {
        const targetOutput = "terminal";
        this.print(this.colorText(message, LogColor.White), targetOutput);
    }

    public logInstructions(message: string, targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        const prefix = this.printPrefix ? "INSTRUCTION: " : "";
        this.print(this.colorText(`${prefix}${this.colorText(message, LogColor.Cyan)}`, LogColor.White), targetOutput);
    }

    public emptyLine(targetOutput: "terminal" | "tail" | "both" = this.targetOutput): void {
        this.print("", targetOutput);
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

    public padString(str: string, type: "start" | "end" | "both" = "start", length: number = 5, char: string = " "): string {
        if (type === "start") {
            return str.padStart(length, char);
        } else if (type === "end") {
            return str.padEnd(length, char);
        } else {
            const half = Math.floor((length - str.length) / 2);
            return str.padStart(half + str.length, char).padEnd(length, char);
        }
    }

    public padNumber(num: number, type: "start" | "end" | "both" = "start", length: number = 5, char: string = " "): string {
        const str = num.toString();
        return this.padString(str, type, length, char);
    }

    public colorText(text: string, color: LogColor, baseColor: LogColor = LogColor.Base): string {
        return `${color}${text}${baseColor}`;
    }

    private print(message: string, targetOutput: "tail" | "terminal" | "both" = this.targetOutput): void {
        if (targetOutput === "tail" || targetOutput === "both") {
            this.ns.print(message);
        }
        if (targetOutput === "terminal" || targetOutput === "both") {
            this.ns.tprint(message);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ["debug", "info", "warn", "error"];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
}
