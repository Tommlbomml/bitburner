/** @param {NS} ns */
export async function main(ns) {
	var hostNames=[];

	let serversToScan=ns.scan('home');
	while(serversToScan.length) {
		let server=serversToScan.shift();
		if(!hostNames.includes(server)) {
			hostNames.push(server);
			serversToScan=serversToScan.concat(ns.scan(server));
		}
	}
	for (let hostName of hostNames) {
		let player=ns.getPlayer();
		let server=ns.getServer(hostName);
		if(!server.backdoorInstalled && server.requiredHackingSkill<=player.skills.hacking) {
			ns.tprint(hostName);
		}
	}
ns.tprint('darkweb, CSEC, avmnite-02h, I.I.I.I, run4theh111z, The-Cave, w0r1d_d43m0n'); // print factionservers
}