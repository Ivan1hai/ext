let BASE_URL = "https://khotruyenchu.click";
let SESSION_COOKIE = "";
let DEFAULT_COVER = BASE_URL + "/wp-content/uploads/2025/12/cropped-Logo-2-300x300.png";
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

try {
    if (CONFIG_URL) {
        BASE_URL = ("" + CONFIG_URL).replace(/\/+$/, "");
        DEFAULT_COVER = BASE_URL + "/wp-content/uploads/2025/12/cropped-Logo-2-300x300.png";
    }
} catch (error) {}

try {
    if (CONFIG_COOKIE) {
        SESSION_COOKIE = ("" + CONFIG_COOKIE).trim();
    }
} catch (error) {}

try {
    if (!SESSION_COOKIE && typeof localCookie !== "undefined" && localCookie && typeof localCookie.getCookie === "function") {
        SESSION_COOKIE = ("" + (localCookie.getCookie() || "")).trim();
    }
} catch (error) {}

function ktcTrim(text) {
    if (text === null || typeof text === "undefined") return "";
    return ("" + text).replace(/^\s+|\s+$/g, "");
}

function ktcFoldText(text) {
    let value = ktcTrim(text).toLowerCase();
    if (!value) return "";

    try {
        if (typeof value.normalize === "function") {
            value = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
    } catch (error) {}

    return value.replace(/\u0111/g, "d");
}

function ktcNormalizeCookieText(cookieText) {
    return ktcTrim(cookieText).replace(/^[;\s]+|[;\s]+$/g, "");
}

function ktcMergeCookieStrings(baseCookie, extraCookie) {
    let merged = {};

    function addCookieText(cookieText) {
        let raw = ktcNormalizeCookieText(cookieText);
        if (!raw) return;

        raw.split(";").forEach(part => {
            let item = ktcTrim(part);
            if (!item) return;

            let eq = item.indexOf("=");
            if (eq <= 0) return;

            let key = ktcTrim(item.substring(0, eq));
            let value = ktcTrim(item.substring(eq + 1));
            if (!key || !value) return;

            merged[key] = value;
        });
    }

    addCookieText(baseCookie);
    addCookieText(extraCookie);

    let out = [];
    Object.keys(merged).forEach(key => {
        out.push(key + "=" + merged[key]);
    });

    return out.join("; ");
}

function ktcReadLocalCookie() {
    try {
        if (typeof localCookie !== "undefined" && localCookie && typeof localCookie.getCookie === "function") {
            return ktcNormalizeCookieText(localCookie.getCookie());
        }
    } catch (error) {}

    return "";
}

function ktcGetCookie() {
    return ktcMergeCookieStrings(ktcReadLocalCookie(), SESSION_COOKIE);
}

function ktcHasCookie() {
    return !!ktcNormalizeCookieText(ktcGetCookie());
}

function ktcPersistCookie(cookieText) {
    let merged = ktcMergeCookieStrings(SESSION_COOKIE, cookieText);
    if (!merged) return;

    SESSION_COOKIE = merged;

    try {
        if (typeof localCookie !== "undefined" && localCookie && typeof localCookie.setCookie === "function") {
            localCookie.setCookie(merged);
        }
    } catch (error) {}
}

function ktcCookieObject(cookieText) {
    let raw = ktcNormalizeCookieText(cookieText);
    if (!raw) return null;

    let out = {};
    let hasCookie = false;

    raw.split(";").forEach(part => {
        let item = ktcTrim(part);
        if (!item) return;

        let eq = item.indexOf("=");
        if (eq <= 0) return;

        let key = ktcTrim(item.substring(0, eq));
        let value = ktcTrim(item.substring(eq + 1));
        if (!key || !value) return;

        out[key] = value;
        hasCookie = true;
    });

    return hasCookie ? out : null;
}

function ktcToAbsolute(url) {
    let raw = ktcTrim(url);
    if (!raw) return "";
    if (raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0) {
        return raw.replace(/^http:\/\//i, "https://");
    }
    if (raw.indexOf("//") === 0) return "https:" + raw;
    return BASE_URL + (raw.charAt(0) === "/" ? "" : "/") + raw;
}

function ktcNormalizeUrl(url) {
    let raw = ktcTrim(url);
    if (!raw) return BASE_URL;
    return ktcToAbsolute(raw);
}

function ktcMergeHeaders(baseHeaders, extraHeaders) {
    let out = {};

    if (baseHeaders) {
        Object.keys(baseHeaders).forEach(key => {
            if (baseHeaders[key] !== null && typeof baseHeaders[key] !== "undefined") {
                out[key] = baseHeaders[key];
            }
        });
    }

    if (extraHeaders) {
        Object.keys(extraHeaders).forEach(key => {
            if (extraHeaders[key] !== null && typeof extraHeaders[key] !== "undefined") {
                out[key] = extraHeaders[key];
            }
        });
    }

    return out;
}

function ktcBuildHeaders(extraHeaders) {
    let headers = {
        "User-Agent": DEFAULT_UA,
        "user-agent": DEFAULT_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi,en-US;q=0.9,en;q=0.8"
    };

    let cookie = ktcGetCookie();
    if (cookie) {
        headers.Cookie = cookie;
        headers.cookie = cookie;
    }

    return ktcMergeHeaders(headers, extraHeaders);
}

function ktcBuildRequestOptions(options) {
    let requestOptions = {};
    let source = options || {};

    Object.keys(source).forEach(key => {
        if (key === "headers") return;
        requestOptions[key] = source[key];
    });

    requestOptions.headers = ktcBuildHeaders(source.headers || null);
    return requestOptions;
}

function ktcGetHeader(headers, wantedName) {
    if (!headers || !wantedName) return "";

    let lowerWanted = String(wantedName).toLowerCase();

    if (typeof headers.get === "function") {
        let direct = headers.get(wantedName);
        if (direct) return String(direct);

        let lowered = headers.get(lowerWanted);
        if (lowered) return String(lowered);
    }

    let keys = [wantedName, lowerWanted, "Set-Cookie", "set-cookie"];
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (typeof headers[key] !== "undefined" && headers[key] !== null) {
            let value = headers[key];
            if (Object.prototype.toString.call(value) === "[object Array]") {
                return value.join("; ");
            }
            return String(value);
        }
    }

    for (let name in headers) {
        if (!headers.hasOwnProperty(name)) continue;
        if (String(name).toLowerCase() !== lowerWanted) continue;

        let value = headers[name];
        if (Object.prototype.toString.call(value) === "[object Array]") {
            return value.join("; ");
        }
        return String(value);
    }

    return "";
}

function ktcPersistResponseCookie(response) {
    let setCookie = ktcGetHeader(response ? response.headers : null, "set-cookie");
    if (setCookie) {
        ktcPersistCookie(setCookie);
    }
}

function ktcFetch(url, options) {
    let normalized = ktcNormalizeUrl(url);
    let requestOptions = ktcBuildRequestOptions(options);
    let response = null;

    try {
        response = fetch(normalized, requestOptions);
    } catch (error) {
        response = null;
    }

    if ((!response || !response.ok) && requestOptions.headers) {
        let relaxedOptions = {};
        Object.keys(requestOptions).forEach(key => {
            relaxedOptions[key] = requestOptions[key];
        });

        relaxedOptions.headers = ktcMergeHeaders(requestOptions.headers, null);
        delete relaxedOptions.headers["User-Agent"];
        delete relaxedOptions.headers["user-agent"];

        try {
            response = fetch(normalized, relaxedOptions);
        } catch (error) {}
    }

    if ((!response || !response.ok) && (!options || !options.headers || Object.keys(options.headers).length === 0)) {
        try {
            response = fetch(normalized, options || {});
        } catch (error) {}
    }

    if (response) {
        ktcPersistResponseCookie(response);
    }

    return response;
}

function ktcResponseHtml(response) {
    try {
        return response ? response.html() : null;
    } catch (error) {
        return null;
    }
}

function ktcIsChallengeDocument(doc) {
    if (!doc) return true;

    let title = ktcFoldText(doc.select("title").text());
    let pageText = ktcFoldText(doc.text());

    if (title.indexOf("just a moment") > -1) return true;
    if (title.indexOf("attention required") > -1) return true;
    if (title.indexOf("cloudflare") > -1) return true;
    if (pageText.indexOf("checking your browser") > -1) return true;
    if (pageText.indexOf("enable javascript and cookies") > -1) return true;
    if (doc.select("#challenge-form, #challenge-stage, .cf-browser-verification, [data-translate='checking_browser']").size() > 0) {
        return true;
    }

    return false;
}

function ktcStoreCookieFromBrowser(browser) {
    try {
        if (!browser || typeof browser.callJs !== "function" || typeof browser.getVariable !== "function") return;

        let key = "ktc_cookie_" + Math.random().toString(36).substring(2);
        let js = "try{if(typeof Cache!=='undefined'&&Cache&&typeof Cache.putVariable==='function'){Cache.putVariable("
            + JSON.stringify(key)
            + ", String(document.cookie||''));}}catch(e){}";

        browser.callJs(js, 3000);
        let cookieText = ktcTrim(browser.getVariable(key));
        if (cookieText) {
            ktcPersistCookie(cookieText);
        }
    } catch (error) {}
}

function ktcOpenBrowser(url, timeoutMs) {
    if (typeof Engine === "undefined" || !Engine || typeof Engine.newBrowser !== "function") {
        return null;
    }

    let browser = null;

    try {
        browser = Engine.newBrowser();
        if (!browser) return null;

        if (typeof browser.setUserAgent === "function") {
            browser.setUserAgent(DEFAULT_UA);
        }

        if (typeof browser.overrideCookie === "function") {
            let cookieObj = ktcCookieObject(ktcGetCookie());
            if (cookieObj) {
                browser.overrideCookie(cookieObj);
            }
        }

        let launchedDoc = null;
        if (typeof browser.launch === "function") {
            launchedDoc = browser.launch(ktcNormalizeUrl(url), timeoutMs || 15000);
        }

        let doc = null;
        try {
            doc = browser.html();
        } catch (error) {
            doc = null;
        }

        if (!doc) doc = launchedDoc;
        ktcStoreCookieFromBrowser(browser);
        return doc;
    } catch (error) {
        return null;
    } finally {
        try {
            if (browser && typeof browser.close === "function") {
                browser.close();
            }
        } catch (error) {}
    }
}

function ktcFetchPage(url, options, timeoutMs, warmUrl) {
    let normalized = ktcNormalizeUrl(url);
    let response = ktcFetch(normalized, options);
    let doc = response && response.ok ? ktcResponseHtml(response) : null;
    let blocked = !doc || ktcIsChallengeDocument(doc);
    let viaBrowser = false;

    if (!blocked && response) {
        let status = response.status || 0;
        blocked = status === 400 || status === 401 || status === 403 || status === 429 || status === 503;
    }

    if (blocked) {
        let browserDoc = ktcOpenBrowser(warmUrl || normalized, timeoutMs || 15000);
        if (browserDoc) {
            doc = browserDoc;
            viaBrowser = true;
        }
    }

    return {
        response: response,
        doc: doc,
        blocked: ktcIsChallengeDocument(doc),
        viaBrowser: viaBrowser,
        url: normalized
    };
}

function ktcFetchJson(url, options, warmUrl) {
    let normalized = ktcNormalizeUrl(url);
    let response = ktcFetch(normalized, options);
    let data = null;
    let shouldWarm = !response || !response.ok;

    if (response && response.ok) {
        try {
            data = response.json();
        } catch (error) {
            shouldWarm = true;
        }
    }

    if (!data && shouldWarm) {
        ktcOpenBrowser(warmUrl || BASE_URL, 15000);
        response = ktcFetch(normalized, options);
        if (response && response.ok) {
            try {
                data = response.json();
            } catch (error) {}
        }
    }

    return {
        response: response,
        data: data,
        url: normalized
    };
}

function ktcDecodeHtml(html) {
    let raw = ktcTrim(html);
    if (!raw) return "";

    try {
        return ktcTrim(Html.parse("<div>" + raw + "</div>").text());
    } catch (error) {}

    return raw
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function ktcPlainText(html) {
    return ktcTrim(ktcDecodeHtml(html).replace(/\s+/g, " "));
}

function ktcShortText(text, maxLen) {
    let value = ktcPlainText(text);
    let limit = parseInt(maxLen || "220", 10);
    if (!value || !limit || value.length <= limit) return value;

    let cut = value.substring(0, limit);
    let lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > 60) {
        cut = cut.substring(0, lastSpace);
    }

    return ktcTrim(cut) + "...";
}

function ktcRestTotalPages(response) {
    let total = parseInt(ktcGetHeader(response ? response.headers : null, "X-WP-TotalPages") || "1", 10);
    return total > 0 ? total : 1;
}

function ktcStorySlug(url) {
    let matched = ktcNormalizeUrl(url).match(/\/truyen\/([^\/?#]+)/i);
    return matched && matched[1] ? matched[1] : "";
}

let KTC_COVER_CACHE = {};

function ktcCoverCacheGet(key) {
    let cacheKey = ktcTrim(key);
    if (!cacheKey) return "";

    if (KTC_COVER_CACHE[cacheKey]) {
        return KTC_COVER_CACHE[cacheKey];
    }

    try {
        if (typeof cacheStorage !== "undefined" && cacheStorage && typeof cacheStorage.getItem === "function") {
            let stored = ktcTrim(cacheStorage.getItem("ktc_cover_" + cacheKey));
            if (stored) {
                KTC_COVER_CACHE[cacheKey] = stored;
                return stored;
            }
        }
    } catch (error) {}

    return "";
}

function ktcCoverCacheSet(key, cover) {
    let cacheKey = ktcTrim(key);
    let value = ktcToAbsolute(cover || DEFAULT_COVER);
    if (!cacheKey || !value) return value;

    KTC_COVER_CACHE[cacheKey] = value;

    try {
        if (typeof cacheStorage !== "undefined" && cacheStorage && typeof cacheStorage.setItem === "function") {
            cacheStorage.setItem("ktc_cover_" + cacheKey, value);
        }
    } catch (error) {}

    return value;
}

function ktcExtractPostCover(post) {
    if (!post) return "";

    try {
        let embedded = post._embedded || {};
        let medias = embedded["wp:featuredmedia"] || [];
        if (medias.length > 0) {
            let media = medias[0];
            let sizes = (media.media_details || {}).sizes || {};
            if (sizes.medium_large && sizes.medium_large.source_url) return sizes.medium_large.source_url;
            if (sizes.medium && sizes.medium.source_url) return sizes.medium.source_url;
            if (sizes.full && sizes.full.source_url) return sizes.full.source_url;
            if (media.source_url) return media.source_url;
        }
    } catch (error) {}

    try {
        let yoast = post.yoast_head_json || {};
        let images = yoast.og_image || [];
        if (images.length > 0 && images[0] && images[0].url) {
            return images[0].url;
        }
    } catch (error) {}

    return "";
}

function ktcExtractStoryCoverFromDoc(doc) {
    if (!doc) return "";

    let coverEl = doc.select(".truyen-cover img").first();
    if (!coverEl) coverEl = doc.select("meta[property='og:image']").first();
    if (!coverEl) coverEl = doc.select("meta[name='twitter:image']").first();

    if (coverEl) {
        let cover = coverEl.attr("data-src") || coverEl.attr("src") || coverEl.attr("content") || "";
        if (cover) return cover;
    }

    let ldJson = doc.select("script[type='application/ld+json']").html();
    let matched = ldJson ? ldJson.match(/"image":"([^"]+)"/i) : null;
    if (matched && matched[1]) return matched[1];

    return "";
}

function ktcResolveStoryCover(item) {
    if (!item) return DEFAULT_COVER;

    let cacheKey = String(item.id || item.slug || item.link || item.name || "");
    let cached = ktcCoverCacheGet(cacheKey);
    if (cached) return cached;

    let cover = "";

    if (item.id) {
        let apiUrl = BASE_URL
            + "/wp-json/wp/v2/posts?bo_truyen="
            + encodeURIComponent(item.id)
            + "&per_page=1&page=1&order=desc&_embed";

        let jsonData = ktcFetchJson(apiUrl, null, item.link || BASE_URL);
        if (jsonData.data && Object.prototype.toString.call(jsonData.data) === "[object Array]" && jsonData.data.length > 0) {
            cover = ktcExtractPostCover(jsonData.data[0]);
        }
    }

    if (!cover && item.link) {
        let pageData = ktcFetchPage(item.link, null, 15000, item.link);
        if (pageData && pageData.doc && !pageData.blocked) {
            cover = ktcExtractStoryCoverFromDoc(pageData.doc);
        }
    }

    return ktcCoverCacheSet(cacheKey, cover || DEFAULT_COVER);
}
