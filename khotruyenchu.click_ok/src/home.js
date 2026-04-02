function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "updated", script: "section.js" },
        { title: "Truyện mới của Kho", input: "new", script: "section.js" },
        { title: "Nhiều chương", input: "/wp-json/wp/v2/bo_truyen?per_page=24&orderby=count&order=desc", script: "gen.js" },
        { title: "Tên A-Z", input: "/wp-json/wp/v2/bo_truyen?per_page=24&orderby=name&order=asc", script: "gen.js" },
        { title: "Huyền huyễn - Tiên hiệp", input: "huyen-huyen-tien-hiep", script: "section.js" },
        { title: "Top Qidian", input: "top-qidian", script: "section.js" },
        { title: "Độc giả yêu cầu dịch", input: "yeu-cau-dich", script: "section.js" }
    ]);
}
