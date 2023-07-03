declare module "style.json" {
    const value: { [key: string]: { [k: string]: string } };
    export default value;
}

interface CacheObject {
    body: Buffer;
}