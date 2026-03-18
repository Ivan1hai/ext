load("config.js");

function execute(url) {
    let response = fetch(url);
    if (!response || !response.ok) {
        return Response.error("Không thể tải trang");
    }

    let doc = response.html();

    // Extract novel_id, source_id and chapter_url from script tags
    let novelId = "";
    let sourceId = "";
    let chapterUrl = "";

    doc.select("script").forEach(script => {
        let text = script.html() || "";
        let m;

        m = text.match(/var\s+novel_id\s*=\s*["']?(\d+)["']?/);
        if (m) novelId = m[1];

        m = text.match(/var\s+sourceId\s*=\s*["']?(\d+)["']?/);
        if (m) sourceId = m[1];

        m = text.match(/var\s+chapterUrl\s*=\s*["']([^"']+)["']/);
        if (m) chapterUrl = m[1];
    });

    // If we have the necessary info, call the getChapter API
    if (novelId && sourceId && chapterUrl) {
        let apiUrl = BASE_URL + "/api/getChapter";
        let payload = JSON.stringify({
            novel_id: novelId,
            source_id: sourceId,
            chapter_url: chapterUrl,
            translator: "Vietphrase"
        });

        let apiRes = fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload
        });

        if (apiRes && apiRes.ok) {
            let json;
            try {
                json = apiRes.json();
            } catch (e) {
                json = null;
            }

            if (json && json.content) {
                let content = json.content;
                // Clean up
                content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                content = content.replace(/<ins[^>]*>[\s\S]*?<\/ins>/gi, '');
                content = content.replace(/<!--[\s\S]*?-->/g, '');
                content = content.replace(/Thích truyền hình.*?Nhanh nhất toàn mạng\./gi, '');
                content = content.replace(/(www\.shuhaige\.net)/gi, '');
                // Convert <br> to paragraph structure
                content = content.replace(/(<br\s*\/?>\s*){2,}/gi, '</p><p>');
                content = "<p>" + content + "</p>";
                return Response.success(content);
            }
        }
    }

    // Fallback: try to find content in main HTML (for cases where content is pre-rendered)
    const selectors = [
        "#article",
        "article",
        ".chapter-content",
        "#content",
        ".content",
        "#bookcontent"
    ];

    let contentElement = null;
    for (let selector of selectors) {
        contentElement = doc.select(selector).first();
        if (contentElement && contentElement.html().trim().length > 100) {
            break;
        }
        contentElement = null;
    }

    if (!contentElement) {
        return Response.error("Không tìm thấy nội dung chương");
    }

    let content = contentElement.html();
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<ins[^>]*>[\s\S]*?<\/ins>/gi, '');
    content = content.replace(/<!--[\s\S]*?-->/g, '');

    if (!content || content.trim() === "" || content === "[]") {
        return Response.error("Nội dung chương trống");
    }

    return Response.success(content);
}
