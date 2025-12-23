import {IStorageSecurity} from "./StorageManager";

export class SimpleStorageSecurity implements IStorageSecurity {
    key: string = "your-secret-key-32-characters!!";
    iv: string = "your-iv-16-chars";

    init(): void {
        // 初始化加密参数
    }

    // Base64 编码（兼容微信小游戏）
    private base64Encode(str: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        while (i < str.length) {
            const a = str.charCodeAt(i++);
            const b = i < str.length ? str.charCodeAt(i++) : 0;
            const c = i < str.length ? str.charCodeAt(i++) : 0;
            const bitmap = (a << 16) | (b << 8) | c;
            result += chars[(bitmap >> 18) & 63];
            result += chars[(bitmap >> 12) & 63];
            result += chars[(bitmap >> 6) & 63];
            result += chars[bitmap & 63];
        }
        const padding = str.length % 3;
        return padding ? result.slice(0, padding - 3) + '==='.slice(padding) : result;
    }

    // Base64 解码（兼容微信小游戏）
    private base64Decode(str: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        str = str.replace(/=+$/, '');
        let result = '';
        let i = 0;
        while (i < str.length) {
            const a = chars.indexOf(str[i++]);
            const b = chars.indexOf(str[i++]);
            const c = chars.indexOf(str[i++]);
            const d = chars.indexOf(str[i++]);
            const bitmap = (a << 18) | (b << 12) | (c << 6) | d;
            result += String.fromCharCode((bitmap >> 16) & 255);
            if (c !== -1) result += String.fromCharCode((bitmap >> 8) & 255);
            if (d !== -1) result += String.fromCharCode(bitmap & 255);
        }
        return result;
    }

    encrypt(str: string): string {
        return this.xorEncrypt(str, this.key);
    }

    decrypt(str: string): string {
        return this.xorDecrypt(str, this.key);
    }

    encryptKey(str: string): string {
        return this.xorEncrypt(str, this.iv);
    }

    private xorEncrypt(str: string, key: string): string {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return this.base64Encode(result);
    }

    private xorDecrypt(str: string, key: string): string {
        const decoded = this.base64Decode(str);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    }
}
