export async function main(ns: NS): Promise<void> {
    const targetServerName = ns.args[0]?.toString() || "n00dles";
    const sourceServerName = ns.args[1]?.toString() || ns.getHostname();
    ns.exec("batch/prepareServer.ts", "home", 1, targetServerName, sourceServerName);
}
