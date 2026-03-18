let BASE_URL = 'https://www.alicesw.com';
try {
    if (CONFIG_URL) {
        BASE_URL = CONFIG_URL;
    }
} catch (error) {
}

// Desktop User-Agent to use for all network requests
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

// Wrapper around fetch that injects the desktop User-Agent header
function httpGet(url, options) {
    options = options || {};
    const headers = options.headers || {};
    headers['User-Agent'] = DESKTOP_UA;
    options.headers = headers;
    return fetch(url, options);
}

// Best-effort: monkey-patch global fetch so any direct usage also includes the desktop UA
try {
    if (typeof fetch === 'function' && typeof fetch.__uaPatched === 'undefined') {
        const __origFetch = fetch;
        const patched = function (url, options) {
            options = options || {};
            const headers = options.headers || {};
            headers['User-Agent'] = DESKTOP_UA;
            options.headers = headers;
            return __origFetch(url, options);
        };
        // flag to avoid double patching
        patched.__uaPatched = true;
        fetch = patched;
    }
} catch (e) {
    // Ignore if environment does not allow overriding fetch
}