if (typeof STV_CONFIG === "undefined") {
    var STV_CONFIG = {
        BASES: [
            "https://dns1.stv-appdomain-00000001.org",
            "https://sangtacviet.com"
        ],
        PUBLIC_BASE: "https://sangtacviet.com",
        USER_AGENT: "Mozilla/5.0 (Linux; Android 11; sdk_gphone64_x86_64 Build/RSR1.201013.001.A1) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36",
        SIGN_SALT: "erogh982^%*%^*",
        CF_SYNC_TIMEOUT_MS: 15000,
        CF_COOKIE_CACHE_TTL_MS: 1800000,
        CF_COOKIE_STORAGE_KEY: "stv.cf.cookie.v1",
        APP_HEADERS: {
            "x-stv-transport": "app",
            "x-requested-with": "com.sangtacviet.mobilereader"
        }
    };
}

if (typeof STV_STATE === "undefined") {
    var STV_STATE = {
        lastBase: STV_CONFIG.BASES[0],
        cfCookieByBase: {},
        cfCookieUpdatedAt: {},
        cfCookieStoreLoaded: false
    };
}

if (typeof AUTH_COOKIE === "undefined") {
    var AUTH_COOKIE = "";
}

function stvTrim(text) {
    if (text === null || typeof text === "undefined") return "";
    return String(text).replace(/^\s+|\s+$/g, "");
}

function stvFirst(v1, v2, v3) {
    var values = [v1, v2, v3];
    for (var i = 0; i < values.length; i++) {
        var value = stvTrim(values[i]);
        if (value) return value;
    }
    return "";
}

function stvEncode(text) {
    return encodeURIComponent(text === null || typeof text === "undefined" ? "" : String(text));
}

function stvDecode(text) {
    try {
        return decodeURIComponent(text === null || typeof text === "undefined" ? "" : String(text));
    } catch (_) {
        return text === null || typeof text === "undefined" ? "" : String(text);
    }
}

function stvNormalizeBase(base) {
    var value = stvTrim(base);
    if (!value) return "";

    if (value.indexOf("http://") !== 0 && value.indexOf("https://") !== 0) {
        value = "https://" + value;
    }

    while (value.length > 0 && value.charAt(value.length - 1) === "/") {
        value = value.substring(0, value.length - 1);
    }

    return value;
}

function stvBuildUrl(base, path) {
    var normalizedBase = stvNormalizeBase(base);
    if (!normalizedBase) return "";
    if (!path) return normalizedBase;
    if (path.indexOf("http://") === 0 || path.indexOf("https://") === 0) return path;
    if (path.charAt(0) !== "/") return normalizedBase + "/" + path;
    return normalizedBase + path;
}

function stvPublicBase() {
    return stvNormalizeBase(STV_CONFIG.PUBLIC_BASE || STV_CONFIG.BASES[0]);
}

function stvGetBaseCandidates(preferredBase) {
    var result = [];
    var seen = {};

    function add(base) {
        var normalized = stvNormalizeBase(base);
        if (!normalized) return;
        if (seen[normalized]) return;
        seen[normalized] = true;
        result.push(normalized);
    }

    add(preferredBase);
    add(STV_STATE.lastBase);

    for (var i = 0; i < STV_CONFIG.BASES.length; i++) {
        add(STV_CONFIG.BASES[i]);
    }

    return result;
}

function stvMergeHeaders(baseHeaders, extraHeaders) {
    var out = {};
    var key;

    if (baseHeaders) {
        for (key in baseHeaders) {
            if (baseHeaders.hasOwnProperty(key)) out[key] = baseHeaders[key];
        }
    }

    if (extraHeaders) {
        for (key in extraHeaders) {
            if (extraHeaders.hasOwnProperty(key) && extraHeaders[key] !== null && typeof extraHeaders[key] !== "undefined") {
                out[key] = extraHeaders[key];
            }
        }
    }

    return out;
}

