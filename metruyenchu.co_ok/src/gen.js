function execute(url, page) {
    if (!page) page = '1';
    let doc = Http.get(url + '?page=' + page).html();

    let el = doc.select(".grid.grid-cols-1 > div");
    let list = [];

    el.forEach(e => {
        let name = e.select("p.font-semibold").text();
        let link = e.select("a").first().attr("href");
        let cover = e.select("img").first().attr("src");

        let author = e.select("a[href*='/tac-gia/'] span").text();
        if (!author) author = e.select("span.line-clamp-2").text();

        if (name && link) {
            list.push({
                name: name,
                link: link,
                cover: cover,
                description: author,
                host: "https://metruyenchu.co"
            });
        }
    });

    let next = "";
    if (list.length > 0) {
        next = (parseInt(page) + 1).toString();
    }

    return Response.success(list, next);
}
