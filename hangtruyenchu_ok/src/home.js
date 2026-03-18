load("config.js");

function execute() {
    return Response.success([
        { title: "Mới Cập Nhật", input: "/danh-sach?sort=updated", script: "gen.js" },
        { title: "Truyện Mới", input: "/danh-sach?sort=new", script: "gen.js" },
        { title: "Truyện Full", input: "/danh-sach?sort=new&status=full", script: "gen.js" },
        { title: "Lượt Xem", input: "/xep-hang?by=views", script: "gen.js" },
        { title: "Đề Cử", input: "/xep-hang?by=nominations", script: "gen.js" },
        { title: "Truyện Convert", input: "/danh-sach?type=truyen-cv", script: "gen.js" },
        { title: "Truyện Dịch", input: "/danh-sach?type=truyen-dich", script: "gen.js" }
    ]);
}
