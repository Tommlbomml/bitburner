/** @param {NS} ns */
export async function main(ns) {
	var hostNames=[];

	let serversToScan=ns.scan('home');
	while(serversToScan.length) {
		let server=serversToScan.shift();
//ns.tprint(server);
		if(!hostNames.includes(server)) {
			hostNames.push(server);
			serversToScan=serversToScan.concat(ns.scan(server));
		}
	}
	for (let hostName of hostNames) {
		ns.exec('openPorts.js', 'home', 1, hostName);
		await(ns.sleep(500));
		let server=ns.getServer(hostName);
		if(!server.purchasedByPlayer) {
			if(!server.hasAdminRights) {
				if(server.openPortCount>=server.numOpenPortsRequired) {
					ns.nuke(hostName);
				}
			}
			await(ns.scp('prepareServer.js', hostName));
			let mem=server.maxRam-server.ramUsed;
			let numThreads=Math.floor(mem/ns.getScriptRam('prepareServer.js', hostName));
			if(numThreads) {
				ns.exec('prepareServer.js', hostName, numThreads, hostName);
			}
//			ns.exec('backdoor.js', 'home', 1, hostName);
		}

		
//TODO: buy programs

}