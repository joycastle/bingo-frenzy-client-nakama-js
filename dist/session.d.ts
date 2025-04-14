export declare class Session {
    readonly token: string;
    readonly created_at: number;
    readonly expires_at: number;
    readonly username: string;
    readonly user_id: string;
    readonly created: boolean;
    private constructor();
    isexpired(currenttime: number): boolean;
    static restore(jwt: string, created: boolean): Session;
}
