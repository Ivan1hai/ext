load("config.js");

function normalizeEntities(text) {
    return (text || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function formatChapterContent(rawHtml) {
    var text = rawHtml || "";

    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/(p|div|li|blockquote|h[1-6])>/gi, "\n");
    text = text.replace(/<(p|div|li|blockquote|h[1-6])[^>]*>/gi, "");
    text = text.replace(/<[^>]+>/g, " ");

    text = normalizeEntities(text);
    text = text.replace(/\r/g, "");
    text = text.replace(/[ \t]+\n/g, "\n");
    text = text.replace(/\n[ \t]+/g, "\n");
    text = text.replace(/[ \t]{2,}/g, " ");
    text = text.replace(/\n{2,}/g, "\n");
    text = text.trim();

    if (!text) return "";

    text = text.replace(/([.!?\u2026\u3002\uFF01\uFF1F]+)([\u201C\u2018])/g, "$1\n$2");
    text = text.replace(/([.!?\u2026\u3002\uFF01\uFF1F]+["'\u201D\u2019)\]]*)\s+/g, "$1\n");
    text = text.replace(/\n{2,}/g, "\n");

    var lines = [];
    text.split("\n").forEach(function (line) {
        var cleaned = (line || "").trim();
        if (cleaned) lines.push(cleaned);
    });

    return lines.join("<br/>");
}

function execute(url) {
    var requestUrl = normalizeUrl(url);
    var response = fetch(requestUrl);
    if (!response.ok) return null;

    var doc = response.html();
    var contentEl = doc.select("#chapter-c").first();
    if (!contentEl) contentEl = doc.select(".chapter-c").first();
    if (!contentEl) return null;

    contentEl.select(".ads,script,ins,iframe,.highlight-box").remove();
    return Response.success(formatChapterContent(contentEl.html()));
}
