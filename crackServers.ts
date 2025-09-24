import { TargetServer } from "./models/targetServer";
import { executeScript } from "./utils/process.helper";
import { Logger } from "./services/logger";
import { isServerGettingPrepared, isServerGettingHacked } from "./utils/process.helper";

export async function main(ns: NS): Promise<void> {
    let servers: TargetServer[] = [];
    const logger = new Logger(ns, "info", "terminal");

    let crackedServers: TargetServer[] = [];
    let newlyCrackedServers: TargetServer[] = [];

    scanNetwork(ns, servers);
    for (const server of servers) {
        if (server.isRooted) {
            crackedServers.push(server);
            continue;
        }
        executeScript(ns, "batch/crackServer.ts", ns.getHostname(), 1, server.name);
        if (server.isRooted) {
            crackedServers.push(server);
            newlyCrackedServers.push(server);
        }
        await ns.sleep(10);
    }
    logReport(logger, servers.length, crackedServers.length, newlyCrackedServers.length);
    logNewlyCracked(logger, newlyCrackedServers);
    logCracked(ns, logger, crackedServers);
}

function scanNetwork(ns: NS, servers: TargetServer[], server: TargetServer = new TargetServer(ns, "home"), visited: Set<string> = new Set<string>()): void {
    if (visited.has(server.name)) {
        return;
    }
    visited.add(server.name);
    servers.push(server);

    const neighbors = ns.scan(server.name);
    for (const neighbor of neighbors) {
        const neighborServer = new TargetServer(ns, neighbor);
        scanNetwork(ns, servers, neighborServer, visited);
    }
}

function logReport(logger: Logger, servers: number, crackedServers: number, newlyCrackedServers: number): void {
    logger.info(`Scanned ${servers} servers. Cracked ${newlyCrackedServers} new servers. Total cracked: ${crackedServers}`);
}

function logNewlyCracked(logger: Logger, newlyCrackedServers: TargetServer[]): void {
    if (newlyCrackedServers.length === 0) {
        logger.info("No new servers cracked.");
        return;
    }
    logger.info(`Newly cracked servers: ${newlyCrackedServers.map((server) => server.name).join(", ")}`);
}

function logCracked(ns: NS, logger: Logger, crackedServers: TargetServer[]): void {
    if (crackedServers.length === 0) {
        logger.info("No servers cracked.");
        return;
    }
    logger.info(`Cracked servers: ${crackedServers.map((server) => server.name).join(", ")}`);

    const noMoneyServers: TargetServer[] = [];
    const toHardToHack: TargetServer[] = [];
    const hacking: TargetServer[] = [];
    const preparing: TargetServer[] = [];
    const toBeHacked: TargetServer[] = [];
    const toBePrepared: TargetServer[] = [];

    for (const server of crackedServers) {
        if (server.maxMoney === 0) {
            noMoneyServers.push(server);
        } else if (server.requiredHacking > ns.getHackingLevel()) {
            toHardToHack.push(server);
        } else if (isServerGettingHacked(ns, server.name)) {
            hacking.push(server);
        } else if (isServerGettingPrepared(ns, server.name)) {
            preparing.push(server);
        } else if (server.currentMoney === server.maxMoney && server.currentSecurity === server.minSecurity) {
            toBeHacked.push(server);
        } else {
            toBePrepared.push(server);
        }
    }
    logger.emptyLine();
    logger.info(`Servers with no money: ${noMoneyServers.map((s) => s.name).join(", ") || "None"}`);
    logger.info(`Servers too hard to hack: ${toHardToHack.map((s) => s.name).join(", ") || "None"}`);
    logger.info(`Servers being hacked: ${hacking.map((s) => s.name).join(", ") || "None"}`);
    logger.info(`Servers being prepared: ${preparing.map((s) => s.name).join(", ") || "None"}`);
    logger.info(`Servers to be hacked: ${toBeHacked.map((s) => s.name).join(", ") || "None"}`);
    toBeHacked.sort((a, b) => b.maxMoney - a.maxMoney);
    toBeHacked.forEach((s) => logger.logInstructions(`run hack.ts ${s.name}`));
    logger.info(`Servers to be prepared: ${toBePrepared.map((s) => s.name).join(", ") || "None"}`);
    toBePrepared.sort((a, b) => b.maxMoney - a.maxMoney);
    toBePrepared.forEach((s) => logger.logInstructions(`run prepare.ts ${s.name}`));
}
