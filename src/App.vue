<template>
    <div class="main">
        <div class="left-panel">
            <div class="choose">
                <Button
                    class="button"
                    type="primary"
                    size="large"
                    @click="choose"
                >
                    选择文件夹
                </Button>
                <span class="folder-name">{{ folderName }}</span>
            </div>
            <Divider class="divider" dashed />
            <div class="types">
                <div class="types-hint">
                    选中后，点击地图上的图块替换为指定图块，擦除用于恢复
                </div>
                <div class="type-one" v-for="(text, key, idx) of typeMap">
                    <Button
                        class="button"
                        :selected="selectedType === key"
                        @click="selectedType = key"
                        >{{ text }}</Button
                    >
                    <span>快捷键：{{ idx }}</span>
                </div>
            </div>
            <Divider class="divider" dashed />
            <div class="floor-progress">
                <div class="progress-text">
                    <span>{{ nowIndex }} / {{ floorCount - 1 }}</span>
                    <span
                        >{{
                            ((nowIndex / (floorCount - 1)) * 100).toFixed(2)
                        }}%</span
                    >
                </div>
                <Slider
                    class="progress-slider"
                    v-model:value="nowIndex"
                    :min="0"
                    :max="floorCount - 1"
                    :step="1"
                />
                <div class="save">
                    <Button type="primary" size="large" @click="save"
                        >保存（S）</Button
                    >
                </div>
            </div>
            <Divider class="divider" dashed />
            <div>未被处理的图块会被视为空地，怪物除外</div>
        </div>
        <Divider class="divider vertical" dashed type="vertical" />
        <div class="right-panel" @wheel="wheel">
            <div class="map" ref="container">
                <canvas ref="render"></canvas>
            </div>
            <div class="approve">
                <Button type="primary" size="large" @click="approve"
                    >赞成（A）</Button
                >
                <Button type="primary" size="large" danger @click="reject">
                    拒绝（D）</Button
                >
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Divider, Button, message, Slider } from 'ant-design-vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { SingleFolderHandler } from './common/folder';
import type { GinkaMapping } from './types';
import { Tower } from './ginka/tower';
import { clamp } from 'lodash-es';

const support = 'showDirectoryPicker' in window;

type TypeKeys = keyof GinkaMapping | 'erase';

const typeMap: Record<TypeKeys, string> = {
    erase: '擦除',
    redGem: '红宝石',
    blueGem: '蓝宝石',
    greenGem: '绿宝石',
    yellowGem: '黄宝石',
    item: '道具',
    potion: '血瓶',
    key: '钥匙',
    door: '门',
    wall: '墙'
};
const typeKeys = Object.keys(typeMap) as TypeKeys[];

const folder = new SingleFolderHandler();
const tower = new Tower();

const folderName = ref<string>('');
const selectedType = ref<TypeKeys>('erase');
const nowIndex = ref(0);
const floorCount = ref(2);
const render = ref<HTMLCanvasElement>();
const container = ref<HTMLDivElement>();

watch(nowIndex, value => {
    tower.updateFloor(value);
});

folder.on('update', () => {
    folderName.value = folder.folder?.name ?? '';
    if (folder.folder) tower.update(folder.folder);
});

tower.on('updateFloorIds', ids => {
    floorCount.value = ids.length;
    nowIndex.value = clamp(nowIndex.value, 0, floorCount.value - 1);
});

tower.on('clickBlock', (x, y) => {
    const map = tower.map();
    const tile = map?.[y]?.[x];
    if (tile === void 0) return;

    if (selectedType.value === 'erase') {
        tower.unmark(tile);
    } else {
        tower.markAs(tile, selectedType.value);
    }
});

if (!support) {
    message.warn({
        content: '您的浏览器不支持此工具，请更新浏览器。'
    });
}

function choose() {
    folder.choose();
}

async function save() {
    await tower.save();
    message.success('保存成功！');
}

function approve() {
    nowIndex.value++;
    nowIndex.value = clamp(nowIndex.value, 0, floorCount.value - 1);
    message.success('已赞成！');
}

function reject() {
    tower.reject(nowIndex.value);
    nowIndex.value = clamp(nowIndex.value, 0, floorCount.value - 1);
    message.success('已拒绝！');
}

function wheel(ev: WheelEvent) {
    const sign = Math.sign(ev.deltaY);
    nowIndex.value -= sign;
    nowIndex.value = clamp(nowIndex.value, 0, floorCount.value - 1);
}

const abort = new AbortController();

document.addEventListener(
    'keydown',
    e => {
        const num = e.keyCode - 48;
        if (num >= 0 && num < typeKeys.length) {
            selectedType.value = typeKeys[num];
        }
    },
    { signal: abort.signal }
);
document.addEventListener(
    'keyup',
    e => {
        if (e.keyCode === 65) {
            approve();
        } else if (e.keyCode === 68) {
            reject();
        }

        nowIndex.value = clamp(nowIndex.value, 0, floorCount.value - 1);
    },
    { signal: abort.signal }
);

onMounted(() => {
    tower.init(render.value!, container.value!);
});

onUnmounted(() => {
    abort.abort();
    tower.destroy();
});
</script>

<style lang="less" scoped>
.main {
    width: 80%;
    height: 80%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    font-size: 16px;
}

.divider {
    border-color: #888;
}

.divider.vertical {
    height: 100%;
}

.left-panel {
    flex-basis: 30%;
    height: 100%;
    padding: 16px;
    overflow: auto;
    max-width: 400px;
    display: flex;
    align-items: center;
    flex-direction: column;

    .choose {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: calc(100% - 32px);
        height: 8%;
        padding: 0 16px;

        .folder-name {
            font-size: 18px;
        }
    }

    .types {
        display: flex;
        flex-direction: column;
        width: calc(100% - 16px);
        padding-left: 16px;

        .types-hint {
            margin-bottom: 24px;
        }

        .type-one {
            display: flex;
            flex-direction: row;
            align-items: center;
            width: 100%;
            margin: 4px;

            .button {
                height: 36px;
                width: 96px;
                font-size: 16px;
                margin-right: 16px;
            }

            .button[selected='true'] {
                background-color: #1677ff;
                color: #fff;
            }
        }
    }

    .floor-progress {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;

        .progress-text {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .progress-slider {
            width: 100%;
        }
    }
}

.right-panel {
    flex-basis: 70%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-direction: column;

    .map {
        width: 100%;
        height: 80%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .approve {
        display: flex;
        width: 80%;
        justify-content: space-around;
        align-items: center;
    }
}
</style>