function stvHeaders(extraHeaders) {
    var headers = {
        "User-Agent": STV_CONFIG.USER_AGENT,
        "Accept": "*/*"
    };

    headers = stvMergeHeaders(headers, STV_CONFIG.APP_HEADERS);
    headers = stvMergeHeaders(headers, extraHeaders);
    return headers;
}

function stvNormalizeCookieText(cookieText) {
    var text = stvTrim(cookieText);
    if (!text) return "";
    return text.replace(/^[;\s]+|[;\s]+$/g, "");
}

function stvCanUseLocalStorage() {
    try {
        return typeof localStorage !== "undefined" && !!localStorage;
    } catch (_) {
        return false;
    }
}

function stvReadCloudflareCookieStore() {
    if (!stvCanUseLocalStorage()) return null;

    try {
        var raw = localStorage.getItem(STV_CONFIG.CF_COOKIE_STORAGE_KEY || "stv.cf.cookie.v1");
        if (!raw) return null;

        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;

        var byBase = parsed.byBase && typeof parsed.byBase === "object" ? parsed.byBase : {};
        var updatedAt = parsed.updatedAt && typeof parsed.updatedAt === "object" ? parsed.updatedAt : {};

        return {
            byBase: byBase,
            updatedAt: updatedAt
        };
    } catch (_) {
        return null;
    }
}

function stvWriteCloudflareCookieStore() {
    if (!stvCanUseLocalStorage()) return;

    try {
        var payload = {
            byBase: STV_STATE.cfCookieByBase || {},
            updatedAt: STV_STATE.cfCookieUpdatedAt || {}
        };
        localStorage.setItem(STV_CONFIG.CF_COOKIE_STORAGE_KEY || "stv.cf.cookie.v1", JSON.stringify(payload));
    } catch (_) {
        // Ignore storage write errors (quota/private mode/unsupported).
    }
}

function stvEnsureCloudflareCookieStoreLoaded() {
    if (STV_STATE.cfCookieStoreLoaded) return;

    STV_STATE.cfCookieStoreLoaded = true;
    if (!STV_STATE.cfCookieByBase) STV_STATE.cfCookieByBase = {};
    if (!STV_STATE.cfCookieUpdatedAt) STV_STATE.cfCookieUpdatedAt = {};

    var store = stvReadCloudflareCookieStore();
    if (!store) return;

    STV_STATE.cfCookieByBase = store.byBase || {};
    STV_STATE.cfCookieUpdatedAt = store.updatedAt || {};
}

function stvBuildCookie(cookieText) {
    function mergeCookieText(store, text) {
        var raw = stvNormalizeCookieText(text);
        if (!raw) return;
        var parts = raw.split(";");
        for (var i = 0; i < parts.length; i++) {
            var item = stvTrim(parts[i]);
            if (!item) continue;
            var eq = item.indexOf("=");
            if (eq <= 0) continue;
            var key = stvTrim(item.substring(0, eq));
            var value = stvTrim(item.substring(eq + 1));
            if (!key || !value) continue;
            store[key] = value;
        }
    }

    var base = arguments.length >= 2 ? arguments[1] : STV_STATE.lastBase;
    var baseCookie = stvNormalizeCookieText(cookieText);
    var authCookie = stvNormalizeCookieText(AUTH_COOKIE);
    var cfCookie = stvNormalizeCookieText(stvGetCloudflareCookieForBase(base));
    var merged = {};
    var parts = [];

    mergeCookieText(merged, baseCookie);
    mergeCookieText(merged, authCookie);
    mergeCookieText(merged, cfCookie);

    for (var key in merged) {
        if (!merged.hasOwnProperty(key)) continue;
        parts.push(key + "=" + merged[key]);
    }

    if (parts.length === 0) return "";

    return parts.join("; ") + ";";
}

