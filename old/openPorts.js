/** @param {NS} ns */
export async function main(ns) {
    if(ns.fileExists('BruteSSH.exe')) {
        ns.brutessh(ns.args[0]);
    }
    if(ns.fileExists('FTPCrack.exe')) {
        ns.ftpcrack(ns.args[0]);
    }
    if(ns.fileExists('relaySMTP.exe')) {
        ns.relaysmtp(ns.args[0]);
    }
    if(ns.fileExists('HTTPWorm.exe')) {
        ns.httpworm(ns.args[0]);
    }
    if(ns.fileExists('SQLInject.exe')) {
        ns.sqlinject(ns.args[0]);
    }
}