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
		ns.exec('v3prepareServer.js', ns.getHostname(), 1, hostName);
	}
}