function stvPickCloudflareCookie(cookieText) {
    var raw = stvNormalizeCookieText(cookieText);
    if (!raw) return "";

    var parts = raw.split(";");
    var out = [];
    var seen = {};
    for (var i = 0; i < parts.length; i++) {
        var item = stvTrim(parts[i]);
        if (!item) continue;
        var eq = item.indexOf("=");
        if (eq <= 0) continue;
        var key = stvTrim(item.substring(0, eq));
        var value = stvTrim(item.substring(eq + 1));
        if (!key || !value) continue;
        var lower = key.toLowerCase();
        if (lower !== "cf_clearance" && lower.indexOf("__cf") !== 0) continue;
        if (seen[lower]) continue;
        seen[lower] = true;
        out.push(key + "=" + value);
    }

    return out.join("; ");
}

function stvGetCloudflareCookieForBase(base) {
    var normalizedBase = stvNormalizeBase(base);
    if (!normalizedBase) return "";

    stvEnsureCloudflareCookieStoreLoaded();

    if (!STV_STATE.cfCookieByBase) STV_STATE.cfCookieByBase = {};
    if (!STV_STATE.cfCookieUpdatedAt) STV_STATE.cfCookieUpdatedAt = {};

    var cookie = stvNormalizeCookieText(STV_STATE.cfCookieByBase[normalizedBase]);
    if (!cookie) return "";

    var ttl = STV_CONFIG.CF_COOKIE_CACHE_TTL_MS || 1800000;
    var updatedAt = STV_STATE.cfCookieUpdatedAt[normalizedBase] || 0;
    if (updatedAt > 0 && (new Date().getTime() - updatedAt) > ttl) {
        delete STV_STATE.cfCookieByBase[normalizedBase];
        delete STV_STATE.cfCookieUpdatedAt[normalizedBase];
        stvWriteCloudflareCookieStore();
        return "";
    }

    return cookie;
}

function stvSetCloudflareCookieForBase(base, cookieText) {
    var normalizedBase = stvNormalizeBase(base);
    var picked = stvPickCloudflareCookie(cookieText);
    if (!normalizedBase || !picked) return "";

    stvEnsureCloudflareCookieStoreLoaded();

    if (!STV_STATE.cfCookieByBase) STV_STATE.cfCookieByBase = {};
    if (!STV_STATE.cfCookieUpdatedAt) STV_STATE.cfCookieUpdatedAt = {};

    STV_STATE.cfCookieByBase[normalizedBase] = picked;
    STV_STATE.cfCookieUpdatedAt[normalizedBase] = new Date().getTime();
    stvWriteCloudflareCookieStore();
    return picked;
}

function stvGetHeaderValue(headers, wantedName) {
    if (!headers || !wantedName) return "";

    var lowerWanted = String(wantedName).toLowerCase();

    if (typeof headers.get === "function") {
        var direct = headers.get(wantedName);
        if (direct) return String(direct);

        var lowered = headers.get(lowerWanted);
        if (lowered) return String(lowered);
    }

    var keys = [wantedName, lowerWanted, "Set-Cookie", "set-cookie"];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (typeof headers[key] !== "undefined" && headers[key] !== null) {
            var value = headers[key];
            if (Object.prototype.toString.call(value) === "[object Array]") {
                return value.join("; ");
            }
            return String(value);
        }
    }

    for (var name in headers) {
        if (!headers.hasOwnProperty(name)) continue;
        if (String(name).toLowerCase() !== lowerWanted) continue;
        var val = headers[name];
        if (Object.prototype.toString.call(val) === "[object Array]") {
            return val.join("; ");
        }
        return String(val);
    }

    return "";
}

function stvExtractSetCookie(headers) {
    return stvGetHeaderValue(headers, "set-cookie");
}

function stvFindReadContextId(setCookieText) {
    var text = stvTrim(setCookieText);
    if (!text) return "";

    var match = text.match(/readcontextid=([^;\s]+)/i);
    return match && match[1] ? match[1] : "";
}

function stvParseJsonLoose(text) {
    if (text === null || typeof text === "undefined") return null;

    var data = String(text).replace(/^\uFEFF/, "");
    var first = data.indexOf("{");
    if (first > 0) data = data.substring(first);

    data = stvTrim(data);
    if (!data) return null;

    try {
        return JSON.parse(data);
    } catch (_) {
        return null;
    }
}

