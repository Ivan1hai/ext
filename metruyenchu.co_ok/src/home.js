function execute() {
    return Response.success([
        { title: "Mới Cập Nhật", input: "https://metruyenchu.co/danh-sach/truyen-moi", script: "gen.js" },
        { title: "Hoàn Thành", input: "https://metruyenchu.co/danh-sach?status=COMPLETED&sort=updatedAt", script: "gen.js" },
        { title: "Lượt Đọc", input: "https://metruyenchu.co/xep-hang/luot-doc", script: "gen.js" },
        { title: "Yêu Thích", input: "https://metruyenchu.co/xep-hang/yeu-thich", script: "gen.js" },
    ]);
}
