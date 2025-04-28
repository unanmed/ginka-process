/**
 * 检查一个文件的后缀名是否满足要求
 * @param name 文件名
 * @param valid 合法的后缀名
 */
export function checkExt(name: string, valid: string[]) {
    const split = name.split('.');
    if (split.length === 1 || split.length === 0) return false;
    const postfix = '.' + split.at(-1)!;
    return valid.includes(postfix) && !split.at(-2)?.endsWith('_Highlight');
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob | null>(res => {
        canvas.toBlob(blob => {
            res(blob);
        });
    });
}
