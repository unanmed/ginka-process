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
                    选中后，点击地图上的图块替换为指定图块，擦除用于恢复，装饰一般直接使用编辑器修改，
                    未被处理的图块会被视为空地，怪物除外。编辑完毕注意点击保存。
                </div>
                <div class="type-one" v-for="(text, key) of typeMap">
                    <Button
                        class="button"
                        :selected="selectedType === key"
                        @click="selectedType = key"
                        >{{ text[0] }}</Button
                    >
                    <span class="hotkey">快捷键：{{ text[1] }}</span>
                    <Button
                        v-if="text[3]"
                        class="button"
                        @click="openValue(key)"
                        >设置价值</Button
                    >
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
        </div>
        <Divider class="divider vertical" dashed type="vertical" />
        <div class="mid-panel" @wheel="wheel">
            <div class="map" ref="container">
                <canvas ref="render"></canvas>
            </div>
            <div class="tags">
                <Checkbox
                    v-for="(tag, idx) of tags"
                    v-model:checked="tagCond[idx]"
                    >{{ tag }}</Checkbox
                >
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

<script lang="tsx" setup>
import {
    Divider,
    Button,
    message,
    Slider,
    Checkbox,
    Modal
} from 'ant-design-vue';
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { SingleFolderHandler } from './common/folder';
import type { GinkaMapping } from './types';
import { Tower } from './ginka/tower';
import { clamp } from 'lodash-es';
import Value from './components/Value.vue';

const support = 'showDirectoryPicker' in window;

type TypeKeys = keyof GinkaMapping | 'erase';

// 标签定义：
// 0. 蓝海, 1. 红海, 2: 室内, 3. 野外, 4. 左右对称, 5. 上下对称, 6. 伪对称, 7. 咸鱼层,
// 8. 剧情层, 9. 水层, 10. 爽塔, 11. Boss层, 12. 纯Boss层, 13. 多房间, 14. 多走廊, 15. 道具塔

// 标量值定义：
// 0. 整体密度，非空白图块/地图面积，空白图块还包括装饰图块
// 1. 怪物密度，怪物数量/地图面积
// 2. 资源密度，资源数量/地图面积
// 3. 门密度，门数量/地图面积
// 4. 入口数量

// 图块定义：
// 0. 空地, 1. 墙壁, 2. 装饰（用于野外装饰，视为空地）,
// 3. 黄门, 4. 蓝门, 5. 红门, 6. 机关门, 其余种类的门如绿门都视为红门
// 7-9. 黄蓝红门钥匙，机关门不使用钥匙开启
// 10-12. 三种等级的红宝石
// 13-15. 三种等级的蓝宝石
// 16-18. 三种等级的绿宝石
// 19-22. 四种等级的血瓶
// 23-25. 三种等级的道具
// 26-28. 三种等级的怪物
// 29. 楼梯入口
// 30. 箭头入口

/**
 * [名称，快捷键，KeyCode，是否允许设置价值]
 */
const typeMap: Record<TypeKeys, [string, string, number, boolean]> = {
    erase: ['擦除', '0', 48, false],
    redGem: ['红宝石', '1', 49, true],
    blueGem: ['蓝宝石', '2', 50, true],
    greenGem: ['绿宝石', '3', 51, true],
    yellowGem: ['黄宝石', '4', 52, true],
    item: ['道具', '5', 53, true],
    potion: ['血瓶', '6', 54, true],
    key: ['钥匙', '7', 55, true],
    door: ['门', '8', 56, true],
    wall: ['墙', '9', 57, false],
    floor: ['楼梯', 'Q', 81, false],
    arrow: ['箭头', 'W', 87, false],
    decoration: ['装饰', 'E', 69, false]
};
const tags: string[] = [
    '蓝海',
    '红海',
    '室内',
    '野外',
    '左右对称',
    '上下对称',
    '伪对称',
    '咸鱼层',
    '剧情层',
    '水层',
    '爽塔',
    'Boss层',
    '纯Boss层',
    '多房间',
    '多走廊',
    '道具塔'
];

const folder = new SingleFolderHandler();
const tower = new Tower();

const folderName = ref<string>('');
const selectedType = ref<TypeKeys>('erase');
const nowIndex = ref(0);
const floorCount = ref(2);
const render = ref<HTMLCanvasElement>();
const container = ref<HTMLDivElement>();
const tagCond = reactive<boolean[]>(Array(64).fill(false));

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

function openValue(type: TypeKeys) {
    if (type === 'erase') return;
    Modal.info({
        width: '30%',
        title: '设置价值',
        content: () => <Value tower={tower} type={type}></Value>
    });
}

const abort = new AbortController();

document.addEventListener(
    'keydown',
    e => {
        for (const [key, value] of Object.entries(typeMap)) {
            if (value[2] === e.keyCode) {
                selectedType.value = key as TypeKeys;
            }
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
        } else if (e.keyCode === 83) {
            save();
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

            .hotkey {
                margin-right: 16px;
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

.mid-panel {
    flex-basis: 70%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-around;
    flex-direction: column;

    .map {
        width: 100%;
        height: 80%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .tags {
        display: flex;
        width: 90%;
        flex-direction: row;
        flex-wrap: wrap;

        label {
            font-size: 16px;
            flex-basis: 12.5%;
            min-width: 100px;
        }
    }

    .approve {
        display: flex;
        width: 100%;
        justify-content: space-around;
        align-items: center;
    }
}
</style>
