function execute() {
    return Response.success([
        {title: "Hiện đại", input: "/danh-sach?cat=hien-dai", script: "gen.js"},
        {title: "Cổ đại", input: "/danh-sach?cat=co-dai", script: "gen.js"},
        {title: "Tiên hiệp", input: "/danh-sach?cat=tien-hiep", script: "gen.js"},
        {title: "Huyền huyễn", input: "/danh-sach?cat=huyen-huyen", script: "gen.js"},
        {title: "Đô thị", input: "/danh-sach?cat=do-thi", script: "gen.js"},
        {title: "Khoa huyễn", input: "/danh-sach?cat=khoa-huyen", script: "gen.js"},
        {title: "Huyền nghi", input: "/danh-sach?cat=huyen-nghi", script: "gen.js"},
        {title: "Linh dị", input: "/danh-sach?cat=linh-di", script: "gen.js"},
        {title: "Võng du", input: "/danh-sach?cat=vong-du", script: "gen.js"},
        {title: "Đồng nhân", input: "/danh-sach?cat=dong-nhan", script: "gen.js"},
        {title: "Cạnh kỹ", input: "/danh-sach?cat=canh-ky", script: "gen.js"},
        {title: "Khác", input: "/danh-sach?cat=khac", script: "gen.js"}
    ]);
}