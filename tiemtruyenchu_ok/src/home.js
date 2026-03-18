function execute() {
    return Response.success([
        {title: "Mới cập nhật", input: "/danh-sach?sort=updated", script: "gen.js"},
        {title: "Tất Cả", input: "/danh-sach?sort=views", script: "gen.js"},
        {title: "Truyện Nam", input: "/danh-sach?gender=nam", script: "gen.js"},
        {title: "Truyện Nữ", input: "/danh-sach?gender=nu", script: "gen.js"},

        {title: "BXH - Lượt xem", input: "/xep-hang?by=views", script: "gen.js"},
        {title: "BXH - Quà tặng", input: "/xep-hang?by=gift", script: "gen.js"},
        {title: "BXH - Đề cử", input: "/xep-hang?by=nominations", script: "gen.js"},
        {title: "BXH - Theo dõi", input: "/xep-hang?by=follows", script: "gen.js"}
    ]);
}
