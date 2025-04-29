export interface BaseConfig {
    clip: {
        defaults: [number, number, number, number];
        special: Record<string, [number, number, number, number]>;
    };
}

export interface GinkaMapping {
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    redGem: Record<number, number>;
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    blueGem: Record<number, number>;
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    greenGem: Record<number, number>;
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    yellowGem: Record<number, number>;
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    item: Record<number, number>;
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    potion: Record<number, number>;
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    key: Record<number, number>;
    /** 键表示图块，值表示等级或其增加的属性值，0是最低级，以此类推 */
    door: Record<number, number>;
    floor: number[];
    arrow: number[];
    wall: number[];
    decoration: number[];
}

export interface GinkaData {
    tag: number[];
}

export interface GinkaConfig extends BaseConfig {
    data: Record<string, GinkaData>;
    mapping: GinkaMapping;
}
