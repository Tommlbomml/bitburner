import { PortType, TargetServer } from "../models/targetServer";
import { Logger } from "../services/logger";

export async function main(ns: NS): Promise<void> {
    const hostname = ns.args[0]?.toString() || "n00dles";
    const logger = new Logger(ns, "info", "crackServer", true, true);
    const targetServer = new TargetServer(ns, hostname);

    if (targetServer.isRooted) {
        logger.debug(`${targetServer.name} is already rooted.`);
        return;
    }
    openPorts(ns, targetServer);

    if (!targetServer.canNuke) {
        logger.debug(`Failed to root ${targetServer.name}. Not enough ports opened.`);
        return;
    }

    ns.nuke(targetServer.name);
    logger.success(`Successfully rooted ${targetServer.name}`);
}

function openPorts(ns: NS, targetServer: TargetServer): void {
    const portTypes = [
        { type: "BruteSSH.exe", portType: PortType.SSH, openFunc: ns.brutessh },
        { type: "FTPCrack.exe", portType: PortType.FTP, openFunc: ns.ftpcrack },
        { type: "HTTPWorm.exe", portType: PortType.HTTP, openFunc: ns.httpworm },
        { type: "SQLInject.exe", portType: PortType.SQL, openFunc: ns.sqlinject },
        { type: "RelaySMTP.exe", portType: PortType.SMTP, openFunc: ns.relaysmtp },
    ];
    for (const port of portTypes) {
        if (ns.fileExists(port.type, "home") && !targetServer.isPortOpen(port.portType)) {
            port.openFunc(targetServer.name);
        }
        if (targetServer.canNuke) {
            break;
        }
    }
}
