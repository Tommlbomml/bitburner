import { HacknetService } from "./services/hacknet";

export async function main(ns: NS): Promise<void> {
    const hacknetService = new HacknetService(ns, 0.1); // Using 0.1% of money for purchases
    await hacknetService.manageHacknet();
}
