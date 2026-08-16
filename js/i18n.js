/**
 * @file Minimal i18n engine.
 *
 * Loads a locale JSON file and applies it to the document. Nothing in here is
 * specific to this site's markup: it only knows about two attributes.
 *
 *   data-i18n="hero.headline"
 *       Replaces the element's text with the value at that dotted path.
 *
 *   data-i18n-attr="content:meta.description"
 *       Sets an attribute from that path. Several pairs may be separated by
 *       semicolons, e.g. "aria-label:a11y.nav;title:a11y.nav".
 *
 * Dotted paths walk objects and arrays alike, so both
 * "experiences.items.generations.hook" and "some.list.0.title" resolve. A path
 * that resolves to nothing leaves the element alone, so the markup's own text
 * stands as the fallback. Values are written with textContent and
 * setAttribute, never as HTML.
 *
 * Publishes `window.i18nEngine`. It changes the document and reports nothing:
 * js/main.js knows when a swap happened, because it asked for it.
 */

(function (window, document) {
    "use strict";

    /** Locales shipped in js/i18n/. Adding one means adding its JSON file too. */
    var SUPPORTED_LANGUAGES = ["en", "de", "fr"];

    /** Used when nothing else matches, and as the inline fallback in index.html. */
    var DEFAULT_LANGUAGE = "en";

    /** localStorage key holding the visitor's last explicit choice. */
    var STORAGE_KEY = "interactive-li:lang";

    /** Resolved against the page, not this script: the page sits at the site root. */
    var LOCALE_PATH = "js/i18n/";

    /** Parsed locale files, keyed by language code, so a language loads once. */
    var cache = {};

    /**
     * Reduces any locale string to a supported two-letter code.
     * Handles regional tags and casing, so "fr-CH" and "FR" both yield "fr".
     *
     * @param {string} value Raw locale string.
     * @returns {?string} Supported code, or null.
     */
    function normalise(value) {
        var code = String(value || "").slice(0, 2).toLowerCase();

        return SUPPORTED_LANGUAGES.indexOf(code) !== -1 ? code : null;
    }

    /**
     * Reads ?lang= from the query string.
     *
     * @returns {?string} Supported code, or null when absent or unrecognised.
     */
    function languageFromQuery() {
        var match = /[?&]lang=([^&#]*)/i.exec(window.location.search);

        return match ? normalise(decodeURIComponent(match[1])) : null;
    }

    /**
     * Reads the visitor's remembered choice.
     *
     * @returns {?string} Supported code, or null when unset or unreadable.
     */
    function languageFromStorage() {
        try {
            return normalise(window.localStorage.getItem(STORAGE_KEY));
        } catch (error) {
            // Private mode or blocked storage: fall through to the next source.
            return null;
        }
    }

    /**
     * Walks the browser's ordered locale preferences and returns the first
     * language this site can serve. A visitor set to ["es-ES", "de-AT"] gets
     * German rather than the default.
     *
     * @returns {?string} Supported code, or null when none match.
     */
    function languageFromBrowser() {
        var preferences = window.navigator.languages;
        var index;
        var code;

        if (!preferences || !preferences.length) {
            preferences = [window.navigator.language];
        }

        for (index = 0; index < preferences.length; index += 1) {
            code = normalise(preferences[index]);

            if (code) {
                return code;
            }
        }

        return null;
    }

    /**
     * Decides which language to show, most explicit signal first:
     * an URL parameter beats a remembered choice, which beats the browser's
     * own locale, which falls back to English.
     *
     * @returns {string} Supported language code.
     */
    function detectLanguage() {
        return languageFromQuery()
            || languageFromStorage()
            || languageFromBrowser()
            || DEFAULT_LANGUAGE;
    }

    /**
     * Resolves a dotted path against the dictionary.
     *
     * @param {Object} dictionary Parsed locale file.
     * @param {string} path Dotted path, e.g. "experiences.items.generations.hook".
     * @returns {*} The value, or undefined if any step is missing.
     */
    function valueAt(dictionary, path) {
        var parts = path.split(".");
        var current = dictionary;
        var index;

        for (index = 0; index < parts.length; index += 1) {
            if (current === null || current === undefined) {
                return undefined;
            }

            current = current[parts[index]];
        }

        return current;
    }

    /**
     * Removes inline [[TODO: ...]] authoring markers so unfinished copy never
     * reaches a visitor.
     *
     * @param {*} value Candidate string.
     * @returns {*} Cleaned string, or the value untouched if not a string.
     */
    function stripTodo(value) {
        if (typeof value !== "string") {
            return value;
        }

        return value.replace(/\s*\[\[TODO:[^\]]*\]\]/g, "").trim();
    }

    /**
     * Fetches a locale file, or returns the cached copy.
     *
     * @param {string} language Supported language code.
     * @returns {Promise<Object>} Resolves with the parsed dictionary.
     */
    function loadLocale(language) {
        if (cache[language]) {
            return Promise.resolve(cache[language]);
        }

        return fetch(LOCALE_PATH + language + ".json").then(function (response) {
            if (!response.ok) {
                throw new Error("Locale " + language + ": HTTP " + response.status);
            }

            return response.json();
        }).then(function (dictionary) {
            cache[language] = dictionary;

            return dictionary;
        });
    }

    /**
     * Writes a dictionary into every translatable node in the document.
     *
     * @param {Object} dictionary Parsed locale file.
     * @param {string} language Language code being applied.
     * @returns {void}
     */
    function applyToDocument(dictionary, language) {
        document.querySelectorAll("[data-i18n]").forEach(function (node) {
            var value = valueAt(dictionary, node.getAttribute("data-i18n"));

            if (value !== undefined) {
                node.textContent = stripTodo(value);
            }
        });

        document.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
            node.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
                var parts = pair.split(":");
                var value;

                if (parts.length < 2) {
                    return;
                }

                // Re-join the tail so a path may itself contain a colon.
                value = valueAt(dictionary, parts.slice(1).join(":").trim());

                if (value !== undefined) {
                    node.setAttribute(parts[0].trim(), stripTodo(value));
                }
            });
        });

        document.documentElement.lang = language;
    }

    window.i18nEngine = {

        /** @type {string} Language currently on screen. */
        currentLanguage: DEFAULT_LANGUAGE,

        /** @type {string} Language the inline markup is already written in. */
        defaultLanguage: DEFAULT_LANGUAGE,

        languageFromQuery: languageFromQuery,

        /**
         * Loads a language and applies it. An unsupported code silently falls
         * back to the default.
         *
         * @param {string} language Language code.
         * @returns {Promise<Object>} Resolves with the dictionary applied.
         */
        setLanguage: function (language) {
            var resolved = normalise(language) || DEFAULT_LANGUAGE;

            this.currentLanguage = resolved;

            try {
                window.localStorage.setItem(STORAGE_KEY, resolved);
            } catch (error) {
                // Storage is a convenience here, never a requirement.
            }

            return loadLocale(resolved).then(function (dictionary) {
                applyToDocument(dictionary, resolved);

                return dictionary;
            });
        },

        /**
         * Detects the visitor's language and applies it.
         *
         * @returns {Promise<Object>} Resolves with the dictionary applied.
         */
        init: function () {
            return this.setLanguage(detectLanguage());
        },

        /**
         * Fetches the locales into the cache in the background, so the first
         * switch to one renders without waiting on the network.
         *
         * Call it only once the language on screen has been applied: three
         * requests firing alongside that one would slow down the only fetch a
         * visitor actually waits for. Failures are ignored on purpose —
         * setLanguage fetches on demand anyway, so a warm-up that does not
         * arrive costs the head start and nothing else.
         *
         * @returns {void}
         */
        warmCache: function () {
            SUPPORTED_LANGUAGES.forEach(function (language) {
                loadLocale(language).catch(function () {});
            });
        }
    };

}(window, document));
