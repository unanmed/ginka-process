<template>
    <div class="value">
        <div>{{ hint[type] }}</div>
        <div class="value-one" v-for="(_, key) of list">
            <Icon class="icon" :tower="tower" :icon="Number(key)"></Icon>
            <InputNumber
                class="input"
                @change="onValueChange(Number(key), $event)"
                v-model:value="list[key]"
            ></InputNumber>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onUpdated, ref, watch } from 'vue';
import { Tower } from '../ginka/tower';
import { GinkaMapping } from '../types';
import Icon from './Icon.vue';
import { InputNumber } from 'ant-design-vue';

const props = defineProps<{
    tower: Tower;
    type: keyof GinkaMapping;
}>();

const list = ref<Record<number, number>>({});

const hint: Partial<Record<keyof GinkaMapping, string>> = {
    redGem: '红宝石价值，表示这个红宝石增加多少属性',
    blueGem: '蓝宝石价值，表示这个蓝宝石增加多少属性',
    greenGem: '绿宝石价值，表示这个绿宝石增加多少属性',
    yellowGem: '黄宝石价值，表示这个黄宝石增加多少属性',
    potion: '血瓶价值，表示这个血瓶回复多少血量',
    item: '道具价值，分为 0,1,2 三挡，0 表示价值最低，2 表示价值最高',
    key: '钥匙价值，分为 0,1,2 三挡，0 表示黄钥匙，1 表示蓝钥匙，2 表示红钥匙',
    door: '门价值，分为 0,1,2,4 四挡，0 表示黄门，1 表示蓝门，2 表示红门，3 表示机关门'
};

function update() {
    if (!props.tower.config) return;
    const map = props.tower.config.mapping;

    const data = map[props.type];
    if (data instanceof Array) return;

    list.value = data;
}

function onValueChange(num: number, value: number | string) {
    const parsed = Number(value);
    if (!isNaN(parsed)) props.tower.updateValue(num, parsed);
}

onMounted(update);
onUpdated(update);
watch(props, update);
</script>

<style lang="less" scoped>
.value {
    width: 100%;
    height: 65vh;
    overflow: auto;
    font-size: 16px;

    .value-one {
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: 8px 0;

        .icon {
            margin-right: 32px;
        }

        .input {
            width: 100%;
            margin-right: 34px;
        }
    }
}
</style>
