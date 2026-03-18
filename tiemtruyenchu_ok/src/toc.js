function execute(url) {
    load('config.js');
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        const doc = response.html();

        let data = [];
        doc.select("#chapter-list-container a.chapter-item-link").forEach(e => {
            data.push({
                name: e.text().trim(),
                url: e.attr("href"),
                host: BASE_URL
            });
        });

        // Site đã sắp xếp đúng (Chương 1 -> mới nhất) nên KHÔNG đảo nữa
        return Response.success(data);
    }

    return null;
}
