import { Server } from "./models/server";

export async function main(ns: NS): Promise<void> {
    const hostname = ns.args[0]?.toString() || "n00dles";
    const server = new Server(ns, hostname);
    if (!server.getRootAccess()) {
        ns.tprint(`No root access to ${hostname}. Exiting.`);
        return;
    }

    ns.exec("batch/prepareServer.ts", "home", 1, hostname);
}
