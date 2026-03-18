function execute(url) {
    load('config.js');
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        let contentEl = doc.select(".chapter-content").first();
        if (contentEl == null) return Response.success("");

        contentEl.select("script").remove();
        contentEl.select("style").remove();

        let content = contentEl.html();

        content = content.replace(/\\n/g, "<br/>");

        return Response.success(content);
    }

    return null;
}
