let BASE_URL = "https://metruyencv.com.vn";
let HOST_URL = "https://metruyenchu.com.vn";

try {
    if (CONFIG_URL) {
        var configuredUrl = extractOrigin(CONFIG_URL);
        if (configuredUrl && configuredUrl.indexOf("metruyencv.com.vn") >= 0) {
            BASE_URL = configuredUrl;
        }
    }
} catch (error) {
}

function absoluteUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) {
        return url.replace(/^(https?:\/\/)(www\.)?[^\/?#]+/i, HOST_URL);
    }
    if (url.indexOf("//") === 0) return HOST_URL.split(":")[0] + ":" + url;
    if (url.charAt(0) === "/") return HOST_URL + url;
    return HOST_URL + "/" + url.replace(/^\/+/, "");
}

function resourceUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) {
        return url.replace(/^(https?:\/\/)(www\.)?[^\/?#]+/i, BASE_URL);
    }
    if (url.indexOf("//") === 0) return BASE_URL.split(":")[0] + ":" + url;
    if (url.charAt(0) === "/") return BASE_URL + url;
    return BASE_URL + "/" + url.replace(/^\/+/, "");
}

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (url.indexOf("//") === 0) {
        return BASE_URL.split(":")[0] + ":" + url;
    }
    if (/^https?:\/\//i.test(url)) {
        return url.replace(/^(https?:\/\/)(www\.)?[^\/?#]+/i, BASE_URL);
    }
    return resourceUrl(url);
}

function cleanText(text) {
    return (text || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractOrigin(url) {
    var match = String(url || "").match(/^(https?:\/\/[^\/?#]+)/i);
    return match ? match[1].replace(/\/+$/, "") : "";
}
