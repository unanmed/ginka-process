export interface BaseConfig {
    clip: {
        defaults: [number, number, number, number];
        special: Record<string, [number, number, number, number]>;
    };
}

export interface GinkaMapping {
    redGem: number[];
    blueGem: number[];
    greenGem: number[];
    yellowGem: number[];
    item: number[];
    potion: number[];
    key: number[];
    door: number[];
    wall: number[];
}

export interface GinkaConfig extends BaseConfig {
    data: Record<string, string[]>;
    mapping: GinkaMapping;
}
