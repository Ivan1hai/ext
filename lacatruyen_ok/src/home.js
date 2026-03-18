load("config.js");

function execute() {
    let sections = [
        { title: "Mới Cập Nhật", input: "feed:new-updates", script: "gen.js" },
        { title: "Hoàn Thành", input: "feed:completed", script: "gen.js" },
        { title: "Đề Cử", input: "feed:recommended", script: "gen.js" },
        { title: "Top Tuần", input: "feed:top-view-weeks", script: "gen.js" },
        { title: "Top Tháng", input: "feed:top-view-months", script: "gen.js" }
    ];

    let response = requestGet("/categories/list");
    if (response && response.ok) {
        let json = safeJson(response);
        let categories = json && json.data ? json.data : [];

        categories.forEach(cat => {
            if (!cat || !cat.id || !cat.name) return;
            sections.push({
                title: cat.name,
                input: "cat:" + cat.id,
                script: "gen.js"
            });
        });
    }

    return Response.success(sections);
}

