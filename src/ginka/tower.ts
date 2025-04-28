import EventEmitter from 'eventemitter3';
import type { GinkaConfig, GinkaMapping } from '../types';

interface TowerData {
    main: {
        floorIds: string[];
        tilesets: string[];
    };
}

interface Mapping {
    id: string;
    cls: keyof TowerAssets;
}

interface Icons {
    terrains: Record<string, number>;
    animates: Record<string, number>;
    npcs: Record<string, number>;
    npc48: Record<string, number>;
    enemys: Record<string, number>;
    enemy48: Record<string, number>;
    items: Record<string, number>;
    autotile: Record<string, number>;
}

interface TowerEvent {
    updateFloorIds: [ids: string[]];
    clickBlock: [x: number, y: number];
}

interface TowerAssets {
    terrains: HTMLImageElement;
    animates: HTMLImageElement;
    npcs: HTMLImageElement;
    npc48: HTMLImageElement;
    enemys: HTMLImageElement;
    enemy48: HTMLImageElement;
    items: HTMLImageElement;
    autotile: Record<string, HTMLImageElement>;
    tilesets: Record<string, HTMLImageElement>;
}

const tilesList = [
    '0.png',
    '1.png',
    '2.png',
    '3.png',
    '4.png',
    '5.png',
    '6.png',
    '7.png',
    '8.png',
    '9.png',
    '10.png',
    '11_1.png',
    '11_2.png',
    '11_3.png',
    '11_4.png',
    '12.png',
    '13.png',
    '999.png'
];

const materials = [
    'terrains.png',
    'animates.png',
    'npcs.png',
    'npc48.png',
    'enemys.png',
    'enemy48.png',
    'items.png'
];

const typeMap: Record<keyof GinkaMapping, string> = {
    redGem: '3',
    blueGem: '4',
    greenGem: '13',
    yellowGem: '999',
    potion: '5',
    door: '6',
    item: '12',
    wall: '1',
    key: '2'
};

export class Tower extends EventEmitter<TowerEvent> {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private container!: HTMLDivElement;
    private observer?: ResizeObserver;
    private canvasScale: number = 1;

    private handle?: FileSystemDirectoryHandle;

    private nowIndex: number = 0;

    data?: TowerData;
    maps?: Record<number, Mapping>;
    icons?: Icons;
    config?: GinkaConfig;

    floors: Map<string, number[][]> = new Map();
    nowMap?: number[][];

    images: Record<string, HTMLImageElement> = {};
    assets?: TowerAssets;

