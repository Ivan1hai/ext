function execute(url) {
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let author = doc.select("p.text-info:contains(Tác giả) a").text();
        let statusText = doc.select("p.text-info:contains(Tình trạng)").text();
        let status = statusText.indexOf("Đã Hoàn Thành") !== -1 || statusText.indexOf("Full") !== -1;

        let cover = doc.select(".image-story img").attr("data-src") || doc.select(".image-story img").attr("src");
        let name = doc.select(".name-story").text().replace(/\[.*?\]\s*/g, '').trim();

        return Response.success({
            name: name,
            cover: cover,
            author: author,
            description: doc.select("#tab-info-1 .s-content").html(),
            detail: "Tác giả: " + author + "<br>" + statusText,
            ongoing: !status,
            host: "https://blhvip.vn"
        });
    }
    return null;
}