function stvFetchText(url, options) {
    try {
        var response = fetch(url, options || {});
        var text = response ? response.text() : "";
        return {
            ok: !!(response && response.ok),
            status: response ? response.status : 0,
            text: text,
            headers: response ? response.headers : null,
            response: response
        };
    } catch (e) {
        return {
            ok: false,
            status: 0,
            text: "",
            headers: null,
            response: null,
            error: e
        };
    }
}

function stvFetchJson(url, options) {
    var result = stvFetchText(url, options);
    result.json = stvParseJsonLoose(result.text);
    return result;
}

function stvLooksLikeCloudflareText(text) {
    var sample = stvTrim(text).toLowerCase();
    if (!sample) return false;
    return sample.indexOf("cloudflare") >= 0
        || sample.indexOf("just a moment") >= 0
        || sample.indexOf("attention required") >= 0
        || sample.indexOf("cf-browser-verification") >= 0
        || sample.indexOf("challenge-platform") >= 0;
}

function stvIsCloudflareBlockedResponse(responseLike) {
    if (!responseLike) return false;
    var status = responseLike.status || 0;
    if (status === 403 || status === 429 || status === 503 || status === 1020) return true;
    return stvLooksLikeCloudflareText(responseLike.text || "");
}

function stvSyncCloudflareCookie(base, hintUrl) {
    var normalizedBase = stvNormalizeBase(base || STV_STATE.lastBase || STV_CONFIG.BASES[0]);
    if (!normalizedBase) return false;

    if (typeof Engine === "undefined" || !Engine || typeof Engine.newBrowser !== "function") {
        return false;
    }

    var browser = null;
    try {
        browser = Engine.newBrowser();
        if (!browser || typeof browser.launch !== "function") return false;

        if (typeof browser.setUserAgent === "function") {
            browser.setUserAgent(STV_CONFIG.USER_AGENT);
        }

        if (typeof browser.overrideCookie === "function") {
            var mergedCookie = stvBuildCookie("", normalizedBase);
            var cookieObj = {};
            var cookiePairs = stvNormalizeCookieText(mergedCookie).split(";");
            var hasCookie = false;
            for (var i = 0; i < cookiePairs.length; i++) {
                var pair = stvTrim(cookiePairs[i]);
                if (!pair) continue;
                var eq = pair.indexOf("=");
                if (eq <= 0) continue;
                var key = stvTrim(pair.substring(0, eq));
                var value = stvTrim(pair.substring(eq + 1));
                if (!key || !value) continue;
                cookieObj[key] = value;
                hasCookie = true;
            }
            if (hasCookie) {
                browser.overrideCookie(cookieObj);
            }
        }

        var openUrl = stvTrim(hintUrl);
        if (!(openUrl.indexOf("http://") === 0 || openUrl.indexOf("https://") === 0)) {
            openUrl = stvBuildUrl(normalizedBase, "/");
        }

        browser.launch(openUrl, STV_CONFIG.CF_SYNC_TIMEOUT_MS || 15000);

        if (typeof browser.callJs !== "function" || typeof browser.getVariable !== "function") {
            return false;
        }

        var key = "stv_cf_cookie_sync_" + Math.random().toString(36).substring(2);
        var js = "try{Cache.putVariable('" + key + "', String(document.cookie||''));}"
            + "catch(e){try{Cache.putVariable('" + key + "', '');}catch(_){}}";
        browser.callJs(js, 4000);
        var rawCookie = stvTrim(browser.getVariable(key));
        var picked = stvSetCloudflareCookieForBase(normalizedBase, rawCookie);
        return !!picked;
    } catch (_) {
        return false;
    } finally {
        try {
            if (browser && typeof browser.close === "function") browser.close();
        } catch (_) {
            // Ignore close errors.
        }
    }
}

