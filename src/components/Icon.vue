<template>
    <canvas class="canvas" ref="render"></canvas>
</template>

<script lang="ts" setup>
import { Tower } from 'src/ginka/tower';
import { onMounted, onUpdated, ref, watch } from 'vue';

const props = defineProps<{
    tower: Tower;
    icon: number;
}>();

const render = ref<HTMLCanvasElement>();

function draw() {
    const canvas = render.value;
    if (!canvas) return;
    const image = props.tower.getMapImage(props.icon);
    if (!image) return;
    const [img, sx, sy, sw, sh] = image;
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
}

onMounted(draw);
onUpdated(draw);
watch(props, draw);
</script>

<style lang="less" scoped>
.canvas {
    image-rendering: pixelated;
}
</style>
