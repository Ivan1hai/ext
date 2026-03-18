let BASE_URL = "https://lacatruyen.club";
let API_URL = BASE_URL + "/api";
let IMAGE_CDN_BASE = "https://cms.metruyen.com/storage/uploads";
let SESSION_COOKIE = "";
// Provide CONFIG_COOKIE from app settings to read locked/login-required chapters.
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const CORE_RAW_KEY = "T5Hr41U5jKTTrtUOXdYZnyx3wjZEKUoxv16Clwwu4D5zIbd0-q9sdfh";
const CORE_KEY = deriveCoreKey(CORE_RAW_KEY);
let CRYPTO_INSTANCE = null;

try {
    if (CONFIG_URL) {
        BASE_URL = ("" + CONFIG_URL).replace(/\/+$/, "");
        API_URL = BASE_URL + "/api";
    }
} catch (e) {
}

try {
    if (CONFIG_COOKIE) {
        SESSION_COOKIE = ("" + CONFIG_COOKIE).trim();
    }
} catch (e) {
}

function deriveCoreKey(raw) {
    let left;
    let right;

    if (!raw) return "defaultKey";

    if (raw.indexOf("-") > -1) {
        let parts = raw.split("-");
        left = parts[0] || "default";
        right = parts[1] || "0000";
    } else {
        let half = Math.ceil(raw.length / 2);
        left = raw.substring(0, half) || "default";
        right = raw.substring(half) || "0000";
    }

    let seed = 1;
    right.split("").forEach(ch => {
        seed = (seed * ch.charCodeAt(0)) % 255;
    });

    return left.split("").map((ch, idx) => {
        let code = ch.charCodeAt(0);
        let rot = (seed + idx * code) % 26;

        if (code >= 65 && code <= 90) {
            return String.fromCharCode((code - 65 + rot) % 26 + 65);
        }

        if (code >= 97 && code <= 122) {
            return String.fromCharCode((code - 97 + rot) % 26 + 97);
        }

        return ch;
    }).join("");
}

function buildHeaders(extra) {
    let headers = {
        "User-Agent": DEFAULT_UA,
        "user-agent": DEFAULT_UA
    };

    if (SESSION_COOKIE) {
        headers.Cookie = SESSION_COOKIE;
        headers.cookie = SESSION_COOKIE;
    }

    if (extra) {
        Object.keys(extra).forEach(k => headers[k] = extra[k]);
    }

    return headers;
}

function toQueryString(params) {
    if (!params) return "";

    let parts = [];
    Object.keys(params).forEach(k => {
        if (params[k] === undefined || params[k] === null) return;
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent("" + params[k]));
    });

    return parts.length > 0 ? ("?" + parts.join("&")) : "";
}

function requestGet(path, query, headers) {
    let url = API_URL + path + toQueryString(query);
    let merged = buildHeaders(headers);
    let options = {
        method: "GET",
        headers: merged
    };
    let response = null;

    try {
        response = fetch(url, options);
    } catch (e) {
        response = null;
    }

    if (!response || !response.ok) {
        delete merged["User-Agent"];
        delete merged["user-agent"];
        try {
            response = fetch(url, options);
        } catch (e) {
            response = null;
        }
    }

    if (!response || !response.ok) {
        try {
            response = fetch(url, { method: "GET" });
        } catch (e) {
            response = null;
        }
    }

    return response;
}

function requestPost(path, body, headers) {
    let merged = buildHeaders(headers);
    merged["Content-Type"] = "application/json";
    let url = API_URL + path;
    let options = {
        method: "POST",
        headers: merged,
        body: JSON.stringify(body || {})
    };
    let response = null;

    try {
        response = fetch(url, options);
    } catch (e) {
        response = null;
    }

    if (!response || !response.ok) {
        delete merged["User-Agent"];
        delete merged["user-agent"];
        try {
            response = fetch(url, options);
        } catch (e) {
            response = null;
        }
    }

    if (!response || !response.ok) {
        try {
            response = fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body || {})
            });
        } catch (e) {
            response = null;
        }
    }

    return response;
}

function safeJson(response) {
    try {
        return response.json();
    } catch (e) {
        return null;
    }
}

