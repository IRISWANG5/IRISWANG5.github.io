(function () {
    "use strict";

    var recentKey = "irisHub.recent";

    function readRecent() {
        try {
            return JSON.parse(localStorage.getItem(recentKey)) || [];
        } catch (error) {
            return [];
        }
    }

    function saveRecent(link) {
        var href = link.getAttribute("href");
        var label = document.title + " / " + link.textContent.trim();
        var recent = readRecent().filter(function (entry) {
            return entry.href !== href;
        });

        recent.unshift({
            href: href,
            label: label,
            time: Date.now()
        });

        localStorage.setItem(recentKey, JSON.stringify(recent.slice(0, 8)));
    }

    function addToolbar() {
        var header = document.querySelector("header");
        var main = document.querySelector("main");
        var toolbar = document.createElement("div");
        var home = document.createElement("a");
        var search = document.createElement("input");
        var ai = document.createElement("a");

        if (!header || !main || document.querySelector(".resource-toolbar")) {
            return;
        }

        toolbar.className = "resource-toolbar";
        home.href = "index.html";
        home.textContent = "← 首页";
        search.className = "resource-search";
        search.type = "search";
        search.placeholder = "搜索本页资源";
        search.setAttribute("aria-label", "搜索本页资源");
        ai.href = "index.html#ai-helper";
        ai.textContent = "AI 答疑";

        toolbar.appendChild(home);
        toolbar.appendChild(search);
        toolbar.appendChild(ai);
        header.insertAdjacentElement("afterend", toolbar);

        setupSearch(search, main);
    }

    function setupSearch(search, main) {
        var empty = document.createElement("div");
        empty.className = "search-empty hidden-by-search";
        empty.textContent = "没有找到匹配的资源。";
        main.appendChild(empty);

        search.addEventListener("input", function () {
            var keyword = search.value.trim().toLowerCase();
            var links = Array.prototype.slice.call(main.querySelectorAll("section a"));
            var visibleCount = 0;

            links.forEach(function (link) {
                var matched = !keyword || link.textContent.toLowerCase().indexOf(keyword) >= 0;
                link.classList.toggle("hidden-by-search", !matched);
                if (matched) {
                    visibleCount += 1;
                }
            });

            empty.classList.toggle("hidden-by-search", !keyword || visibleCount > 0);
        });
    }

    function enhanceLinks() {
        document.querySelectorAll("main a[href]").forEach(function (link) {
            var href = link.getAttribute("href").trim();

            if (!href || href === "#") {
                link.classList.add("hidden-by-search");
                return;
            }

            link.addEventListener("click", function () {
                saveRecent(link);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        addToolbar();
        enhanceLinks();
    });
})();
