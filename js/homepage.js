(function () {
    "use strict";

    var storageKeys = {
        favorites: "irisHub.favorites",
        recent: "irisHub.recent",
        note: "irisHub.note",
        endpoint: "irisHub.aiEndpoint",
        provider: "irisHub.aiProvider",
        deepseekKey: "irisHub.deepseekKey",
        deepseekModel: "irisHub.deepseekModel"
    };

    function readJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function formatTime(value) {
        return new Intl.DateTimeFormat("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(value));
    }

    function renderFavorites() {
        var favorites = readJson(storageKeys.favorites, []);
        var list = document.getElementById("favoriteList");
        var empty = document.getElementById("favoriteEmpty");

        document.querySelectorAll("[data-favorite]").forEach(function (button) {
            var course = button.getAttribute("data-favorite");
            var active = favorites.indexOf(course) >= 0;
            button.classList.toggle("is-active", active);
            button.textContent = active ? "★" : "☆";
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });

        list.innerHTML = "";
        empty.hidden = favorites.length > 0;

        favorites.forEach(function (course) {
            var item = document.createElement("li");
            item.textContent = course;
            list.appendChild(item);
        });
    }

    function renderRecent() {
        var recent = readJson(storageKeys.recent, []);
        var list = document.getElementById("recentList");
        var empty = document.getElementById("recentEmpty");

        list.innerHTML = "";
        empty.hidden = recent.length > 0;

        recent.forEach(function (entry) {
            var item = document.createElement("li");
            var link = document.createElement("a");
            var time = document.createElement("small");

            link.href = entry.href;
            link.textContent = entry.label;
            time.textContent = "访问时间：" + formatTime(entry.time);
            item.appendChild(link);
            item.appendChild(time);
            list.appendChild(item);
        });
    }

    function saveRecent(link) {
        var recent = readJson(storageKeys.recent, []);
        var href = link.getAttribute("href");
        var label = link.getAttribute("data-track") || link.textContent.trim();
        var next = recent.filter(function (entry) {
            return entry.href !== href;
        });

        next.unshift({
            href: href,
            label: label,
            time: Date.now()
        });

        writeJson(storageKeys.recent, next.slice(0, 8));
    }

    function setupStorageFeatures() {
        document.querySelectorAll("[data-favorite]").forEach(function (button) {
            button.addEventListener("click", function () {
                var course = button.getAttribute("data-favorite");
                var favorites = readJson(storageKeys.favorites, []);
                var exists = favorites.indexOf(course) >= 0;
                var next = exists ? favorites.filter(function (item) {
                    return item !== course;
                }) : favorites.concat(course);

                writeJson(storageKeys.favorites, next);
                renderFavorites();
            });
        });

        document.querySelectorAll("[data-track]").forEach(function (link) {
            link.addEventListener("click", function () {
                saveRecent(link);
            });
        });

        document.getElementById("clearRecent").addEventListener("click", function () {
            writeJson(storageKeys.recent, []);
            renderRecent();
        });

        var note = document.getElementById("studyNote");
        var status = document.getElementById("noteStatus");
        var savedNote = localStorage.getItem(storageKeys.note);

        if (savedNote) {
            note.value = savedNote;
        }

        note.addEventListener("input", function () {
            localStorage.setItem(storageKeys.note, note.value);
            status.textContent = "已保存：" + formatTime(Date.now());
        });

        renderFavorites();
        renderRecent();
    }

    function localAnswer(question, course) {
        var lower = question.toLowerCase();
        var lines = [
            "课程：" + course,
            "",
            "建议先把问题拆成三步：",
            "1. 写出已知条件和目标，确认题目要你求的是数值、解释、证明还是选择方法。",
            "2. 标出关键词，再匹配对应知识点或检验条件。",
            "3. 做完后用一句完整的话解释结论，尤其是统计题要回到题目语境。"
        ];

        if (course.indexOf("Statistics") >= 0 || /interval|test|p-value|confidence|hypothesis|sample|统计|区间|检验|置信/.test(lower)) {
            lines.push("", "统计答题检查：");
            lines.push("- 如果题目问 estimate 或 plausible values，多半考虑 confidence interval。");
            lines.push("- 如果题目问 evidence、claim、difference 或 changed，多半考虑 hypothesis test。");
            lines.push("- 写步骤时按 State, Plan, Do, Conclude；不要漏 independence、random 和 normal/large sample 条件。");
        } else if (course.indexOf("Calculus") >= 0 || /derivative|integral|series|limit|convergence|calculus|导数|积分|级数|极限/.test(lower)) {
            lines.push("", "微积分答题检查：");
            lines.push("- 先判断对象是函数值、变化率、累积量还是收敛性。");
            lines.push("- Series 题先看 nth term、geometric、p-series，再考虑 comparison、ratio、alternating。");
            lines.push("- 结论要说明区间、常数 C、单位或收敛/发散理由。");
        } else if (/html|css|link|href|网页|链接|上传|github/.test(lower)) {
            lines.push("", "网页制作提示：");
            lines.push("- 同一文件夹里的页面可以写成 href=\"another.html\"。");
            lines.push("- 链接到子文件夹时写 folder/file.pdf；返回上一级用 ../。");
            lines.push("- 文件名尽量避免空格和特殊符号，部署后更不容易出错。");
        }

        lines.push("", "下一步：把你的具体题目、尝试过的步骤和卡住的位置补充进来，回答会更精准。");
        return lines.join("\n");
    }

    function buildSystemPrompt(course) {
        return [
            "你是 Iris's Learning Hub 的课程答疑助手。",
            "当前课程：" + course + "。",
            "请用清晰、友好、适合高中 AP 学生的中文回答。",
            "优先给思路、步骤、常见错误和下一步练习建议。",
            "如果题目信息不足，请说明还需要哪些条件；不要编造题目中没有的数据。"
        ].join("\n");
    }

    function askDeepSeek(apiKey, model, question, course) {
        return fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: buildSystemPrompt(course)
                    },
                    {
                        role: "user",
                        content: question
                    }
                ],
                temperature: 0.3,
                stream: false
            })
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("DeepSeek 返回 " + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return data.choices[0].message.content;
                }
                return "DeepSeek 已返回，但没有找到回答内容。";
            });
    }

    function setupAiHelper() {
        var form = document.getElementById("askForm");
        var question = document.getElementById("questionInput");
        var course = document.getElementById("courseSelect");
        var provider = document.getElementById("providerSelect");
        var deepseekKey = document.getElementById("deepseekKey");
        var deepseekModel = document.getElementById("deepseekModel");
        var deepseekFields = document.getElementById("deepseekFields");
        var customFields = document.getElementById("customFields");
        var endpoint = document.getElementById("apiEndpoint");
        var output = document.getElementById("answerOutput");
        var mode = document.getElementById("answerMode");

        endpoint.value = localStorage.getItem(storageKeys.endpoint) || "";
        provider.value = localStorage.getItem(storageKeys.provider) || "local";
        deepseekKey.value = localStorage.getItem(storageKeys.deepseekKey) || "";
        deepseekModel.value = localStorage.getItem(storageKeys.deepseekModel) || "deepseek-chat";

        function updateProviderFields() {
            deepseekFields.classList.toggle("is-active", provider.value === "deepseek");
            customFields.classList.toggle("is-active", provider.value === "custom");
        }

        provider.addEventListener("change", function () {
            localStorage.setItem(storageKeys.provider, provider.value);
            updateProviderFields();
        });

        endpoint.addEventListener("input", function () {
            localStorage.setItem(storageKeys.endpoint, endpoint.value.trim());
        });
        deepseekKey.addEventListener("input", function () {
            localStorage.setItem(storageKeys.deepseekKey, deepseekKey.value.trim());
        });
        deepseekModel.addEventListener("change", function () {
            localStorage.setItem(storageKeys.deepseekModel, deepseekModel.value);
        });

        document.getElementById("clearQuestion").addEventListener("click", function () {
            question.value = "";
            output.textContent = "请输入问题。这里会给出解题思路、检查清单和下一步建议。";
            mode.textContent = "Local helper";
        });

        document.querySelectorAll("[data-prompt]").forEach(function (button) {
            button.addEventListener("click", function () {
                question.value = button.getAttribute("data-prompt");
                question.focus();
            });
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var text = question.value.trim();
            var selectedCourse = course.value;
            var apiUrl = endpoint.value.trim();
            var selectedProvider = provider.value;

            if (!text) {
                output.textContent = "先输入一个具体问题，再点击生成。";
                return;
            }

            if (selectedProvider === "local") {
                mode.textContent = "Local helper";
                output.textContent = localAnswer(text, selectedCourse);
                return;
            }

            if (selectedProvider === "deepseek") {
                if (!deepseekKey.value.trim()) {
                    output.textContent = "请选择 DeepSeek API 模式后，先填入 API Key。";
                    return;
                }

                mode.textContent = "DeepSeek API";
                output.textContent = "正在请求 DeepSeek...";

                askDeepSeek(deepseekKey.value.trim(), deepseekModel.value, text, selectedCourse)
                    .then(function (answer) {
                        output.textContent = answer;
                    })
                    .catch(function (error) {
                        mode.textContent = "Local fallback";
                        output.textContent = "DeepSeek 暂时不可用：" + error.message + "\n\n" + localAnswer(text, selectedCourse);
                    });
                return;
            }

            if (!apiUrl) {
                output.textContent = "自定义接口模式需要先填写接口地址。";
                return;
            }

            mode.textContent = "Connected API";
            output.textContent = "正在请求 AI 接口...";

            fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: text,
                    course: selectedCourse
                })
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("接口返回 " + response.status);
                    }
                    return response.json();
                })
                .then(function (data) {
                    output.textContent = data.answer || data.message || "接口已返回，但没有找到 answer 字段。";
                })
                .catch(function (error) {
                    mode.textContent = "Local fallback";
                    output.textContent = "AI 接口暂时不可用：" + error.message + "\n\n" + localAnswer(text, selectedCourse);
                });
        });

        updateProviderFields();
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupStorageFeatures();
        setupAiHelper();
    });
})();
