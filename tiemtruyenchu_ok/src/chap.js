load("config.js");

function extractContent(doc) {
    let contentEl = doc.select(".chapter-content").first();
    if (!contentEl) contentEl = doc.select("#chapter-content").first();
    if (!contentEl) contentEl = doc.select(".content-text").first();
    if (!contentEl) return "";

    contentEl.select("script").remove();
    contentEl.select("style").remove();
    contentEl.select("noscript").remove();

    let content = contentEl.html() || "";
    content = content.replace(/\\n/g, "<br/>");
    return ttcTrim(content);
}

function execute(url) {
    let page = ttcFetchPage(url, null, 15000);
    if (!page || !page.doc) {
        return Response.error("Khong the tai noi dung chuong.");
    }

    if (page.loginRequired) {
        if (ttcHasCookie()) {
            return Response.error("Khong doc duoc chuong. Cookie dang nhap co the da het han, hay cap nhat lai trong muc Cookie cua plugin.");
        }
        return Response.error("Trang yeu cau dang nhap de doc chuong. Hay dang nhap lai trong trinh duyet tich hop hoac dan cookie tai khoan vao muc Cookie cua plugin.");
    }

    let content = extractContent(page.doc);
    if (!content) {
        return Response.error("Khong tim thay noi dung chuong. Cau truc trang co the da thay doi.");
    }

    return Response.success(content);
}
