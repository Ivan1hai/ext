load('config.js');

function absoluteUrl(url) {
    if (!url) return "";
    if (url.indexOf("http") === 0) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    return BASE_URL + (url.charAt(0) === "/" ? "" : "/") + url;
}

function execute(url) {
    let response = httpGet(url);
    if (response.ok) {
        let doc = response.html();
        var genres = [];
        let infoItems = doc.select(".box_info .novel_info p");
        if (infoItems.size() > 1) {
            infoItems.get(1).select("a").forEach(function (e) {
                let title = e.text().trim();
                let href = e.attr("href");
                if (!title || !href) return;
                genres.push({
                    title: title,
                    input: absoluteUrl(href),
                    script: "gen.js"
                });
            });
        }

        let name = doc.select(".box_info .novel_title").text().trim();
        if (!name) {
            name = doc.select(".box_info h1").text().trim();
        }
        if (!name) {
            name = doc.select(".box_intro .pic img").attr("alt").trim();
        }

        let cover = doc.select(".lazyload_book_cover").attr("data-src");
        if (!cover) {
            cover = doc.select(".lazyload_book_cover").attr("src");
        }

        let author = "";
        if (infoItems.size() > 0) {
            author = infoItems.get(0).select("a").text().trim();
        }
        if (!author) {
            author = doc.select(".box_info p:nth-child(2) > a:nth-child(1)").text().trim();
        }

        let description = "";
        let descEl = doc.select(".jianjie p").first();
        if (descEl) {
            description = descEl.html().trim();
        }
        if (!description) {
            let introEl = doc.select(".intro").first();
            if (introEl) {
                description = introEl.html().trim();
            }
        }

        let detailLines = [];
        let ongoing = true;
        infoItems.forEach(function (item) {
            let text = item.text().trim();
            if (!text) return;
            detailLines.push(text);
            if (text.indexOf("状 态") !== -1) {
                ongoing = text.indexOf("已完结") === -1 && text.toLowerCase().indexOf("full") === -1;
            }
        });

        return Response.success({
            name: name,
            cover: cover,
            author: author,
            description: description,
            detail: detailLines.join("<br>"),
            genres: genres,
            ongoing: ongoing,
            suggests: [
                {
                    title: "Đề cử",
                    input: doc.select(".ui-ranking ul").html(),
                    script: "suggest.js"
                }
            ],
            host: BASE_URL
        });
    }
    return null;
}
