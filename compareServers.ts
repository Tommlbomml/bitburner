import { TargetServer } from "./models/targetServer";
import { Logger } from "./services/logger";

export async function main(ns: NS): Promise<void> {
    const logger = new Logger(ns, "info", "compareServers", true, true);
    const servers = getAllServers(ns);
    const rankedServers = rankServersByProfitability(ns, servers);
    for (const server of rankedServers) {
        if ((server.isRooted || server.canNuke) && server.requiredHacking <= ns.getHackingLevel())
            logger.info(`Server: ${server.name}, Max Money: ${logger.formatNumber(server.maxMoney)}, Time: ${logger.formatTime(ns.getWeakenTime(server.name))}`);
    }
}

/**
 * Ranks servers by maxMoney/maxTime for quick profitability comparison.
 * does not consider the actual security level, so times may be way off if the server is at high security.
 * Returns an array of {hostname, maxMoney, weakenTime, score} sorted descending by score.
 * @param {NS} ns - Bitburner Netscript API
 * @param {string[]} servers - List of server hostnames to compare
 */
function rankServersByProfitability(ns: NS, servers: TargetServer[]): TargetServer[] {
    const rankedServers = servers
        .filter((server) => server.maxMoney > 0 && server.minSecurity > 0) // Filter out servers with no money or invalid security
        .map((server) => {
            const weakenTime = ns.getWeakenTime(server.name);
            const growTime = ns.getGrowTime(server.name);
            const hackTime = ns.getHackTime(server.name);
            const maxTime = Math.max(weakenTime, growTime, hackTime);
            const score = maxTime > 0 ? server.maxMoney / maxTime : 0;
            return { server, score };
        })
        .sort((a, b) => b.score - a.score) // Sort descending by score
        .map((entry) => entry.server);
    return rankedServers;
}

function getAllServers(ns: NS, hostname: string = "home", visited: Set<string> = new Set()): TargetServer[] {
    if (visited.has(hostname)) return [];
    visited.add(hostname);
    const neighbors = ns.scan(hostname);
    return [new TargetServer(ns, hostname), ...neighbors.flatMap((n) => getAllServers(ns, n, visited))];
}