function toAbsoluteUrl(url) {
    if (!url) return "";

    let raw = ("" + url).trim();
    if (!raw) return "";

    if (raw.startsWith("/_next/image")) {
        let matched = raw.match(/[?&]url=([^&]+)/i);
        if (matched && matched[1]) {
            try {
                raw = decodeURIComponent(matched[1]);
            } catch (e) {
            }
        }
    }

    if (raw.startsWith("http")) return raw.replace(/^http:\/\//i, "https://");
    if (raw.startsWith("//")) return "https:" + raw;

    if (raw.startsWith("/storage/uploads/")) {
        return "https://cms.metruyen.com" + raw;
    }

    if (raw.startsWith("storage/uploads/")) {
        return "https://cms.metruyen.com/" + raw;
    }

    if (/^[a-zA-Z0-9_.-]+\.(webp|png|jpe?g|gif|avif)$/i.test(raw) && raw.indexOf("/") === -1) {
        return IMAGE_CDN_BASE + "/" + raw;
    }

    return BASE_URL + (raw.startsWith("/") ? "" : "/") + raw;
}

function normalizeStoryUrl(url) {
    if (!url) return BASE_URL;

    if (url.startsWith("http")) {
        return url.replace(/^http:\/\//i, "https://");
    }

    if (url.startsWith("/story/")) {
        return BASE_URL + url;
    }

    if (url.startsWith("story/")) {
        return BASE_URL + "/" + url;
    }

    return BASE_URL + "/story/" + url.replace(/^\/+/, "");
}

function normalizeChapterUrl(url) {
    if (!url) return BASE_URL;

    if (url.startsWith("http")) {
        return url.replace(/^http:\/\//i, "https://");
    }

    if (url.startsWith("/chapter/")) {
        return BASE_URL + url;
    }

    if (url.startsWith("chapter/")) {
        return BASE_URL + "/" + url;
    }

    return BASE_URL + "/chapter/" + url.replace(/^\/+/, "");
}

function parseNextDataByUrl(url) {
    let merged = buildHeaders();
    let options = {
        method: "GET",
        headers: merged
    };
    let response = null;

    try {
        response = fetch(url, options);
    } catch (e) {
        response = null;
    }

    if (!response || !response.ok) {
        delete merged["User-Agent"];
        delete merged["user-agent"];
        try {
            response = fetch(url, options);
        } catch (e) {
            response = null;
        }
    }

    if (!response || !response.ok) {
        try {
            response = fetch(url, { method: "GET" });
        } catch (e) {
            response = null;
        }
    }

    if (!response || !response.ok) return null;

    let doc = response.html();
    let nextEl = doc.select("#__NEXT_DATA__").first();
    if (!nextEl) return null;

    try {
        return JSON.parse(nextEl.html());
    } catch (e) {
        return null;
    }
}

function aesEncrypt(value, key) {
    if (value === undefined || value === null) return "";
    let crypto = getCrypto();
    return crypto.AES.encrypt(value.toString(), key).toString();
}

function aesDecrypt(value, key) {
    try {
        if (!value) return "";
        let crypto = getCrypto();
        return crypto.AES.decrypt(value, key).toString(crypto.enc.Utf8);
    } catch (e) {
        return "";
    }
}

function pickCryptoInstance() {
    try {
        if (typeof CryptoJS !== "undefined" && CryptoJS && CryptoJS.AES) {
            return CryptoJS;
        }
    } catch (e) {
    }

    try {
        if (typeof globalThis !== "undefined" && globalThis.CryptoJS && globalThis.CryptoJS.AES) {
            return globalThis.CryptoJS;
        }
    } catch (e) {
    }

    try {
        if (typeof module !== "undefined" && module && module.exports && module.exports.AES) {
            return module.exports;
        }
    } catch (e) {
    }

    try {
        if (typeof exports !== "undefined" && exports && exports.AES) {
            return exports;
        }
    } catch (e) {
    }

    return null;
}

function patchCryptoRandom(crypto) {
    if (!crypto || !crypto.lib || !crypto.lib.WordArray) return;

    let wa = crypto.lib.WordArray;
    if (wa.__patchedInsecureRandom) return;

    try {
        // Runtime with secure random support should keep native behavior.
        wa.random(1);
        wa.__patchedInsecureRandom = true;
        return;
    } catch (e) {
    }

    // Fallback for runtimes without window.crypto/require("crypto").
    wa.random = function (nBytes) {
        let size = parseInt((nBytes === undefined || nBytes === null) ? "0" : ("" + nBytes), 10);
        if (!size || size < 0) size = 0;

        let words = [];
        for (let i = 0; i < size; i += 4) {
            // Insecure fallback is acceptable here because server only requires a salt value.
            words.push((Math.random() * 0x100000000) | 0);
        }

        return wa.create(words, size);
    };
    wa.__patchedInsecureRandom = true;
}

function ensureCrypto() {
    if (CRYPTO_INSTANCE) return CRYPTO_INSTANCE;

    let picked = pickCryptoInstance();
    if (!picked) {
        throw new Error("CryptoJS unavailable");
    }

    patchCryptoRandom(picked);
    CRYPTO_INSTANCE = picked;
    return CRYPTO_INSTANCE;
}

function getCrypto() {
    return ensureCrypto();
}

function encrypt(value) {
    return aesEncrypt(value, CORE_KEY);
}

function decrypt(value) {
    return aesDecrypt(value, CORE_KEY);
}

function encryptWithKey(value, key) {
    return aesEncrypt(value, key);
}

function decryptWithKey(value, key) {
    return aesDecrypt(value, key);
}

function encryptObject(obj) {
    let out = {};
    Object.keys(obj || {}).forEach(k => {
        out[k] = encrypt(obj[k]);
    });
    return out;
}

function decryptObject(obj) {
    let out = {};
    Object.keys(obj || {}).forEach(k => {
        out[k] = decrypt(obj[k]);
    });
    return out;
}

function decryptObjectWithKey(obj, key) {
    let out = {};
    Object.keys(obj || {}).forEach(k => {
        out[k] = decryptWithKey(obj[k], key);
    });
    return out;
}

function jsToString(value) {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (Array.isArray(value)) return value.join(",");
    return "" + value;
}

function mapStoryItem(item) {
    if (!item) return null;

    let name = (item.title || item.story_title || item.name || "").trim();
    let slug = (item.slug || item.story_slug || "").trim();
    let cover = toAbsoluteUrl(item.image || item.story_image || item.cover || "");
    let author = (item.author || item.story_author || item.pen_name_user || item.name_user || "").trim();
    let description = (item.description || item.story_description || "").trim();

    if (!name) return null;

    let link = "";
    if (slug.startsWith("http")) {
        link = slug;
    } else if (slug.startsWith("/story/")) {
        link = BASE_URL + slug;
    } else if (slug.startsWith("story/")) {
        link = BASE_URL + "/" + slug;
    } else if (slug) {
        link = BASE_URL + "/story/" + slug;
    } else if (item.link) {
        link = normalizeStoryUrl(item.link);
    }

    if (!link) return null;

    return {
        name: name,
        link: link,
        cover: cover,
        description: description || author,
        host: BASE_URL
    };
}
