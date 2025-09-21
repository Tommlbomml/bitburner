import { fileExists } from "./file.helper";

const portHackers: string[] = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];
const portHackerFns: Record<string, (ns: NS, server: string) => void> = {
    "BruteSSH.exe": (ns, server) => ns.brutessh(server),
    "FTPCrack.exe": (ns, server) => ns.ftpcrack(server),
    "relaySMTP.exe": (ns, server) => ns.relaysmtp(server),
    "HTTPWorm.exe": (ns, server) => ns.httpworm(server),
    "SQLInject.exe": (ns, server) => ns.sqlinject(server),
};

export function countAvailablePortHackers(ns: NS): number {
    let count = 0;
    for (const hacker of portHackers) {
        if (fileExists(ns, hacker)) {
            count++;
        }
    }
    return count;
}

export function openPorts(ns: NS, server: string): void {
    for (const hacker of portHackers) {
        openPort(ns, server, hacker);
    }
}

export function openPort(ns: NS, server: string, portHacker: string): void {
    if (fileExists(ns, portHacker) && portHackerFns[portHacker]) {
        portHackerFns[portHacker](ns, server);
    }
}
