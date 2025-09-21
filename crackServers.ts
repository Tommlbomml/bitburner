import { TargetServer } from "./models/targetServer";
import { executeScript } from "./utils/process.helper";
import { Logger } from "./services/logger";

export async function main(ns: NS): Promise<void> {
    let servers: TargetServer[] = [];
    const logger = new Logger(ns, "info", "crackServers", true, true);

    let crackedServers: TargetServer[] = [];
    let newlyCrackedServers: TargetServer[] = [];

    scanNetwork(ns, servers);
    // print all servers
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
    }
    logReport(logger, servers);
    logNewlyCracked(logger, newlyCrackedServers);
    logCracked(logger, crackedServers);
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

function logReport(logger: Logger, servers: TargetServer[]): void {
    const crackedServers = servers.filter((server) => server.isRooted);
    logger.info(`Scanned ${servers.length} servers. Cracked ${crackedServers.length} new servers. Total cracked: ${crackedServers.length}`);
}

function logNewlyCracked(logger: Logger, newlyCrackedServers: TargetServer[]): void {
    if (newlyCrackedServers.length === 0) {
        logger.info("No new servers cracked.");
        return;
    }
    logger.info(`Newly cracked servers: ${newlyCrackedServers.map((server) => server.name).join(", ")}`);
}

function logCracked(logger: Logger, crackedServers: TargetServer[]): void {
    if (crackedServers.length === 0) {
        logger.info("No servers cracked.");
        return;
    }
    logger.info(`Cracked servers: ${crackedServers.map((server) => server.name).join(", ")}`);
}
