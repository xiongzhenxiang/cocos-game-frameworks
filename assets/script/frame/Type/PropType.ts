/** 资源类的构造函数。传入 cc.SpriteFrame 时，加载结果的类型随之确定为图片帧。 */
export type Class<T extends object> = new (...args: any[]) => T;
