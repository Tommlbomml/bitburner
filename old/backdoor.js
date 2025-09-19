/** @param {NS} ns */
export async function main(ns) {
	let hostName=ns.args[0];
	let server=ns.getServer(hostName);
/*
	if(!server.backdoorInstalled) {
		await(ns.singularity.installBackdoor(hostName));
	}
/**/
}