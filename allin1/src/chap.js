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
    var needHint = lower.indexOf("đăng nhập") >= 0
        || lower.indexOf("dang nhap") >= 0
        || lower.indexOf("login") >= 0;

    if (!needHint) return text;
    if (text.indexOf("var AUTH_COOKIE = \"\";") >= 0) return text;

    return text + " Vui lòng nhập toàn bộ chuỗi cookie vào mã bổ sung, ví dụ: 'var AUTH_COOKIE = \"hstamp=...;_ga=...;...\";'";
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
        return Response.error("URL chÆ°Æ¡ng STV khÃ´ng há»£p lá»‡.");
    }

    var bases = stvGetBaseCandidates(payload.base);
    var lastErr = "";

    for (var i = 0; i < bases.length; i++) {
        var base = bases[i];
        var maxAttempts = 3;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            var grant = stvGrantContext(base, payload.host, payload.bookid, payload.cid, payload.status);

            if (!grant || !grant.chapterkey) {
                lastErr = stvWithLoginHint(stvFirst(grant ? grant.grantErr : "", "KhÃ´ng láº¥y Ä‘Æ°á»£c chapterkey."));
                if (attempt + 1 < maxAttempts) {
                    stvSleepRetry(350 + (attempt * 350));
                    continue;
                }
                break;
            }

            var json = stvReadChapter(base, payload, grant);
            if (!json) {
                lastErr = stvWithLoginHint("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c readchapter.");
                if (attempt + 1 < maxAttempts) {
                    stvSleepRetry(350 + (attempt * 350));
                    continue;
                }
                break;
            }

            if (String(json.code) !== "0") {
                lastErr = stvWithLoginHint(stvFirst(json.err, json.info, "STV tráº£ vá» lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh."));
                if (attempt + 1 < maxAttempts && stvShouldRetryReadChapter(json)) {
                    stvSleepRetry(350 + (attempt * 350));
                    continue;
                }
                break;
            }

            STV_STATE.lastBase = base;

            var raw = stvFirst(json.data, "");
            var content = stvNormalizeChapterHtml(payload.host, base, raw);
            if (!content) {
                return Response.error("ÄÃ£ nháº­n dá»¯ liá»‡u chÆ°Æ¡ng nhÆ°ng khÃ´ng cÃ³ ná»™i dung.");
            }

            return Response.success(content);
        }
    }

    return Response.error(stvWithLoginHint(lastErr || "KhÃ´ng thá»ƒ táº£i ná»™i dung chÆ°Æ¡ng STV."));
}