function stvSearchJsonOnBases(path, optionsBuilder, preferredBase) {
    var bases = stvGetBaseCandidates(preferredBase);
    var lastError = null;

    for (var i = 0; i < bases.length; i++) {
        var base = bases[i];
        var url = stvBuildUrl(base, path);
        var options = optionsBuilder ? (optionsBuilder(base, url) || {}) : {};

        var response = stvFetchJson(url, options);
        if (!response.ok || !response.json) {
            lastError = response.error || ("HTTP " + response.status);
            continue;
        }

        STV_STATE.lastBase = base;
        return {
            base: base,
            url: url,
            response: response,
            json: response.json
        };
    }

    return {
        error: lastError || "Không thể kết nối máy chủ STV"
    };
}

function stvBuildBookUrl(base, host, bookid, status) {
    var state = stvTrim(status);
    if (!state) state = "1";

    return stvBuildUrl(base, "/truyen/" + stvEncode(host) + "/" + stvEncode(state) + "/" + stvEncode(bookid) + "/");
}

function stvBuildPublicBookUrl(host, bookid, status, preferredBase) {
    var state = stvTrim(status);
    if (!state) state = "1";

    var hostKey = stvTrim(host).toLowerCase();
    if (hostKey === "jjwxc") {
        var baseHint = stvNormalizeBase(preferredBase || STV_STATE.lastBase || STV_CONFIG.BASES[0]);
        return "https://www.jjwxc.net/onebook.php?novelid="
            + stvEncode(bookid)
            + "&host=" + stvEncode(host)
            + "&hid=" + stvEncode(bookid)
            + "&status=" + stvEncode(state)
            + "&base=" + stvEncode(baseHint);
    }

    return stvBuildUrl(stvPublicBase(), "/truyen/" + stvEncode(host) + "/" + stvEncode(state) + "/" + stvEncode(bookid) + "/");
}

function stvBuildPublicChapterUrl(host, bookid, cid, status) {
    var state = stvTrim(status);
    if (!state) state = "1";
    return stvBuildUrl(stvPublicBase(),
        "/truyen/"
        + stvEncode(host)
        + "/"
        + stvEncode(state)
        + "/"
        + stvEncode(bookid)
        + "/"
        + stvEncode(cid)
        + "/"
    );
}

function stvParseQuery(queryText) {
    var result = {};
    var text = stvTrim(queryText);
    if (!text) return result;

    if (text.charAt(0) === "?") text = text.substring(1);

    var pairs = text.split("&");
    for (var i = 0; i < pairs.length; i++) {
        if (!pairs[i]) continue;
        var idx = pairs[i].indexOf("=");
        var rawKey = idx >= 0 ? pairs[i].substring(0, idx) : pairs[i];
        var rawVal = idx >= 0 ? pairs[i].substring(idx + 1) : "";
        var key = stvDecode(rawKey);
        result[key] = stvDecode(rawVal);
    }

    return result;
}

