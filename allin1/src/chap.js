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
    function requestChapter() {
        var cookie = stvBuildCookie(cookieParts.join("; "), base);
        var requestHeaders = {
            "x-stv-sign": sign,
            "Referer": stvBuildBookUrl(base, payload.host, payload.bookid, 1)
        };
        if (cookie) requestHeaders["Cookie"] = cookie;

        return stvFetchJson(url, {
            method: "GET",
            headers: stvHeaders(requestHeaders)
        });
    }

    var response = requestChapter();
    if ((!response.ok || !response.json) && stvIsCloudflareBlockedResponse(response)) {
        var synced = stvSyncCloudflareCookie(base, stvBuildBookUrl(base, payload.host, payload.bookid, 1));
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
        return Response.error("URL chương STV không hợp lệ.");
    }

    var bases = stvGetBaseCandidates(payload.base);
    var lastErr = "";

    for (var i = 0; i < bases.length; i++) {
        var base = bases[i];
        var grant = stvGrantContext(base, payload.host, payload.bookid, payload.cid);

        if (!grant || !grant.chapterkey) {
            lastErr = stvWithLoginHint(stvFirst(grant ? grant.grantErr : "", "Không lấy được chapterkey."));
            continue;
        }

        var json = stvReadChapter(base, payload, grant);
        if (!json) {
            lastErr = stvWithLoginHint("Không đọc được readchapter.");
            continue;
        }

        if (String(json.code) !== "0") {
            lastErr = stvWithLoginHint(stvFirst(json.err, json.info, "STV trả về lỗi không xác định."));
            continue;
        }

        STV_STATE.lastBase = base;

        var raw = stvFirst(json.data, "");
        var content = stvNormalizeChapterHtml(payload.host, base, raw);
        if (!content) {
            return Response.error("Đã nhận dữ liệu chương nhưng không có nội dung.");
        }

        return Response.success(content);
    }

    return Response.error(stvWithLoginHint(lastErr || "Không thể tải nội dung chương STV."));
}
