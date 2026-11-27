/** 资源入口继承的单例基类。每个子类各自保存第一次创建的实例。 */
export class Singleton {
    /** ResLoader.getIns() 中的 this 是 ResLoader，因此 new this() 会创建能使用战斗加载方法的实例。 */
    static getIns<T extends Singleton>(this: { new (): T; instance?: T }): T {
        if (!Object.prototype.hasOwnProperty.call(this, "instance") || !this.instance) {
            this.instance = new this();
        }
        return this.instance;
    }
}
