load('config.js');

function execute() {
    let response = fetch(BASE_URL + "/the-loai");
    if (response.ok) {
        let doc = response.html();
        let genres = [];
        doc.select("a[href*='/the-loai/']").forEach(function (e) {
            let title = e.text().trim();
            let href = e.attr("href");
            if (title && href && href !== "/the-loai" && href !== BASE_URL + "/the-loai") {
                // Avoid duplicate genres
                let exists = false;
                for (var i = 0; i < genres.length; i++) {
                    if (genres[i].title === title) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    genres.push({
                        title: title,
                        input: href,
                        script: "gen.js"
                    });
                }
            }
        });
        return Response.success(genres);
    }
    return null;
}
