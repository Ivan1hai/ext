load("config.js");

function stvParseCommentInput(url) {
    var text = stvTrim(url);
    if (!text) return null;

    if (text.indexOf("stvcomment://") === 0) {
        var qPos = text.indexOf("?");
        var qObj = stvParseQuery(qPos >= 0 ? text.substring(qPos + 1) : "");
        return {
            base: stvNormalizeBase(qObj.base),
            host: stvTrim(qObj.host),
            bookid: stvTrim(qObj.bookid || qObj.hid || qObj.id),
            order: stvTrim(qObj.order || "new")
        };
    }

    var byUrl = text.match(/^https?:\/\/([^\/]+)\/[^?]+\?(.*)$/i);
    if (byUrl) {
        var q = stvParseQuery(byUrl[2] || "");
        return {
            base: stvNormalizeBase("https://" + byUrl[1]),
            host: stvTrim(q.host),
            bookid: stvTrim(q.bookid || q.hid || q.id),
            order: stvTrim(q.order || "new")
        };
    }

    var parsedBook = stvParseBookUrl(text);
    if (parsedBook && parsedBook.host && parsedBook.id) {
        return {
            base: parsedBook.base,
            host: parsedBook.host,
            bookid: parsedBook.id,
            order: "new"
        };
    }

    return null;
}

function stvCommentDecodeEntities(text) {
    var value = text === null || typeof text === "undefined" ? "" : String(text);
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&");
}

function stvCommentStripHtml(text) {
    var value = text === null || typeof text === "undefined" ? "" : String(text);
    if (!value) return "";

    value = value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "");

    value = stvCommentDecodeEntities(value);
    value = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    value = value.replace(/[ \t\f\v]+/g, " ");
    value = value.replace(/[ ]*\n[ ]*/g, "\n");
    value = value.replace(/\n{3,}/g, "\n\n");
    return stvTrim(value);
}

function stvCommentEscapeHtml(text) {
    var value = text === null || typeof text === "undefined" ? "" : String(text);
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function stvCommentToHtml(text) {
    var value = stvCommentEscapeHtml(stvCommentStripHtml(text));
    if (!value) return "";
    return value.replace(/\n/g, "<br>");
}

function stvReadCommentPage(base, payload, start) {
    var referer = stvBuildBookUrl(base, payload.host, payload.bookid, 1);
    var url = stvBuildUrl(base,
        "/mobile/comment.php?act=readcomment"
        + "&host=" + stvEncode(payload.host)
        + "&bookid=" + stvEncode(payload.bookid)
        + "&start=" + stvEncode(String(start))
        + "&order=" + stvEncode(payload.order || "new")
    );

    function requestComment() {
        var cookie = stvBuildCookie("mac_tt=true", base);
        var requestHeaders = {
            "Referer": referer
        };
        if (cookie) requestHeaders["Cookie"] = cookie;

        return stvFetchJson(url, {
            method: "GET",
            headers: stvHeaders(requestHeaders)
        });
    }

    var response = requestComment();
    if (stvIsCloudflareBlockedResponse(response)) {
        var synced = stvSyncCloudflareCookie(base, referer);
        if (synced) response = requestComment();
    }

    return response;
}

function stvBuildReplyLines(replies) {
    if (!replies || !replies.length) return [];

    var lines = [];
    for (var i = 0; i < replies.length; i++) {
        var reply = replies[i];
        if (!reply) continue;

        var name = stvFirst(reply.name, reply.nickname, "Ẩn danh");
        var content = stvCommentStripHtml(reply.content);
        if (!content) continue;

        lines.push("↳ " + stvCommentEscapeHtml(name) + ": " + stvCommentEscapeHtml(content));
    }

    return lines;
}

function execute(url, page) {
    var payload = stvParseCommentInput(url);
    if (!payload || !payload.host || !payload.bookid) {
        return Response.error("Không đọc được dữ liệu bình luận STV.");
    }

    var pageNumber = parseInt(stvTrim(page || "1"), 10);
    if (isNaN(pageNumber) || pageNumber < 1) pageNumber = 1;
    var start = (pageNumber - 1) * 10;

    var bases = stvGetBaseCandidates(payload.base);
    var lastErr = "";

    for (var i = 0; i < bases.length; i++) {
        var base = bases[i];
        var response = stvReadCommentPage(base, payload, start);
        if (!response || !response.ok || !response.json) {
            lastErr = "Không thể tải bình luận.";
            continue;
        }

        var json = response.json;
        if (String(json.code) !== "100" || !json.list) {
            lastErr = stvFirst(json.err, json.info, "STV trả dữ liệu bình luận không hợp lệ.");
            continue;
        }

        STV_STATE.lastBase = base;

        var list = json.list || [];
        if (list.length === 0) return Response.success([]);

        var comments = [];
        for (var j = 0; j < list.length; j++) {
            var item = list[j];
            if (!item) continue;

            var name = stvFirst(item.name, item.nickname, "Ẩn danh");
            var time = stvFirst(item.time, item.createdAt, "");
            var contentHtml = stvCommentToHtml(item.content);

            var replies = item.reply && item.reply.length ? item.reply : [];
            var replyLines = stvBuildReplyLines(replies);
            if (replyLines.length > 0) {
                if (contentHtml) contentHtml += "<br>";
                contentHtml += replyLines.join("<br>");
            }

            if (!contentHtml) continue;

            comments.push({
                name: name,
                content: contentHtml,
                description: time
            });
        }

        var next = null;
        if (comments.length > 0) {
            if (pageNumber === 1) {
                // Force page 2 so VBook always shows "xem thêm" from detail tab.
                next = "2";
            } else if (list.length >= 10) {
                next = String(pageNumber + 1);
            }
        }
        return Response.success(comments, next);
    }

    return Response.error(lastErr || "Không tải được bình luận STV.");
}
