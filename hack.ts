import { HackingService } from "./services/hacking";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0]?.toString() || "n00dles";
    const hackingService = new HackingService(ns, server);
    await hackingService.hackLoop();
}
