load("config.js");

function execute() {
    let genres = [];

    let response = requestGet("/categories/list");
    if (response && response.ok) {
        let json = safeJson(response);
        let rows = json && json.data ? json.data : [];

        rows.forEach(cat => {
            if (!cat || !cat.id) return;
            let title = (cat.title || cat.name || "").toString().trim();
            if (!title) return;

            genres.push({
                title: title,
                input: "cat:" + cat.id,
                script: "gen.js"
            });
        });
    }

    if (genres.length === 0) {
        return Response.error("Khong lay duoc danh sach the loai.");
    }

    return Response.success(genres);
}
