load("config.js");
load("crypto.js");
load("chap_decode.js");

function stvMd5Hex(text) {
    if (typeof CryptoJS !== "undefined" && CryptoJS && typeof CryptoJS.MD5 === "function") {
        return String(CryptoJS.MD5(String(text)));
    }
    return "";
}

function stvWithLoginHint(message) {
    var text = stvTrim(message);
    if (!text) return text;

    var lower = text.toLowerCase();
    var needHint = lower.indexOf("dang nhap") >= 0
        || lower.indexOf("login") >= 0;

    if (!needHint) return text;
    if (text.indexOf("var AUTH_COOKIE = \"\";") >= 0) return text;

    return text + " Vui long nhap toan bo chuoi cookie vao ma bo sung, vi du: 'var AUTH_COOKIE = \"hstamp=...;_ga=...;...\";'";
}

function stvFoldText(text) {
    var value = stvTrim(text).toLowerCase();
    if (!value) return "";

    try {
        if (typeof value.normalize === "function") {
            value = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
    } catch (_) {
        // Ignore unicode normalization errors.
    }

    return value.replace(/\u0111/g, "d");
}

function stvSleepRetry(delayMs) {
    if (typeof sleep !== "function" || !delayMs || delayMs <= 0) return;
    try {
        sleep(delayMs);
    } catch (_) {
        // Ignore retry sleep errors.
    }
}

function stvShouldRetryReadChapter(json) {
    if (!json) return true;

    var code = stvTrim(json.code);
    if (code === "5" || code === "7" || code === "4002" || code === "10002") {
        return true;
    }

    var message = stvFoldText(stvFirst(json.err, json.info, ""));
    if (!message) return false;

    return message.indexOf("khoi dong lai ung dung") >= 0
        || message.indexOf("tu cap nhat") >= 0
        || message.indexOf("chapterkey") >= 0
        || message.indexOf("readcontextid") >= 0
        || message.indexOf("grantcontext") >= 0;
}

function stvChapterGrantCacheKey(base, payload) {
    return stvNormalizeBase(base)
        + "|"
        + stvTrim(payload.host)
        + "|"
        + stvTrim(payload.bookid)
        + "|"
        + stvTrim(payload.status || "1");
}

function stvReadChapterGrantStore() {
    if (!stvCanUseLocalStorage()) return null;

    try {
        var raw = localStorage.getItem(STV_CONFIG.CHAPTER_GRANT_STORAGE_KEY || "stv.chapter.grant.v1");
        if (!raw) return null;

        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;

        return {
            byBook: parsed.byBook && typeof parsed.byBook === "object" ? parsed.byBook : {},
            updatedAt: parsed.updatedAt && typeof parsed.updatedAt === "object" ? parsed.updatedAt : {}
        };
    } catch (_) {
        return null;
    }
}

function stvWriteChapterGrantStore() {
    if (!stvCanUseLocalStorage()) return;

    try {
        var payload = {
            byBook: STV_STATE.chapterGrantByBook || {},
            updatedAt: STV_STATE.chapterGrantUpdatedAt || {}
        };
        localStorage.setItem(STV_CONFIG.CHAPTER_GRANT_STORAGE_KEY || "stv.chapter.grant.v1", JSON.stringify(payload));
    } catch (_) {
        // Ignore storage write errors.
    }
}

function stvEnsureChapterGrantStoreLoaded() {
    if (STV_STATE.chapterGrantStoreLoaded) return;

    STV_STATE.chapterGrantStoreLoaded = true;
    if (!STV_STATE.chapterGrantByBook) STV_STATE.chapterGrantByBook = {};
    if (!STV_STATE.chapterGrantUpdatedAt) STV_STATE.chapterGrantUpdatedAt = {};

    var store = stvReadChapterGrantStore();
    if (!store) return;

    STV_STATE.chapterGrantByBook = store.byBook || {};
    STV_STATE.chapterGrantUpdatedAt = store.updatedAt || {};
}

function stvGetCachedChapterGrant(base, payload) {
    stvEnsureChapterGrantStoreLoaded();

    var cacheKey = stvChapterGrantCacheKey(base, payload);
    var cached = STV_STATE.chapterGrantByBook[cacheKey];
    if (!cached || !cached.chapterkey || !cached.readcontextid) return null;

    var updatedAt = STV_STATE.chapterGrantUpdatedAt[cacheKey] || 0;
    var ttl = STV_CONFIG.CHAPTER_GRANT_CACHE_TTL_MS || 1800000;
    if (updatedAt > 0 && (new Date().getTime() - updatedAt) > ttl) {
        delete STV_STATE.chapterGrantByBook[cacheKey];
        delete STV_STATE.chapterGrantUpdatedAt[cacheKey];
        stvWriteChapterGrantStore();
        return null;
    }

    return {
        chapterkey: stvTrim(cached.chapterkey),
        readcontextid: stvTrim(cached.readcontextid),
        grantErr: ""
    };
}

function stvSetCachedChapterGrant(base, payload, grant) {
    if (!grant || !grant.chapterkey || !grant.readcontextid) return;
    stvEnsureChapterGrantStoreLoaded();

    var cacheKey = stvChapterGrantCacheKey(base, payload);
    STV_STATE.chapterGrantByBook[cacheKey] = {
        chapterkey: stvTrim(grant.chapterkey),
        readcontextid: stvTrim(grant.readcontextid)
    };
    STV_STATE.chapterGrantUpdatedAt[cacheKey] = new Date().getTime();
    stvWriteChapterGrantStore();
}

function stvClearCachedChapterGrant(base, payload) {
    stvEnsureChapterGrantStoreLoaded();

    var cacheKey = stvChapterGrantCacheKey(base, payload);
    delete STV_STATE.chapterGrantByBook[cacheKey];
    delete STV_STATE.chapterGrantUpdatedAt[cacheKey];
    stvWriteChapterGrantStore();
}

function stvReadChapter(base, payload, grant) {
    if (!grant || !grant.chapterkey) return null;

    var params = {
        sajax: "readchapter",
        h: payload.host,
        bookid: payload.bookid,
        c: payload.cid,
        key: grant.chapterkey
    };

    var sorted = stvSortQuery(params);
    var sign = stvMd5Hex(sorted + STV_CONFIG.SIGN_SALT);
    if (!sign) return null;

    var url = stvBuildUrl(base,
        "/?sajax=readchapter"
        + "&h=" + stvEncode(payload.host)
        + "&bookid=" + stvEncode(payload.bookid)
        + "&c=" + stvEncode(payload.cid)
        + "&key=" + stvEncode(grant.chapterkey)
    );

    var cookieParts = [];
    if (grant.readcontextid) cookieParts.push("readcontextid=" + grant.readcontextid);
    cookieParts.push("mac_tt=true");

    var referer = stvBuildChapterUrl(base, payload.host, payload.bookid, payload.cid, payload.status);

    function requestChapter() {
        var cookie = stvBuildCookie(cookieParts.join("; "), base);
        var requestHeaders = {
            "x-stv-sign": sign,
            "Referer": referer
        };
        if (cookie) requestHeaders["Cookie"] = cookie;

        return stvFetchJson(url, {
            method: "GET",
            headers: stvHeaders(requestHeaders)
        });
    }

    var response = requestChapter();
    if ((!response.ok || !response.json) && stvIsCloudflareBlockedResponse(response)) {
        var synced = stvSyncCloudflareCookie(base, referer);
        if (synced) {
            response = requestChapter();
        }
    }

    if (!response.ok || !response.json) return null;
    return response.json;
}

function execute(url) {
    var payload = stvParseChapterUrl(url);
    if (!payload || !payload.host || !payload.bookid || !payload.cid) {
        return Response.error("URL chuong STV khong hop le.");
    }

    var bases = stvGetBaseCandidates(payload.base);
    var lastErr = "";

    for (var i = 0; i < bases.length; i++) {
        var base = bases[i];
        var maxAttempts = 3;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            var grant = stvGetCachedChapterGrant(base, payload);
            var usedCachedGrant = !!grant;

            if (!grant) {
                grant = stvGrantContext(base, payload.host, payload.bookid, payload.cid, payload.status);
            }

            if (!grant || !grant.chapterkey) {
                stvClearCachedChapterGrant(base, payload);
                lastErr = stvWithLoginHint(stvFirst(grant ? grant.grantErr : "", "Khong lay duoc chapterkey."));
                if (attempt + 1 < maxAttempts) {
                    stvSleepRetry(350 + (attempt * 350));
                    continue;
                }
                break;
            }

            var json = stvReadChapter(base, payload, grant);
            if (!json) {
                stvClearCachedChapterGrant(base, payload);
                lastErr = stvWithLoginHint("Khong doc duoc readchapter.");
                if (attempt + 1 < maxAttempts) {
                    stvSleepRetry(350 + (attempt * 350));
                    continue;
                }
                break;
            }

            if (String(json.code) !== "0") {
                stvClearCachedChapterGrant(base, payload);
                lastErr = stvWithLoginHint(stvFirst(json.err, json.info, "STV tra ve loi khong xac dinh."));
                if (attempt + 1 < maxAttempts && stvShouldRetryReadChapter(json)) {
                    stvSleepRetry(350 + (attempt * 350));
                    continue;
                }
                break;
            }

            STV_STATE.lastBase = base;
            if (!usedCachedGrant || (grant && grant.chapterkey && grant.readcontextid)) {
                stvSetCachedChapterGrant(base, payload, grant);
            }

            var raw = stvFirst(json.data, "");
            var content = stvNormalizeChapterHtml(payload.host, base, raw);
            if (!content) {
                return Response.error("Da nhan du lieu chuong nhung khong co noi dung.");
            }

            return Response.success(content);
        }
    }

    return Response.error(stvWithLoginHint(lastErr || "Khong the tai noi dung chuong STV."));
}
