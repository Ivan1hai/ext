function execute(url, page) {
    if (!page) page = '1';
    let response = fetch(url + "?page=" + page);
    if (response.ok) {
        let doc = response.html();
        let el = doc.select(".novel-item");
        let data = [];
        for (let i = 0; i < el.size(); i++) {
            let e = el.get(i);
            let cover = e.select("picture img").attr("data-src") || e.select("picture img").attr("src");
            data.push({
                name: e.select("h3 a").text(),
                link: e.select("h3 a").attr("href"),
                cover: cover,
                description: e.select(".author").text(),
                host: "https://blhvip.vn"
            });
        }

        let next = "";
        let nextEl = doc.select(".pagination a.next-page");
        if (nextEl.size() > 0) {
            next = (parseInt(page) + 1).toString();
        }

        return Response.success(data, next);
    }
    return null;
}