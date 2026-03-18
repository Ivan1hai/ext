function execute(url) {
    let doc = Http.get(url).string();

    let lastChapter = 0;

    let regex = /"lastChapter":(\d+)/;
    let match = doc.match(regex);
    if (match) {
        lastChapter = parseInt(match[1]);
    } else {
        // Fallback: check the "Mục lục" badge count
        let badgeRegex = /<span class="w-full group-hover:text-white">(\d+)<\/span>/;
        let badgeMatch = doc.match(badgeRegex);
        if (badgeMatch) {
            lastChapter = parseInt(badgeMatch[1]);
        }
    }

    let list = [];
    for (let i = 1; i <= lastChapter; i++) {
        list.push({
            name: "Chương " + i,
            url: url + "/chuong-" + i,
            host: "https://metruyenchu.co"
        })
    }

    // In case there's no chapters, or we couldn't parse it
    if (list.length === 0) {
        // Try getting latest chapters from HTML
        let docHtml = Html.parse(doc);
        docHtml.select("ul.grid.grid-cols-1 > li > a").forEach(e => {
            let chapUrl = e.attr("href");
            let chapName = e.select("p").text();
            if (chapUrl && chapUrl.indexOf("chuong-") !== -1) {
                list.push({
                    name: chapName,
                    url: "https://metruyenchu.co" + chapUrl,
                    host: "https://metruyenchu.co"
                });
            }
        });
        // We reverse because latest chapters on homepage might be descending, 
        // but vBook expects ascending. (Though wait, generating empty list is bad)
        list.reverse();
    }

    return Response.success(list);
}
