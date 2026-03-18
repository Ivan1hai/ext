load("crypto.js");
load("config.js");

function extractChapterProps(url) {
    let chapterUrl = normalizeChapterUrl(url);
    let nextData = parseNextDataByUrl(chapterUrl);
    if (!nextData) return null;
    return (((nextData || {}).props || {}).pageProps || null);
}

function buildFirstKey(rs, ri, commentCount) {
    // Keep coercion behavior identical to site runtime:
    // firstKey = "" + (rs[ri] + comment_count)
    return "" + (((rs || {})[ri]) + commentCount);
}

function decryptChapterPayload(pageProps) {
    let chapterEncrypted = pageProps.chapter || {};
    let rsEncrypted = pageProps.rs || {};
    let riEncrypted = pageProps.ri || "";

    let rs = decryptObject(rsEncrypted);
    let ri = decrypt(riEncrypted);
    let firstKey = buildFirstKey(rs, ri, pageProps.comment_count);
    let chapter = decryptObjectWithKey(chapterEncrypted, firstKey);

    if (!chapter.content || chapter.content === "") {
        chapter.content = pageProps.contentEncrypt || "";
    }

    return {
        chapter: chapter,
        firstKey: firstKey
    };
}

function sanitizeChapterContent(raw) {
    if (!raw) return "";

    let content = ("" + raw);

    // Remove debug markers from old hardcoded debug builds.
    content = content.replace(/<h[1-6][^>]*>\s*\[DBG-[\s\S]*?<\/h[1-6]>\s*/gi, "");
    content = content.replace(/<p[^>]*>\s*\[DBG-[\s\S]*?<\/p>\s*/gi, "");
    content = content.replace(/^\s*\[DBG-[^\r\n]*[\r\n]*/gi, "");
    content = content.replace(/\[DBG-V\d+\][^\n\r<]*/gi, "");

    return content.trim();
}

function hasReadableChapterMarkup(text) {
    if (!text) return false;
    return /<p[\s>]|<div[\s>]|<br\s*\/?>/i.test(text);
}

function getLockedErrorMessage(notify) {
    if (notify === "not_login") {
        return "Chuong yeu cau dang nhap. Hay them CONFIG_COOKIE (cookie tai khoan) trong cai dat plugin.";
    }

    if (notify === "no_package") {
        return "Chuong yeu cau goi doc de mo khoa noi dung.";
    }

    return "Khong lay duoc noi dung chuong (co the chuong dang bi khoa).";
}

function execute(url) {
    let pageProps = extractChapterProps(url);
    if (!pageProps) {
        return Response.error("Khong tai duoc du lieu chuong.");
    }

    let parsed = decryptChapterPayload(pageProps);
    if (!parsed || !parsed.chapter) {
        return Response.error(getLockedErrorMessage(pageProps.notify));
    }

    let chapter = parsed.chapter;
    let firstKey = parsed.firstKey;

    let content = "";
    let chapterContent = chapter.content || "";

    if (chapterContent && hasReadableChapterMarkup(chapterContent)) {
        content = chapterContent;
    } else if (chapter.key_encrypt && chapterContent) {
        let secondKey = decryptWithKey(chapter.key_encrypt, firstKey);
        if (secondKey) {
            content = decryptWithKey(chapterContent, secondKey);
        }
    }

    if ((!content || !content.trim()) && chapter.content_comp) {
        let secondKey = decryptWithKey(chapter.key_encrypt || "", firstKey);
        if (secondKey) {
            let maybe = decryptWithKey(chapter.content_comp, secondKey);
            if (maybe && hasReadableChapterMarkup(maybe)) {
                content = maybe;
            }
        }
    }

    if ((!content || !content.trim()) && chapterContent && chapterContent.indexOf("U2FsdGVkX1") !== 0 && chapterContent.length > 120) {
        content = chapterContent;
    }

    content = sanitizeChapterContent(content);

    if (!content || !content.trim()) {
        return Response.error(getLockedErrorMessage(pageProps.notify));
    }

    return Response.success(content);
}
