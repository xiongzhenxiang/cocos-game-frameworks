/** 加载失败后按毫秒等待，再由调用方决定是否重试。 */
export function sleep(ms: number): Promise<undefined> {
    return new Promise(resolve => setTimeout(() => resolve(undefined), ms));
}
