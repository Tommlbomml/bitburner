export enum ScriptName {
    WEAKEN = "batch/weaken.ts",
    GROW = "batch/grow.ts",
    HACK = "batch/hack.ts",
}

export function fileExists(ns: NS, filename: string, server: string = "home"): boolean {
    return ns.fileExists(filename, server);
}

export function copyFiles(ns: NS, filenames: string[], targetServer: string, sourceServer: string = "home"): void {
    ns.scp(filenames, targetServer, sourceServer);
}

export function copyFile(ns: NS, filename: string, targetServer: string, sourceServer: string = "home"): void {
    ns.scp(filename, targetServer, sourceServer);
}