    mapping: Map<number, keyof GinkaMapping> = new Map();

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const ratio = devicePixelRatio;
        const size = Math.min(width, height);
        this.canvas.width = size * ratio;
        this.canvas.height = size * ratio;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
        const scale = this.canvas.width / 416;
        this.ctx.scale(scale, scale);
        this.canvasScale = scale / devicePixelRatio;
        this.render();
    }

    async init(canvas: HTMLCanvasElement, container: HTMLDivElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.container = container;

        this.resize();

        const observer = new ResizeObserver(() => {
            this.resize();
        });
        observer.observe(container);

        canvas.addEventListener('click', ev => {
            const px = ev.offsetX / this.canvasScale;
            const py = ev.offsetY / this.canvasScale;

            this.emit('clickBlock', Math.floor(px / 32), Math.floor(py / 32));
        });

        await Promise.all(
            tilesList.map(v => {
                const url = `/tiles/${v}`;
                const image = new Image();
                image.src = url;
                this.images[v.slice(0, -4)] = image;
                return new Promise(res => image.addEventListener('load', res));
            })
        );
    }

    private async loadImage(buffer?: ArrayBuffer) {
        if (!buffer) return null;
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await new Promise<void>(res => {
            img.addEventListener('load', () => res(), { once: true });
        });

        return img;
    }

    async update(handle: FileSystemDirectoryHandle) {
        const project = await handle.getDirectoryHandle('project');
        this.handle = project;
        this.nowIndex = 0;
        this.mapping.clear();
        this.floors.clear();

        // 基础信息
        const [data, maps, icons, config] = await Promise.all([
            project.getFileHandle('data.js'),
            project.getFileHandle('maps.js'),
            project.getFileHandle('icons.js'),
            project.getFileHandle('ginka-config.json')
        ]);

        const [dataFile, mapsFile, iconsFile, configFile] = await Promise.all([
            (await data.getFile()).text(),
            (await maps.getFile()).text(),
            (await icons.getFile()).text(),
            (await config.getFile()).text()
        ]);

        const dataJSON = JSON.parse(dataFile.split('\n').slice(1).join('\n'));
        const mapsJSON = JSON.parse(mapsFile.split('\n').slice(1).join('\n'));
        const iconsJSON = JSON.parse(iconsFile.split('\n').slice(1).join('\n'));
        const configJSON = JSON.parse(configFile) as GinkaConfig;

        this.data = dataJSON;
        this.maps = mapsJSON;
        this.icons = iconsJSON;
        this.config = configJSON;

        for (const [key, value] of Object.entries(configJSON.mapping)) {
            value.forEach((v: number) => {
                this.mapping.set(v, key as keyof GinkaMapping);
            });
        }

        // 楼层
        const floors = await project.getDirectoryHandle('floors');
        const list = await Array.fromAsync(floors.values());

        await Promise.all(
            list.map(async v => {
                if (v instanceof FileSystemDirectoryHandle) return;
                const file = await v.getFile();
                const text = await file.text();
                const json = JSON.parse(text.split('\n').slice(1).join('\n'));
                this.floors.set(v.name.slice(0, -3), json.map);
            })
        );

        // 素材
        const m = await project.getDirectoryHandle('materials');
        const assets = await Promise.all(
            materials.map(async v => {
                const mHandle = await m.getFileHandle(v);
                const file = await mHandle.getFile();
                const buffer = await file.arrayBuffer();
                const image = await this.loadImage(buffer);
                return image!;
            })
        );

        // 自动元件
        const autotiles: Record<string, HTMLImageElement> = {};
        const autotileHandle = await project.getDirectoryHandle('autotiles');
        const autotileList = await Array.fromAsync(autotileHandle.values());
        await Promise.all(
            autotileList.map(async v => {
                if (v instanceof FileSystemDirectoryHandle) {
                    return Promise.resolve();
                }
                if (!v.name.endsWith('.png')) return;
                const file = await v.getFile();
                const buffer = await file.arrayBuffer();
                const image = await this.loadImage(buffer);
                if (image) autotiles[v.name.slice(0, -4)] = image;
            })
        );

        // 额外素材
        const tilesets: Record<string, HTMLImageElement> = {};
        const tilesetsHandle = await project.getDirectoryHandle('tilesets');
        const tilesetsList = await Array.fromAsync(tilesetsHandle.values());
        await Promise.all(
            tilesetsList.map(async v => {
                if (v instanceof FileSystemDirectoryHandle) {
                    return Promise.resolve();
                }
                if (!v.name.endsWith('.png')) return;
                const file = await v.getFile();
                const buffer = await file.arrayBuffer();
                const image = await this.loadImage(buffer);
                if (image) tilesets[v.name.slice(0, -4)] = image;
            })
        );

        this.assets = {
            terrains: assets[0],
            animates: assets[1],
            npcs: assets[2],
            npc48: assets[3],
            enemys: assets[4],
            enemy48: assets[5],
            items: assets[6],
            autotile: autotiles,
            tilesets: tilesets
        };

        this.emit('updateFloorIds', this.data!.main.floorIds);
        this.render();
    }

    updateFloor(index: number) {
        this.nowIndex = index;
        this.render();
    }

    reject(index: number) {
        this.data?.main.floorIds.splice(index, 1);
        if (this.data) {
            this.emit('updateFloorIds', this.data.main.floorIds);
        }
        this.render();
    }

    map() {
        if (!this.data) return null;
        return this.floors.get(this.data.main.floorIds[this.nowIndex]) ?? null;
    }

    markAs(num: number, type: keyof GinkaMapping) {
        if (!this.config) return;
        for (const mapped of Object.values(this.config.mapping)) {
            const arr = mapped as number[];
            const idx = arr.indexOf(num);
            if (idx !== -1) arr.splice(idx, 1);
        }
        this.config.mapping[type].push(num);
        this.mapping.set(num, type);
        this.render();
    }

    unmark(num: number) {
        if (!this.config) return;
        for (const mapped of Object.values(this.config.mapping)) {
            const arr = mapped as number[];
            const idx = arr.indexOf(num);
            if (idx !== -1) arr.splice(idx, 1);
        }
        this.mapping.delete(num);
        this.render();
    }

    private getMapImage(
        num: number
    ): [HTMLImageElement, number, number, number, number] | void {
        if (!this.assets || !this.maps || !this.icons) return;
        if (num >= 10000) {
            // 额外素材
            const index = Math.floor(num / 10000) - 1;
            const tileset = this.assets.tilesets[index];
            const width = Math.floor(tileset.width / 32);
            const n = num % 10000;
            const x = n % width;
            const y = Math.floor(n / width);
            return [tileset, x * 32, y * 32, 32, 32];
        }
        const data = this.maps[num];
        if (!data || data.cls === 'tilesets') return;
        const icon = this.icons[data.cls][data.id];
        switch (data.cls) {
            case 'terrains':
                return [this.assets.terrains, 0, icon * 32, 32, 32];
            case 'animates':
                return [this.assets.animates, 0, icon * 32, 32, 32];
            case 'enemys':
                return [this.assets.enemys, 0, icon * 32, 32, 32];
            case 'enemy48':
                return [this.assets.enemy48, 0, icon * 48, 32, 48];
            case 'npcs':
                return [this.assets.npcs, 0, icon * 32, 32, 32];
            case 'npc48':
                return [this.assets.npc48, 0, icon * 32, 32, 32];
            case 'items':
                return [this.assets.items, 0, icon * 32, 32, 32];
            case 'autotile':
                return [this.assets.autotile[data.id], 0, 0, 32, 32];
        }
    }

    private getMappedImage(
        num: number
    ): [HTMLImageElement, number, number, number, number] | void {
        const mapped = this.mapping.get(num);
        if (mapped) {
            const id = typeMap[mapped];
            return [this.images[id], 0, 0, 32, 32];
        } else {
            // 未处理图块
            return this.getMapImage(num);
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = false;
        // 1. 背景
        const image = this.images['0'];
        if (!image) return;
        const pattern = ctx.createPattern(image, 'repeat')!;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, 416, 416);

        // 2. 图块
        const map = this.map();
        if (!map) return;
        for (let ny = 0; ny < map.length; ny++) {
            for (let nx = 0; nx < map[0].length; nx++) {
                const tile = map[ny][nx];
                const img = this.getMappedImage(tile);
                if (!img) continue;
                const [im, sx, sy, sw, sh] = img;
                const dx = nx * 32 + 16 - sw / 2;
                const dy = ny * 32 + 32 - sh;
                ctx.drawImage(im, sx, sy, sw, sh, dx, dy, sw, sh);
            }
        }
    }

    async save() {
        const handle = this.handle;
        if (!handle) return;

        const [data, config] = await Promise.all([
            handle.getFileHandle('data.js'),
            handle.getFileHandle('ginka-config.json')
        ]);

        const dataWrite = await data.createWritable();
        const configWrite = await config.createWritable();

        await Promise.all([
            dataWrite.write(
                'var data_a1e2fb4a_e986_4524_b0da_9b7ba7c0874d = \n' +
                    JSON.stringify(this.data, void 0, 4)
            ),
            configWrite.write(JSON.stringify(this.config, void 0, 4))
        ]);

        await dataWrite.close();
        await configWrite.close();
    }

    destroy() {
        this.observer?.disconnect();
    }
}
