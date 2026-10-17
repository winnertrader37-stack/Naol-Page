"use strict";

/*
=========================================================
 NAOL PAGE — SCRIPT.JS
 Trading videos, Shorts discovery, search, likes, sharing,
 photo upload preview, filters and local preferences.

 Important:
 - Add a YouTube Data API key to enable live YouTube API search.
 - Without an API key, search opens YouTube results directly.
 - GitHub Pages alone cannot permanently store public uploads.
=========================================================
*/

document.addEventListener("DOMContentLoaded", () => {
    const CONFIG = {
        apiKey: "",
        resultsPerPage: 12,
        storageKey: "naolPageDataV1"
    };

    const CATEGORIES = [
        "All",
        "Forex",
        "Gold Trading",
        "Crypto",
        "ICT & SMC",
        "Trading Lessons",
        "Market Analysis",
        "Luxury Lifestyle"
    ];

    const TOPICS = [
        {
            title: "Forex Trading",
            query: "forex trading education for beginners"
        },
        {
            title: "Gold Trading",
            query: "XAUUSD gold trading analysis"
        },
        {
            title: "ICT & SMC",
            query: "ICT smart money concepts trading lesson"
        },
        {
            title: "Crypto",
            query: "cryptocurrency trading education"
        },
        {
            title: "Trading Lessons",
            query: "price action trading tutorial"
        },
        {
            title: "Market Analysis",
            query: "forex market analysis"
        },
        {
            title: "Luxury Lifestyle",
            query: "luxury lifestyle financial education"
        }
    ];

    const state = {
        videos: [],
        shownVideos: [],
        favorites: loadFavorites(),
        currentCategory: "All",
        currentQuery: "",
        nextPageToken: "",
        loading: false,
        apiAvailable: Boolean(CONFIG.apiKey),
        activeTab: "home"
    };

    // -----------------------------------------------------
    // STORAGE
    // -----------------------------------------------------

    function loadFavorites() {
        try {
            return JSON.parse(
                localStorage.getItem("naolPageFavorites") || "[]"
            );
        } catch (error) {
            return [];
        }
    }

    function saveFavorites() {
        try {
            localStorage.setItem(
                "naolPageFavorites",
                JSON.stringify(state.favorites)
            );
        } catch (error) {
            console.warn("Could not save favorites.", error);
        }
    }

    function getLocalPosts() {
        try {
            return JSON.parse(
                localStorage.getItem("naolPageLocalPosts") || "[]"
            );
        } catch (error) {
            return [];
        }
    }

    function saveLocalPosts(posts) {
        try {
            localStorage.setItem(
                "naolPageLocalPosts",
                JSON.stringify(posts)
            );
        } catch (error) {
            alert(
                "Suuraan kun localStorage keessatti kuufamuuf guddaa dha. " +
                "Suuraa xiqqaa fayyadami."
            );
        }
    }

    // -----------------------------------------------------
    // FIND EXISTING HTML ELEMENTS
    // -----------------------------------------------------

    function findElement(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    const appRoot = findElement([
        "#app",
        "#root",
        "#main",
        "#mainContent",
        ".app",
        ".app-container"
    ]);

    let searchInput = findElement([
        "#searchInput",
        "#search",
        "#videoSearch",
        'input[type="search"]',
        ".search-input"
    ]);

    let searchButton = findElement([
        "#searchBtn",
        "#searchButton",
        ".search-button",
        'button[aria-label="Search"]'
    ]);

    let feed = findElement([
        "#videoFeed",
        "#feed",
        "#videos",
        "#videoContainer",
        "#shortsFeed",
        ".video-feed",
        ".video-container"
    ]);

    let categorySelect = findElement([
        "#categoryFilter",
        "#categorySelect",
        "#category",
        ".category-filter"
    ]);

    let uploadInput = findElement([
        "#uploadInput",
        "#photoUpload",
        "#imageUpload",
        'input[type="file"][accept*="image"]'
    ]);

    let uploadButton = findElement([
        "#uploadBtn",
        "#uploadButton",
        ".upload-button"
    ]);

    let favoritesButton = findElement([
        "#favoritesBtn",
        "#likedBtn",
        '[data-tab="favorites"]'
    ]);

    let homeButton = findElement([
        "#homeBtn",
        '[data-tab="home"]'
    ]);

    // -----------------------------------------------------
    // CREATE A FALLBACK INTERFACE IF HTML ELEMENTS ARE MISSING
    // -----------------------------------------------------

    function createFallbackInterface() {
        if (feed) return;

        let container = appRoot;

        if (!container) {
            container = document.createElement("main");
            container.id = "naolApp";
            document.body.appendChild(container);
        }

        container.innerHTML = `
            <header class="naol-header">
                <a href="#" class="naol-brand" id="naolHomeLink">
                    <span class="naol-logo">N</span>
                    <span>Naol <strong>Page</strong></span>
                </a>

                <div class="naol-search">
                    <input
                        id="searchInput"
                        type="search"
                        placeholder="Search Forex, Gold, ICT, Crypto..."
                        aria-label="Search videos"
                    >
                    <button id="searchBtn" type="button">
                        Search
                    </button>
                </div>
            </header>

            <nav class="naol-nav" aria-label="Video categories">
                <button type="button" data-tab="home">For You</button>
                <button type="button" data-tab="favorites">Liked</button>
                <button type="button" data-tab="upload">Upload Photo</button>
            </nav>

            <div class="naol-topic-row" id="topicButtons"></div>

            <main class="naol-main">
                <div class="naol-status" id="statusMessage">
                    Welcome to Naol Page.
                </div>

                <section
                    id="videoFeed"
                    class="video-feed"
                    aria-label="Video feed"
                ></section>

                <button
                    type="button"
                    id="loadMoreBtn"
                    class="load-more-button"
                >
                    Load More Videos
                </button>

                <section class="naol-upload-area" id="uploadArea">
                    <h2>Share a Photo</h2>
                    <p>Select a photo from your device to preview it.</p>
                    <input
                        type="file"
                        id="uploadInput"
                        accept="image/*"
                        multiple
                    >
                    <div id="photoPreview" class="photo-preview"></div>
                </section>

                <footer class="naol-footer">
                    <p>Naol Page · Trading Knowledge · Learn Responsibly</p>
                </footer>
            </main>
        `;

        searchInput = document.querySelector("#searchInput");
        searchButton = document.querySelector("#searchBtn");
        feed = document.querySelector("#videoFeed");
        uploadInput = document.querySelector("#uploadInput");

        categorySelect = null;

        favoritesButton = null;
        homeButton = null;
    }

    createFallbackInterface();

    // -----------------------------------------------------
    // STATUS MESSAGES
    // -----------------------------------------------------

    function showStatus(message) {
        let status = document.querySelector("#statusMessage");

        if (!status && feed) {
            status = document.createElement("div");
            status.id = "statusMessage";
            status.className = "naol-status";

            feed.parentElement.insertBefore(status, feed);
        }

        if (status) {
            status.textContent = message;
        }
    }

    // -----------------------------------------------------
    // CATEGORY FILTERS
    // -----------------------------------------------------

    function createCategoryButtons() {
        const topicContainer = document.querySelector("#topicButtons");

        if (!topicContainer) return;

        topicContainer.innerHTML = "";

        CATEGORIES.forEach(category => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "topic-button";
            button.textContent = category;
            button.dataset.category = category;

            if (category === state.currentCategory) {
                button.classList.add("active");
            }

            button.addEventListener("click", () => {
                state.currentCategory = category;

                topicContainer
                    .querySelectorAll(".topic-button")
                    .forEach(item => item.classList.remove("active"));

                button.classList.add("active");

                if (category === "All") {
                    showRecommendedVideos();
                } else {
                    searchVideos(category);
                }
            });

            topicContainer.appendChild(button);
        });

        if (categorySelect && categorySelect.tagName === "SELECT") {
            const existingValues = Array.from(
                categorySelect.options
            ).map(option => option.value);

            CATEGORIES.forEach(category => {
                if (!existingValues.includes(category)) {
                    const option = document.createElement("option");
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                }
            });

            categorySelect.addEventListener("change", () => {
                state.currentCategory = categorySelect.value || "All";

                if (state.currentCategory === "All") {
                    showRecommendedVideos();
                } else {
                    searchVideos(state.currentCategory);
                }
            });
        }
    }

    // -----------------------------------------------------
    // VIDEO DATA
    // -----------------------------------------------------

    function makeVideoId(video) {
        return video.id?.videoId || video.id || "";
    }

    function normalizeYouTubeVideo(item) {
        const videoId = makeVideoId(item);

        if (!videoId) return null;

        return {
            id: videoId,
            title: item.snippet?.title || item.title || "Trading Video",
            description:
                item.snippet?.description ||
                item.description ||
                "Watch this educational video.",
            channel:
                item.snippet?.channelTitle ||
                item.channel ||
                "YouTube Creator",
            thumbnail:
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            publishedAt: item.snippet?.publishedAt || "",
            url: `https://www.youtube.com/watch?v=${videoId}`,
            category: state.currentCategory
        };
    }

    // -----------------------------------------------------
    // RECOMMENDED VIDEO CARDS
    // -----------------------------------------------------

    function showRecommendedVideos() {
        const topic = TOPICS[
            Math.floor(Math.random() * TOPICS.length)
        ];

        state.currentQuery = topic.query;

        if (CONFIG.apiKey) {
            searchVideos(topic.query);
        } else {
            renderDiscoveryCards(topic.query);
        }
    }

    function renderDiscoveryCards(query) {
        if (!feed) return;

        state.videos = [];
        feed.innerHTML = "";

        const title = document.createElement("h2");
        title.className = "discovery-heading";
        title.textContent = "Discover Trading Videos";
        feed.appendChild(title);

        const intro = document.createElement("p");
        intro.className = "discovery-description";
        intro.textContent =
            "Choose a topic to find relevant videos on YouTube.";
        feed.appendChild(intro);

        const grid = document.createElement("div");
        grid.className = "discovery-grid";

        const suggestions = query
            ? [{ title: query, query: query }]
            : TOPICS;

        suggestions.concat(TOPICS).forEach((topic, index) => {
            if (index > 9) return;

            const card = document.createElement("article");
            card.className = "discovery-card";

            const heading = document.createElement("h3");
            heading.textContent = topic.title || topic.query;

            const description = document.createElement("p");
            description.textContent =
                "Explore videos, tutorials and market education.";

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Find Videos";

            button.addEventListener("click", () => {
                searchVideos(topic.query);
            });

            card.append(heading, description, button);
            grid.appendChild(card);
        });

        feed.appendChild(grid);

        showStatus(
            CONFIG.apiKey
                ? "Ready to search videos."
                : "Demo mode: add a YouTube API key for live search results."
        );
    }

    // -----------------------------------------------------
    // YOUTUBE DATA API SEARCH
    // -----------------------------------------------------

    async function searchVideos(query, append = false) {
        const cleanedQuery = String(query || "").trim();

        if (!cleanedQuery) {
            showStatus("Maaloo jecha barbaaddu barreessi.");
            searchInput?.focus();
            return;
        }

        state.currentQuery = cleanedQuery;

        if (!CONFIG.apiKey) {
            showStatus(
                "Live video search needs a YouTube Data API key. " +
                "YouTube search is opening in a new tab."
            );

            const searchUrl =
                "https://www.youtube.com/results?search_query=" +
                encodeURIComponent(cleanedQuery);

            window.open(searchUrl, "_blank", "noopener,noreferrer");

            renderDiscoveryCards(cleanedQuery);
            return;
        }

        if (state.loading) return;

        state.loading = true;
        showStatus("Video barbaadaa jira...");

        if (!append) {
            state.nextPageToken = "";
            state.videos = [];

            if (feed) feed.innerHTML = "";
        }

        try {
            const parameters = new URLSearchParams({
                part: "snippet",
                type: "video",
                maxResults: String(CONFIG.resultsPerPage),
                q: cleanedQuery,
                key: CONFIG.apiKey,
                safeSearch: "moderate",
                videoEmbeddable: "true"
            });

            if (append && state.nextPageToken) {
                parameters.set("pageToken", state.nextPageToken);
            }

            const response = await fetch(
                "https://www.googleapis.com/youtube/v3/search?" +
                parameters.toString()
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                throw new Error(
                    errorData.error?.message ||
                    `Search failed (${response.status})`
                );
            }

            const data = await response.json();

            state.nextPageToken = data.nextPageToken || "";

            const results = (data.items || [])
                .map(normalizeYouTubeVideo)
                .filter(Boolean);

            if (append) {
                state.videos.push(...results);
            } else {
                state.videos = results;
            }

            renderVideoFeed(append);

            showStatus(
                `${state.videos.length} video result(s) found for "${cleanedQuery}".`
            );

            const moreButton = document.querySelector("#loadMoreBtn");

            if (moreButton) {
                moreButton.hidden = !state.nextPageToken;
            }

        } catch (error) {
            console.error("Naol Page search error:", error);

            showStatus(
                "Video search hin milkoofne. API key, internet fi API quota ilaali."
            );

            if (feed && !feed.children.length) {
                renderDiscoveryCards(cleanedQuery);
            }
        } finally {
            state.loading = false;
        }
    }

    // -----------------------------------------------------
    // RENDER VIDEO FEED
    // -----------------------------------------------------

    function renderVideoFeed(append = false) {
        if (!feed) return;

        if (!append) feed.innerHTML = "";

        if (!state.videos.length) {
            feed.innerHTML = `
                <div class="empty-state">
                    <h2>No videos found</h2>
                    <p>Try another search term or category.</p>
                </div>
            `;
            return;
        }

        const startIndex = append
            ? Math.max(0, state.videos.length - CONFIG.resultsPerPage)
            : 0;

        state.videos.slice(startIndex).forEach(video => {
            const card = document.createElement("article");

            card.className = "video-card";
            card.dataset.videoId = video.id;

            const media = document.createElement("div");
            media.className = "video-media";

            const thumbnail = document.createElement("img");
            thumbnail.className = "video-thumbnail";
            thumbnail.src = video.thumbnail;
            thumbnail.alt = video.title;
            thumbnail.loading = "lazy";

            thumbnail.addEventListener("error", () => {
                thumbnail.style.display = "none";
            });

            const openButton = document.createElement("button");
            openButton.type = "button";
            openButton.className = "play-video-button";
            openButton.textContent = "▶ Watch Video";
            openButton.setAttribute(
                "aria-label",
                `Watch ${video.title}`
            );

            openButton.addEventListener("click", () => {
                openVideo(video);
            });

            media.append(thumbnail, openButton);

            const content = document.createElement("div");
            content.className = "video-content";

            const title = document.createElement("h3");
            title.className = "video-title";
            title.textContent = video.title;

            const channel = document.createElement("p");
            channel.className = "video-channel";
            channel.textContent = video.channel;

            const description = document.createElement("p");
            description.className = "video-description";
            description.textContent = video.description;

            const actions = document.createElement("div");
            actions.className = "video-actions";

            const likeButton = document.createElement("button");
            likeButton.type = "button";
            likeButton.className = "like-button";
            likeButton.textContent = state.favorites.includes(video.id)
                ? "♥ Liked"
                : "♡ Like";

            likeButton.setAttribute(
                "aria-pressed",
                String(state.favorites.includes(video.id))
            );

            likeButton.addEventListener("click", () => {
                toggleFavorite(video.id, likeButton);
            });

            const shareButton = document.createElement("button");
            shareButton.type = "button";
            shareButton.className = "share-button";
            shareButton.textContent = "↗ Share";

            shareButton.addEventListener("click", () => {
                shareVideo(video);
            });

            const copyButton = document.createElement("button");
            copyButton.type = "button";
            copyButton.className = "copy-button";
            copyButton.textContent = "Copy Link";

            copyButton.addEventListener("click", async () => {
                await copyText(video.url);
            });

            actions.append(likeButton, shareButton, copyButton);
            content.append(title, channel, description, actions);
            card.append(media, content);

            feed.appendChild(card);
        });
    }

    function openVideo(video) {
        if (!video?.id) return;

        const watchUrl = video.url ||
            `https://www.youtube.com/watch?v=${video.id}`;

        window.open(watchUrl, "_blank", "noopener,noreferrer");
    }

    // -----------------------------------------------------
    // LIKE / FAVORITES
    // -----------------------------------------------------

    function toggleFavorite(videoId, button) {
        if (!videoId) return;

        if (state.favorites.includes(videoId)) {
            state.favorites = state.favorites.filter(
                id => id !== videoId
            );

            if (button) {
                button.textContent = "♡ Like";
                button.setAttribute("aria-pressed", "false");
            }

            showStatus("Liked videos keessaa haqame.");
        } else {
            state.favorites.push(videoId);

            if (button) {
                button.textContent = "♥ Liked";
                button.setAttribute("aria-pressed", "true");
            }

            showStatus("Video kana liked godhatte.");
        }

        saveFavorites();
    }

    function showFavorites() {
        if (!feed) return;

        state.activeTab = "favorites";
        feed.innerHTML = "";

        const favoriteVideos = state.videos.filter(video =>
            state.favorites.includes(video.id)
        );

        if (!favoriteVideos.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";

            const heading = document.createElement("h2");
            heading.textContent = "Your Liked Videos";

            const message = document.createElement("p");
            message.textContent =
                "Video like goote asitti mul'ata. Video barbaadi, achiis Like tuqi.";

            const searchButtonElement = document.createElement("button");
            searchButtonElement.type = "button";
            searchButtonElement.textContent = "Find Videos";

            searchButtonElement.addEventListener("click", () => {
                searchVideos("forex trading education");
            });

            empty.append(heading, message, searchButtonElement);
            feed.appendChild(empty);

            showStatus("Ammaaf liked video hin jiru.");
            return;
        }

        favoriteVideos.forEach(video => {
            const card = document.createElement("article");
            card.className = "video-card";

            const title = document.createElement("h3");
            title.textContent = video.title;

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "▶ Watch";

            button.addEventListener("click", () => openVideo(video));

            card.append(title, button);
            feed.appendChild(card);
        });

        showStatus(`${favoriteVideos.length} liked video(s).`);
    }

    // -----------------------------------------------------
    // SHARE AND COPY LINK
    // -----------------------------------------------------

    async function shareVideo(video) {
        const shareData = {
            title: video.title,
            text: `Watch this video on Naol Page: ${video.title}`,
            url: video.url
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await copyText(video.url);
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                await copyText(video.url);
            }
        }
    }

    async function copyText(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");

                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";

                document.body.appendChild(textArea);
                textArea.select();

                const successful = document.execCommand("copy");
                textArea.remove();

                if (!successful) {
                    throw new Error("Copy failed");
                }
            }

            showStatus("Link copy ta'eera. Amma paste gochuu dandeessa.");
        } catch (error) {
            window.prompt("Link kana copy godhi:", text);
        }
    }

    // -----------------------------------------------------
    // PHOTO UPLOAD PREVIEW
    // -----------------------------------------------------

    function showUploadedPhotos(files) {
        const preview = document.querySelector("#photoPreview");

        if (!preview) {
            showStatus(
                "Photo upload input argameera; preview area HTML keessatti dabali."
            );
            return;
        }

        Array.from(files || []).forEach(file => {
            if (!file.type.startsWith("image/")) {
                showStatus("Maaloo faayila image qofa filadhu.");
                return;
            }

            if (file.size > 8 * 1024 * 1024) {
                showStatus("Suuraan tokko 8 MB gadi ta'uu qaba.");
                return;
            }

            const reader = new FileReader();

            reader.onload = event => {
                const wrapper = document.createElement("article");
                wrapper.className = "uploaded-photo-card";

                const image = document.createElement("img");
                image.src = event.target.result;
                image.alt = file.name;

                const caption = document.createElement("p");
                caption.textContent = file.name;

                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.textContent = "Remove";

                removeButton.addEventListener("click", () => {
                    wrapper.remove();
                });

                wrapper.append(image, caption, removeButton);
                preview.appendChild(wrapper);

                showStatus(
                    "Suuraan preview irratti mul'ateera. Kun amma bilbila kee qofa irratti mul'ata."
                );
            };

            reader.onerror = () => {
                showStatus("Suuraa kana dubbisuu hin dandeenye.");
            };

            reader.readAsDataURL(file);
        });
    }

    // -----------------------------------------------------
    // NAVIGATION
    // -----------------------------------------------------

    function setupNavigation() {
        document.querySelectorAll("[data-tab]").forEach(button => {
            button.addEventListener("click", () => {
                const tab = button.dataset.tab;

                if (tab === "favorites") {
                    showFavorites();
                } else if (tab === "upload") {
                    const uploadArea = document.querySelector("#uploadArea");

                    if (uploadArea) {
                        uploadArea.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    } else if (uploadInput) {
                        uploadInput.click();
                    }
                } else {
                    state.activeTab = "home";
                    showRecommendedVideos();

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }
            });
        });

        if (favoritesButton) {
            favoritesButton.addEventListener("click", showFavorites);
        }

        if (homeButton) {
            homeButton.addEventListener("click", showRecommendedVideos);
        }

        const homeLink = document.querySelector("#naolHomeLink");

        if (homeLink) {
            homeLink.addEventListener("click", event => {
                event.preventDefault();
                showRecommendedVideos();
            });
        }
    }

    // -----------------------------------------------------
    // SEARCH EVENTS
    // -----------------------------------------------------

    function setupSearch() {
        if (searchButton) {
            searchButton.addEventListener("click", () => {
                searchVideos(searchInput?.value || "");
            });
        }

        if (searchInput) {
            searchInput.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    searchVideos(searchInput.value);
                }
            });
        }

        document.querySelectorAll("[data-search-query]").forEach(button => {
            button.addEventListener("click", () => {
                const query = button.dataset.searchQuery;
                if (searchInput) searchInput.value = query;
                searchVideos(query);
            });
        });
    }

    // -----------------------------------------------------
    // LOAD MORE / INFINITE SCROLL
    // -----------------------------------------------------

    function loadMoreVideos() {
        if (!CONFIG.apiKey) {
            showStatus(
                "Live Load More hojii gochuuf YouTube API key barbaachisa."
            );
            return;
        }

        if (state.nextPageToken && !state.loading) {
            searchVideos(state.currentQuery, true);
        }
    }

    function setupInfiniteScroll() {
        const moreButton = document.querySelector("#loadMoreBtn");

        if (moreButton) {
            moreButton.addEventListener("click", loadMoreVideos);
        }

        if (!("IntersectionObserver" in window)) return;

        const sentinel = document.createElement("div");
        sentinel.id = "feedSentinel";
        sentinel.style.height = "20px";

        if (feed?.parentElement) {
            feed.parentElement.appendChild(sentinel);
        }

        const observer = new IntersectionObserver(entries => {
            const visible = entries.some(entry => entry.isIntersecting);

            if (
                visible &&
                state.apiAvailable &&
                state.nextPageToken &&
                !state.loading
            ) {
                loadMoreVideos();
            }
        }, {
            rootMargin: "300px"
        });

        observer.observe(sentinel);
    }

    // -----------------------------------------------------
    // SWIPE SUPPORT
    // -----------------------------------------------------

    function setupSwipeSupport() {
        if (!feed) return;

        let startX = 0;
        let startY = 0;

        feed.addEventListener("touchstart", event => {
            const touch = event.changedTouches[0];

            startX = touch.screenX;
            startY = touch.screenY;
        }, { passive: true });

        feed.addEventListener("touchend", event => {
            const touch = event.changedTouches[0];

            const differenceX = touch.screenX - startX;
            const differenceY = touch.screenY - startY;

            if (
                Math.abs(differenceX) > 100 &&
                Math.abs(differenceX) > Math.abs(differenceY)
            ) {
                if (differenceX < 0) {
                    showStatus(
                        "Video itti aanu ilaaluuf feed irratti gadiitti scroll godhi."
                    );
                } else {
                    showStatus(
                        "Video duraanii ilaaluuf feed irratti olitti scroll godhi."
                    );
                }
            }
        }, { passive: true });
    }

    // -----------------------------------------------------
    // KEYBOARD SHORTCUTS
    // -----------------------------------------------------

    function setupKeyboardShortcuts() {
        document.addEventListener("keydown", event => {
            const target = event.target;

            if (
                target &&
                ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
            ) {
                return;
            }

            if (event.key === "/") {
                event.preventDefault();
                searchInput?.focus();
            }

            if (event.key === "Escape") {
                searchInput?.blur();
            }
        });
    }

    // -----------------------------------------------------
    // UPLOAD EVENTS
    // -----------------------------------------------------

    function setupUpload() {
        if (uploadInput) {
            uploadInput.addEventListener("change", event => {
                showUploadedPhotos(event.target.files);
                event.target.value = "";
            });
        }

        if (uploadButton && uploadInput) {
            uploadButton.addEventListener("click", () => {
                uploadInput.click();
            });
        }
    }

    // -----------------------------------------------------
    // OPTIONAL PWA INSTALL BUTTON
    // -----------------------------------------------------

    let installPrompt = null;

    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        installPrompt = event;

        let installButton = document.querySelector("#installAppBtn");

        if (!installButton) {
            installButton = document.createElement("button");
            installButton.id = "installAppBtn";
            installButton.type = "button";
            installButton.textContent = "Install Naol Page";

            const header = document.querySelector(".naol-header");

            if (header) {
                header.appendChild(installButton);
            }
        }

        installButton.hidden = false;

        installButton.addEventListener("click", async () => {
            if (!installPrompt) return;

            installPrompt.prompt();
            await installPrompt.userChoice;

            installPrompt = null;
            installButton.hidden = true;
        }, { once: true });
    });

    // -----------------------------------------------------
    // INITIALIZE WEBSITE
    // -----------------------------------------------------

    function initialize() {
        createCategoryButtons();
        setupNavigation();
        setupSearch();
        setupInfiniteScroll();
        setupSwipeSupport();
        setupKeyboardShortcuts();
        setupUpload();

        if (searchInput) {
            searchInput.setAttribute(
                "autocomplete",
                "off"
            );
        }

        if (CONFIG.apiKey) {
            showRecommendedVideos();
        } else {
            renderDiscoveryCards("");
            showStatus(
                "Naol Page is ready. Select a topic or search YouTube."
            );
        }

        console.log("Naol Page initialized successfully.");
    }

    initialize();
});
