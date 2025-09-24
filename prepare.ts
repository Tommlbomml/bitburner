import { Server } from "./models/server";

export async function main(ns: NS): Promise<void> {
    const targetServerName = ns.args[0]?.toString() || "n00dles";
    const sourceServerName = ns.args[1]?.toString() || ns.getHostname();
    const server = new Server(ns, targetServerName);
    if (!server.getRootAccess()) {
        ns.tprint(`No root access to ${targetServerName}. Exiting.`);
        return;
    }

    ns.exec("batch/prepareServer.ts", "home", 1, targetServerName, sourceServerName);
}
