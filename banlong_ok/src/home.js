function execute() {
    return Response.success([
        { title: "Truyện mới nhất", input: "https://blhvip.vn/truyen-moi-nhat", script: "genre.js" },
        { title: "Hoàn thành", input: "https://blhvip.vn/truyen-hoan-thanh", script: "genre.js" },
        { title: "Truyện hot", input: "https://blhvip.vn/truyen-hot", script: "genre.js" },
        { title: "Thịnh hành tuần", input: "https://blhvip.vn/truyen-thinh-hanh-trong-tuan", script: "genre.js" },
        { title: "Top Linh Phiếu", input: "https://blhvip.vn/top-linh-phieu-tuan", script: "genre.js" },
        { title: "Yêu thích", input: "https://blhvip.vn/truyen-yeu-thich", script: "genre.js" }
    ]);
}