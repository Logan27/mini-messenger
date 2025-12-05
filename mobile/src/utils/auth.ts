
// Base64 decoder for React Native
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const atobPolyfill = (input: string) => {
    const str = input.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 == 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (let bc = 0, bs = 0, buffer, i = 0;
        buffer = str.charAt(i++);

        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
            bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
        buffer = chars.indexOf(buffer);
    }

    return output;
};

export const isTokenExpired = (token: string): boolean => {
    if (!token) return true;

    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return true;

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        // Use global atob if available, otherwise use polyfill
        const decoder = (typeof atob === 'function') ? atob : atobPolyfill;

        const jsonPayload = decodeURIComponent(decoder(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);

        if (!payload.exp) {
            return false;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        // 10s buffer
        return currentTime >= (payload.exp - 10);
    } catch (error) {
        // If decoding fails, assume expired to force refresh/login
        return true;
    }
};
