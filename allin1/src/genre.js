load("config.js");

var STV_MAJOR_HOSTS = [
    { key: "fanqie", title: "Fanqie" },
    { key: "qidian", title: "Qidian" },
    { key: "jjwxc", title: "JJWXC" },
    { key: "faloo", title: "Faloo" },
    { key: "ciweimao", title: "Ciweimao" }
];

var STV_ADULT_HOSTS = {
    yushubo: true,
    "521danmei": true,
    bxwxorg: true,
    nofff: true
};

var STV_CORE_CATEGORIES = [
    { title: "Huyền huyễn", code: "hh" },
    { title: "Đô thị", code: "dt" },
    { title: "Ngôn tình", code: "nt" },
    { title: "Võng du", code: "vd" },
    { title: "Khoa học viễn tưởng", code: "kh" },
    { title: "Lịch sử", code: "ls" },
    { title: "Đồng nhân", code: "dn" },
    { title: "Dị năng", code: "dna" },
    { title: "Linh dị", code: "ld" },
    { title: "Light Novel", code: "ln" }
];

function stvGenreBuildSearchInput(params) {
    var pairs = [];
    for (var key in params) {
        if (!params.hasOwnProperty(key)) continue;
        var value = params[key];
        if (value === null || typeof value === "undefined") continue;
        var text = stvTrim(value);
        if (!text) continue;
        pairs.push(stvEncode(key) + "=" + stvEncode(text));
    }
    return "stvsearch://?" + pairs.join("&");
}

function stvGenrePushItem(out, seen, uniqueKey, title, params) {
    if (!uniqueKey || seen[uniqueKey]) return;
    seen[uniqueKey] = true;
    out.push({
        title: title,
        input: stvGenreBuildSearchInput(params || {}),
        script: "search.js"
    });
}

function stvGenreNormalizeHostKey(host) {
    return stvTrim(host).toLowerCase();
}

function stvGenreHostTitle(host) {
    var key = stvGenreNormalizeHostKey(host);
    if (!key) return "";
    var map = {
        fanqie: "Fanqie",
        qidian: "Qidian",
        jjwxc: "JJWXC",
        faloo: "Faloo",
        ciweimao: "Ciweimao",
        sfacg: "Sfacg",
        yushubo: "Yushubo",
        sangtac: "Sangtac",
        dich: "Dịch",
        "69shu": "69shu",
        "69shuorg": "69shuorg",
        "31bz": "31bz",
        "2kxs": "2kxs"
    };
    if (map[key]) return map[key];

    var text = key.replace(/^-+/, "").replace(/[_\-]+/g, " ");
    var words = text.split(" ");
    var out = [];
    for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (!w) continue;
        if (/^[a-z]+$/.test(w) && w.length <= 4) {
            out.push(w.toUpperCase());
        } else {
            out.push(w.charAt(0).toUpperCase() + w.substring(1));
        }
    }
    return out.join(" ");
}

function stvGenreIsMajorHost(host) {
    var key = stvGenreNormalizeHostKey(host);
    for (var i = 0; i < STV_MAJOR_HOSTS.length; i++) {
        if (STV_MAJOR_HOSTS[i].key === key) return true;
    }
    return false;
}

function stvGenreSlug(text) {
    var value = stvTrim(text).toLowerCase();
    if (!value) return "";

    var from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
    var to =   "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
    for (var i = 0; i < from.length; i++) {
        value = value.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
    }

    value = value.replace(/[^a-z0-9]+/g, "-");
    value = value.replace(/^-+|-+$/g, "");
    value = value.replace(/-{2,}/g, "-");
    return value;
}

function stvGenreLoadFacetedData() {
    var found = stvSearchJsonOnBases("/searchfaceted.json", function () {
        return {
            method: "GET",
            headers: stvHeaders()
        };
    }, STV_STATE.lastBase);

    if (!found || found.error || !found.json || typeof found.json !== "object") {
        return null;
    }

    return {
        base: found.base,
        data: found.json
    };
}

function stvGenreExtractHostsFromFaceted(facetedData) {
    var hosts = [];
    var seen = {};
    if (!facetedData || typeof facetedData !== "object") return hosts;

    for (var host in facetedData) {
        if (!facetedData.hasOwnProperty(host)) continue;
        var key = stvGenreNormalizeHostKey(host);
        if (!key || seen[key]) continue;
        seen[key] = true;
        hosts.push(key);
    }
    return hosts;
}

function stvGenreLoadHostMetaKeys(preferredBase) {
    var bases = stvGetBaseCandidates(preferredBase);
    for (var i = 0; i < bases.length; i++) {
        var base = bases[i];
        var url = stvBuildUrl(base, "/stv.host.js");
        var response = stvFetchText(url, {
            method: "GET",
            headers: stvHeaders()
        });

        if ((!response.ok || !response.text) && stvIsCloudflareBlockedResponse(response)) {
            var synced = stvSyncCloudflareCookie(base, stvBuildUrl(base, "/"));
            if (synced) {
                response = stvFetchText(url, {
                    method: "GET",
                    headers: stvHeaders()
                });
            }
        }

        if (!response.ok || !response.text) continue;

        var text = response.text;
        var all = [];
        var hidden = [];
        var seen = {};
        var regex = /"([^"]+)"\s*:\s*\[/g;
        var match = null;

        while ((match = regex.exec(text)) !== null) {
            var key = stvGenreNormalizeHostKey(match[1]);
            if (!key || seen[key]) continue;
            seen[key] = true;
            all.push(key);
            if (key.charAt(0) === "-") hidden.push(key.substring(1));
        }

        return {
            all: all,
            hidden: hidden
        };
    }

    return {
        all: [],
        hidden: []
    };
}

