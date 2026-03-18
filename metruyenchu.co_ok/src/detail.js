function execute(url) {
    let doc = Http.get(url).html();

    let name = doc.select("h1.font-bold").text();
    let author = doc.select("a[href*='/tac-gia/'] span").text();
    let cover = doc.select("img.aspect-\\[3\\/4\\]").first().attr("src");
    let desc = doc.select(".prose").html();

    let detail = "";
    detail += "Tác giả: " + author + "<br>";

    let stats = doc.select("ul.divide-x > li");
    if (stats.size() > 0) {
        detail += "Đọc: " + stats.get(0).select("p").text() + "<br>";
    }

    let genres = [];
    doc.select("ul.flex-wrap > li").forEach(e => {
        genres.push(e.text());
    });
    if (genres.length > 0) {
        detail += "Thể loại: " + genres.join(", ") + "<br>";
    }

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: desc,
        detail: detail,
        host: "https://metruyenchu.co"
    });
}
