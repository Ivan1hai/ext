function execute(url) {
	let baseUrl = url.split('/').slice(0, 3).join('/');

	// Xử lý URL gốc của truyện để so sánh (tránh link rác)
	let novelPath = url.replace("https://truyenmoikk.com", "").replace(/\/$/, "");
	if (novelPath.indexOf("https://") !== -1) novelPath = novelPath.replace("https://truyenmoiii.org", "");
	if (novelPath.indexOf("https://") !== -1) novelPath = novelPath.replace("https://truyenmoikk.com", "");

	// Cần cắt bỏ đuôi /trang-X đi để đem đi so sánh với link các chương (vốn không có /trang-X)
	novelPath = novelPath.replace(/\/trang-\d+$/, "").replace(/\?page=\d+$/, "");

	// Tải trực tiếp trang mục lục hiện tại dưới dạng văn bản (nhanh hơn DOM)
	let pageText = Http.get(url).string();
	if (!pageText) return null;

	let list = [];

	let htmlInner = "";
	// Khối chương mới nhất có thể cần loại bỏ trước
	pageText = pageText.replace(/<ul[^>]*id="chuong-moi-nhat"[^>]*>([\s\S]*?)<\/ul>/gi, "");

	// Lấy toàn bộ các khối chứa danh sách chương
	let listBlockRegex = /<ul[^>]*id="list-chapter"[^>]*>([\s\S]*?)<\/ul>|<ul[^>]*class="[^"]*list-chapter[^"]*"[^>]*>([\s\S]*?)<\/ul>|class="list-chapter"[^>]*>([\s\S]*?)<\/ul>/gi;
	let blockMatch;
	while ((blockMatch = listBlockRegex.exec(pageText)) !== null) {
		htmlInner += (blockMatch[1] || blockMatch[2] || blockMatch[3] || "");
	}

	if (htmlInner) {

		// Quét từng thẻ <a>
		let aRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
		let m;
		while ((m = aRegex.exec(htmlInner)) !== null) {
			let link = m[1];
			let name = m[2].replace(/<\/?[^>]+(>|$)/g, "").trim();

			if (!link || !name) continue;

			// Xóa các nút phân trang bị cào nhầm vào mục lục
			let badSymbols = ["»", "«", "<", ">", "›", "‹", "...", ".."];
			if (name.match(/^\d+$/) || badSymbols.indexOf(name) !== -1 || name.toLowerCase().indexOf("trang") === 0) {
				continue;
			}
			// Loại bỏ link phân trang (trang danh sách)
			if (link.match(/\/trang-\d+/i) || link.match(/\?page=\d+/i)) {
				continue;
			}
			// Chỉ lấy các link trỏ đúng truyện này để chặn truyện rác từ sidebar
			if (link.indexOf(novelPath) !== -1) {
				// Chuẩn hóa định dạng link
				if (link.startsWith("/")) link = baseUrl + link;
				else if (link.indexOf("http") === -1) link = baseUrl + "/" + link;

				list.push({
					name: name,
					url: link,
					host: baseUrl
				});
			}
		}

		// Nhận diện lỗi lấy nhầm "Chương mới nhất":
		if (list.length > 50) {
			list = list.slice(list.length - 50);
		}

		// Lọc trùng trong trang hiện tại để chắc chắn không bị nhân đôi
		let dedupArray = [];
		let seenUrls = {};
		for (let i = 0; i < list.length; i++) {
			let item = list[i];
			if (!seenUrls[item.url]) {
				seenUrls[item.url] = true;
				dedupArray.push(item);
			}
		}

		return Response.success(dedupArray);
	}

	return null;
}
