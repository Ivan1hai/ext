let BASE_URL = "https://www.tiemtruyenchu.com";
let SESSION_COOKIE = "";
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

try {
    if (CONFIG_URL) {
        BASE_URL = ("" + CONFIG_URL).replace(/\/+$/, "");
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

function ttcTrim(text) {
    if (text === null || typeof text === "undefined") return "";
    return ("" + text).replace(/^\s+|\s+$/g, "");
}

function ttcFoldText(text) {
    let value = ttcTrim(text).toLowerCase();
    if (!value) return "";

    try {
        if (typeof value.normalize === "function") {
            value = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
    } catch (error) {}

    return value.replace(/\u0111/g, "d");
}

function ttcNormalizeCookieText(cookieText) {
    return ttcTrim(cookieText).replace(/^[;\s]+|[;\s]+$/g, "");
}

function ttcMergeCookieStrings(baseCookie, extraCookie) {
    let merged = {};

    function addCookieText(cookieText) {
        let raw = ttcNormalizeCookieText(cookieText);
        if (!raw) return;

        raw.split(";").forEach(part => {
            let item = ttcTrim(part);
            if (!item) return;

            let eq = item.indexOf("=");
            if (eq <= 0) return;

            let key = ttcTrim(item.substring(0, eq));
            let value = ttcTrim(item.substring(eq + 1));
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

function ttcReadLocalCookie() {
    try {
        if (typeof localCookie !== "undefined" && localCookie && typeof localCookie.getCookie === "function") {
            return ttcNormalizeCookieText(localCookie.getCookie());
        }
    } catch (error) {}

    return "";
}

function ttcGetCookie() {
    return ttcMergeCookieStrings(ttcReadLocalCookie(), SESSION_COOKIE);
}

function ttcHasCookie() {
    return !!ttcNormalizeCookieText(ttcGetCookie());
}

function ttcPersistCookie(cookieText) {
    let merged = ttcMergeCookieStrings(SESSION_COOKIE, cookieText);
    if (!merged) return;

    SESSION_COOKIE = merged;

    try {
        if (typeof localCookie !== "undefined" && localCookie && typeof localCookie.setCookie === "function") {
            localCookie.setCookie(merged);
        }
    } catch (error) {}
}

function ttcCookieObject(cookieText) {
    let raw = ttcNormalizeCookieText(cookieText);
    if (!raw) return null;

    let out = {};
    let hasCookie = false;

    raw.split(";").forEach(part => {
        let item = ttcTrim(part);
        if (!item) return;

        let eq = item.indexOf("=");
        if (eq <= 0) return;

        let key = ttcTrim(item.substring(0, eq));
        let value = ttcTrim(item.substring(eq + 1));
        if (!key || !value) return;

        out[key] = value;
        hasCookie = true;
    });

    return hasCookie ? out : null;
}

function ttcToAbsolute(url) {
    let raw = ttcTrim(url);
    if (!raw) return "";
    if (raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0) {
        return raw.replace(/^http:\/\//i, "https://");
    }
    if (raw.indexOf("//") === 0) return "https:" + raw;
    return BASE_URL + (raw.charAt(0) === "/" ? "" : "/") + raw;
}

function ttcNormalizeUrl(url) {
    let raw = ttcTrim(url);
    if (!raw) return BASE_URL;
    return ttcToAbsolute(raw);
}

function ttcMergeHeaders(baseHeaders, extraHeaders) {
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

function ttcBuildHeaders(extraHeaders) {
    let headers = {
        "User-Agent": DEFAULT_UA,
        "user-agent": DEFAULT_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi,en-US;q=0.9,en;q=0.8"
    };

    let cookie = ttcGetCookie();
    if (cookie) {
        headers.Cookie = cookie;
        headers.cookie = cookie;
    }

    return ttcMergeHeaders(headers, extraHeaders);
}

function ttcBuildRequestOptions(options) {
    let requestOptions = {};
    let source = options || {};

    Object.keys(source).forEach(key => {
        if (key === "headers") return;
        requestOptions[key] = source[key];
    });

    requestOptions.headers = ttcBuildHeaders(source.headers || null);
    return requestOptions;
}

function ttcFetch(url, options) {
    let normalized = ttcNormalizeUrl(url);
    let requestOptions = ttcBuildRequestOptions(options);
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
        relaxedOptions.headers = ttcMergeHeaders(requestOptions.headers, null);
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

    return response;
}

function ttcResponseHtml(response) {
    try {
        return response ? response.html() : null;
    } catch (error) {
        return null;
    }
}

function ttcIsLoginDocument(doc) {
    if (!doc) return false;

    let title = ttcFoldText(doc.select("title").text());
    if (title.indexOf("dang nhap") === -1 && title.indexOf("login") === -1) {
        return false;
    }

    let hasLoginForm = doc.select("form[action='/login'], form[action$='/login']").size() > 0;
    let hasLoginUi = doc.select("#btn-login-page, #form-login, #login-tab").size() > 0;
    return hasLoginForm || hasLoginUi;
}

function ttcStoreCookieFromBrowser(browser) {
    try {
        if (!browser || typeof browser.callJs !== "function" || typeof browser.getVariable !== "function") return;

        let key = "ttc_cookie_" + Math.random().toString(36).substring(2);
        let js = "try{if(typeof Cache!=='undefined'&&Cache&&typeof Cache.putVariable==='function'){Cache.putVariable("
            + JSON.stringify(key)
            + ", String(document.cookie||''));}}catch(e){}";

        browser.callJs(js, 3000);
        let cookieText = ttcTrim(browser.getVariable(key));
        if (cookieText) {
            ttcPersistCookie(cookieText);
        }
    } catch (error) {}
}

function ttcOpenBrowser(url, timeoutMs) {
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
            let cookieObj = ttcCookieObject(ttcGetCookie());
            if (cookieObj) {
                browser.overrideCookie(cookieObj);
            }
        }

        let launchedDoc = null;
        if (typeof browser.launch === "function") {
            launchedDoc = browser.launch(ttcNormalizeUrl(url), timeoutMs || 15000);
        }

        let doc = null;
        try {
            doc = browser.html();
        } catch (error) {
            doc = null;
        }

        if (!doc) doc = launchedDoc;
        ttcStoreCookieFromBrowser(browser);
        return doc;
    } catch (error) {
        return null;
    } finally {
        try {
            if (browser && typeof browser.close === "function") browser.close();
        } catch (error) {}
    }
}

function ttcFetchPage(url, options, timeoutMs) {
    let normalized = ttcNormalizeUrl(url);
    let response = ttcFetch(normalized, options);
    let doc = response && response.ok ? ttcResponseHtml(response) : null;
    let loginRequired = ttcIsLoginDocument(doc);

    let shouldOpenBrowser = loginRequired || !doc;
    if (!shouldOpenBrowser && response) {
        let status = response.status || 0;
        shouldOpenBrowser = status === 400 || status === 401 || status === 403 || status === 429 || status === 503;
    }

    if (shouldOpenBrowser) {
        let browserDoc = ttcOpenBrowser(normalized, timeoutMs || 15000);
        if (browserDoc) {
            doc = browserDoc;
            loginRequired = ttcIsLoginDocument(doc);
            return {
                response: response,
                doc: doc,
                loginRequired: loginRequired,
                viaBrowser: true,
                url: normalized
            };
        }
    }

    return {
        response: response,
        doc: doc,
        loginRequired: loginRequired,
        viaBrowser: false,
        url: normalized
    };
}
