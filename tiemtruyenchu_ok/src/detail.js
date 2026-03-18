load('config.js');
function execute(url) {
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);
    let response = fetch(url);

    if (response.ok) {
        let doc = response.html();

        let name = doc.select(".story-header h2 span.align-middle").last().text();

        let cover = doc.select(".story-poster").first().attr("src");

        let author = doc.select("a.tag-pill[href*='/tac-gia/']").first().text().trim();

        let description = doc.select("#tab-info").first().html();

        let genres = [];
        doc.select("a.tag-pill[href*='cat=']").forEach(e => {
            genres.push({ title: e.text(), input: e.attr("href"), script: "gen.js" });
        });
        doc.select("a.tag-pill[href*='tag=']").forEach(e => {
            genres.push({ title: e.text(), input: e.attr("href"), script: "gen.js" });
        });

        return Response.success({
            name: name,
            cover: cover,
            author: author,
            description: description,
            detail: "",
            host: BASE_URL,
            genres: genres,
            ongoing: doc.text().indexOf("Đang ra") !== -1
        });
    }
    return null;
}