function stvGenreCollectCategoryTags(facetedData) {
    var aggregate = {};
    var list = [];

    if (!facetedData || typeof facetedData !== "object") return list;

    for (var host in facetedData) {
        if (!facetedData.hasOwnProperty(host)) continue;
        var hostEntry = facetedData[host];
        var categoryMap = hostEntry && hostEntry.category && typeof hostEntry.category === "object"
            ? hostEntry.category
            : {};

        for (var categoryName in categoryMap) {
            if (!categoryMap.hasOwnProperty(categoryName)) continue;
            var name = stvTrim(categoryName);
            if (!name) continue;
            var slug = stvGenreSlug(name);
            if (!slug) continue;

            if (!aggregate[slug]) {
                aggregate[slug] = {
                    name: name,
                    slug: slug,
                    count: 0
                };
            }

            var count = parseInt(categoryMap[categoryName], 10);
            if (isNaN(count) || count < 0) count = 0;
            aggregate[slug].count += count;
        }
    }

    for (var slugKey in aggregate) {
        if (!aggregate.hasOwnProperty(slugKey)) continue;
        list.push(aggregate[slugKey]);
    }

    list.sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        var ta = a.name.toLowerCase();
        var tb = b.name.toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
    });

    return list;
}

function execute() {
    var out = [];
    var seen = {};
    var minc = "50";

    var faceted = stvGenreLoadFacetedData();
    var facetedData = faceted && faceted.data ? faceted.data : null;
    var facetedHosts = stvGenreExtractHostsFromFaceted(facetedData);
    var hostMeta = stvGenreLoadHostMetaKeys(faceted && faceted.base ? faceted.base : STV_STATE.lastBase);

    var hostSeen = {};
    var allHosts = [];
    var i;

    function addHost(host) {
        var key = stvGenreNormalizeHostKey(host);
        if (!key) return;
        if (key.charAt(0) === "-") key = key.substring(1);
        if (!key || hostSeen[key]) return;
        hostSeen[key] = true;
        allHosts.push(key);
    }

    for (i = 0; i < facetedHosts.length; i++) addHost(facetedHosts[i]);
    for (i = 0; i < hostMeta.all.length; i++) addHost(hostMeta.all[i]);
    for (i = 0; i < STV_MAJOR_HOSTS.length; i++) addHost(STV_MAJOR_HOSTS[i].key);
    addHost("sangtac");
    addHost("dich");

    // Nguồn ưu tiên: có các mục Mới cập nhật / Đọc tuần / Đọc ngày.
    for (i = 0; i < STV_MAJOR_HOSTS.length; i++) {
        var major = STV_MAJOR_HOSTS[i];
        stvGenrePushItem(out, seen, "src:" + major.key + ":update",
            major.title + " · Mới cập nhật",
            { method: "search", host: major.key, sort: "update", minc: minc });
        stvGenrePushItem(out, seen, "src:" + major.key + ":viewweek",
            major.title + " · Đọc tuần",
            { method: "search", host: major.key, sort: "viewweek", minc: minc });
        stvGenrePushItem(out, seen, "src:" + major.key + ":viewday",
            major.title + " · Đọc ngày",
            { method: "search", host: major.key, sort: "viewday", minc: minc });
    }

    var normalSources = [];
    var adultSources = [];
    var hiddenMap = {};

    for (i = 0; i < hostMeta.hidden.length; i++) {
        var hiddenKey = stvGenreNormalizeHostKey(hostMeta.hidden[i]);
        if (hiddenKey) hiddenMap[hiddenKey] = true;
    }

    for (i = 0; i < allHosts.length; i++) {
        var host = allHosts[i];
        if (!host || stvGenreIsMajorHost(host)) continue;
        if (STV_ADULT_HOSTS[host] || hiddenMap[host]) {
            adultSources.push(host);
        } else {
            normalSources.push(host);
        }
    }

    normalSources.sort();
    adultSources.sort();

    // Nguồn còn lại: chỉ 1 dòng/nguồn, không tách trạng thái.
    for (i = 0; i < normalSources.length; i++) {
        var normalHost = normalSources[i];
        stvGenrePushItem(out, seen, "src-normal:" + normalHost,
            stvGenreHostTitle(normalHost),
            { method: "search", host: normalHost, sort: "update", minc: minc });
    }

    // Nhóm nguồn 18+ / nguồn ẩn.
    for (i = 0; i < adultSources.length; i++) {
        var adultHost = adultSources[i];
        stvGenrePushItem(out, seen, "src-adult:" + adultHost,
            "18+ · " + stvGenreHostTitle(adultHost),
            { method: "search", host: adultHost, sort: "update", minc: minc });
    }

    // Thể loại core theo app filter.
    for (i = 0; i < STV_CORE_CATEGORIES.length; i++) {
        var core = STV_CORE_CATEGORIES[i];
        stvGenrePushItem(out, seen, "cate-core:" + core.code,
            core.title,
            { method: "search", category: core.code, sort: "update", minc: minc });
        var coreSlug = stvGenreSlug(core.title);
        if (coreSlug) seen["cate-tag:" + coreSlug] = true;
    }

    // Thể loại mở rộng từ faceted (rất nhiều tag).
    var categoryTags = stvGenreCollectCategoryTags(facetedData);
    for (i = 0; i < categoryTags.length; i++) {
        var category = categoryTags[i];
        stvGenrePushItem(out, seen, "cate-tag:" + category.slug,
            category.name,
            { method: "search", tag: category.slug, sort: "update", minc: minc });
    }

    return Response.success(out);
}
