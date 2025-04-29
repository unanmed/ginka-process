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

export function format(x: number) {
    let digits = 5;
    x = Math.trunc(x); // 尝试识别为小数，然后向0取整
    if (x == null || !Number.isFinite(x)) return '???'; // 无法识别的数或正负无穷大，显示'???'
    var units = [
        // 单位及其后缀字母，可自定义，如改成千进制下的K、M、G、T、P
        { val: 1e4, suffix: 'w' },
        { val: 1e8, suffix: 'e' },
        { val: 1e12, suffix: 'z' },
        { val: 1e16, suffix: 'j' },
        { val: 1e20, suffix: 'g' }
    ];
    if (Math.abs(x) > 1e20 * Math.pow(10, digits - 2))
        return x.toExponential(0); // 绝对值过大以致于失去精度的数，直接使用科学记数法，系数只保留整数
    var sign = x < 0 ? '-' : '';
    if (sign) --digits; // 符号位单独处理，负号要占一位
    x = Math.abs(x);

    if (x < Math.pow(10, digits)) return sign + x;

    for (var i = 0; i < units.length; ++i) {
        var each = units[i];
        var u = (x / each.val).toFixed(digits).substring(0, digits);
        if (u.indexOf('.') < 0) continue;
        u = u.substring(
            0,
            u[u.length - 2] == '.' ? u.length - 2 : u.length - 1
        );
        return sign + u + each.suffix;
    }
    return sign + x.toExponential(0);
}
