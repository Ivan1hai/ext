load("config.js");

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (url.startsWith("http")) {
        return url.replace(/^http:\/\//i, "https://");
    }
    return BASE_URL + (url.startsWith("/") ? "" : "/") + url;
}

function buildRequestOptions() {
    let options = {};
    if (SESSION_COOKIE) {
        options.headers = {
            Cookie: SESSION_COOKIE
        };
    }
    return options;
}

function fetchPage(url) {
    let response = fetch(url, buildRequestOptions());
    if (response && response.ok) {
        return {
            response: response,
            doc: response.html()
        };
    }

    if (response && (response.status === 403 || response.status === 503 || response.status === 401 || response.status === 400)) {
        let browser = Engine.newBrowser();
        browser.launch(url, 7000);
        let doc = browser.html();
        browser.close();
        return {
            response: response,
            doc: doc
        };
    }

    return null;
}

function isLoginRequired(page) {
    if (!page || !page.doc) return false;
    if (page.response && page.response.url && page.response.url.indexOf("login=required") > -1) return true;

    let hasContent = page.doc.select(".chapter-content").size() > 0
        || page.doc.select("#chapter-content").size() > 0
        || page.doc.select(".content-text").size() > 0;
    let title = page.doc.select("title").text().trim().toLowerCase();

    return title === "trang chủ" && !hasContent;
}

function execute(url) {
    let page = fetchPage(normalizeUrl(url));
    if (!page || !page.doc) {
        return Response.error("Không thể tải chương truyện.");
    }

    if (isLoginRequired(page)) {
        return Response.error("Trang yêu cầu đăng nhập để đọc chương. Có thể cấu hình CONFIG_COOKIE để đọc nội dung đã đăng nhập.");
    }

    let content = page.doc.select(".chapter-content").html();
    if (!content) content = page.doc.select("#chapter-content").html();
    if (!content) content = page.doc.select(".content-text").html();

    if (!content) {
        return Response.error("Không tìm thấy nội dung chương (có thể cấu trúc trang đã thay đổi).");
    }

    return Response.success(content);
}
