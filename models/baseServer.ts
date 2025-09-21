export class BaseServer {
    readonly name: string;

    constructor(hostname: string) {
        this.name = hostname;
    }
}