function stvParseBookUrl(url) {
    var text = stvTrim(url);
    if (!text) return null;

    var embeddedBookPos = text.indexOf("stvbook://");
    if (embeddedBookPos > 0) {
        text = text.substring(embeddedBookPos);
    }

    if (text.indexOf("stvbook://") === 0) {
        var qPos = text.indexOf("?");
        var qObj = stvParseQuery(qPos >= 0 ? text.substring(qPos + 1) : "");
        return {
            base: stvNormalizeBase(qObj.base),
            host: stvTrim(qObj.host),
            id: stvTrim(qObj.bookid || qObj.id),
            status: stvTrim(qObj.status || qObj.state || "1")
        };
    }

    var byLink = text.match(/^https?:\/\/([^\/]+)\/truyen\/([^\/]+)\/([^\/]+)\/([^\/\?#]+)(?:\/|$)/i);
    if (byLink) {
        return {
            base: stvNormalizeBase("https://" + byLink[1]),
            host: stvDecode(byLink[2]),
            status: stvDecode(byLink[3]),
            id: stvDecode(byLink[4])
        };
    }

    var qIndex = text.indexOf("?");
    if (qIndex >= 0) {
        var q = stvParseQuery(text.substring(qIndex + 1));
        if (q.host && (q.hid || q.bookid || q.id)) {
            return {
                base: stvNormalizeBase(q.base || STV_STATE.lastBase || STV_CONFIG.BASES[0]),
                host: stvTrim(q.host),
                id: stvTrim(q.hid || q.bookid || q.id),
                status: stvTrim(q.status || q.state || "1")
            };
        }
    }

    return null;
}

function stvParseChapterUrl(url) {
    var text = stvTrim(url);
    if (!text) return null;

    var embeddedChapPos = text.indexOf("stvchap://");
    if (embeddedChapPos > 0) {
        text = text.substring(embeddedChapPos);
    }

    if (text.indexOf("stvchap://") === 0) {
        var qPos = text.indexOf("?");
        var qObj = stvParseQuery(qPos >= 0 ? text.substring(qPos + 1) : "");
        return {
            base: stvNormalizeBase(qObj.base),
            host: stvTrim(qObj.host),
            status: stvTrim(qObj.status || qObj.state || "1"),
            bookid: stvTrim(qObj.bookid || qObj.id),
            cid: stvTrim(qObj.cid || qObj.chapterid)
        };
    }

    var byLink = text.match(/^https?:\/\/([^\/]+)\/truyen\/([^\/]+)\/([^\/]+)\/([^\/\?#]+)\/([^\/\?#]+)(?:\/|$)/i);
    if (byLink) {
        return {
            base: stvNormalizeBase("https://" + byLink[1]),
            host: stvDecode(byLink[2]),
            status: stvDecode(byLink[3]),
            bookid: stvDecode(byLink[4]),
            cid: stvDecode(byLink[5])
        };
    }

    return null;
}

function stvChapterPayloadUrl(base, host, bookid, cid) {
    return "stvchap://read?base="
        + stvEncode(stvNormalizeBase(base))
        + "&host=" + stvEncode(host)
        + "&bookid=" + stvEncode(bookid)
        + "&cid=" + stvEncode(cid);
}

function stvNormalizeCover(cover, base) {
    var c = stvTrim(cover);
    if (!c) return "";
    if (c.indexOf("http://") === 0 || c.indexOf("https://") === 0) return c;
    return stvBuildUrl(base, c);
}

function stvParseChapterList(rawData) {
    var raw = stvTrim(rawData);
    if (!raw) return [];

    var rows = raw.split("-//-");
    var list = [];
    var seen = {};

    for (var i = 0; i < rows.length; i++) {
        var row = stvTrim(rows[i]);
        if (!row) continue;

        var cols = row.split("-/-");
        if (cols.length < 3) continue;

        var cid = stvTrim(cols[1]);
        var title = stvTrim(cols[2]);

        if (!cid || !title) continue;

        var dedup = cid + "|" + title;
        if (seen[dedup]) continue;
        seen[dedup] = true;

        var vipFlag = stvTrim(cols.length >= 4 ? cols[3] : "").toLowerCase();
        var isVip = vipFlag === "vip";
        var isUnlocked = vipFlag === "unvip";

        list.push({
            cid: cid,
            title: title,
            vip: isVip,
            unvip: isUnlocked
        });
    }

    return list;
}

function stvIsOngoing(status) {
    var text = stvTrim(status).toLowerCase();
    if (!text) return true;

    var ascii = text
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
        .replace(/[èéẹẻẽêềếệểễ]/g, "e")
        .replace(/[ìíịỉĩ]/g, "i")
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
        .replace(/[ùúụủũưừứựửữ]/g, "u")
        .replace(/[ỳýỵỷỹ]/g, "y")
        .replace(/đ/g, "d");

    if (text === "1") return true;
    if (text === "0" || text === "2") return false;

    if (ascii.indexOf("con tiep") >= 0 || ascii.indexOf("dang ra") >= 0) return true;
    if (ascii.indexOf("hoan") >= 0 || ascii.indexOf("tam ngung") >= 0) return false;

    return true;
}

function stvStatusText(status) {
    var text = stvTrim(status);
    if (text === "1") return "Còn tiếp";
    if (text === "2") return "Tạm ngưng";
    if (text === "0") return "Hoàn thành";
    return text;
}
