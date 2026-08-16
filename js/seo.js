/**
 * @file Head metadata that depends on the language on screen: canonical,
 * og:url, og:locale, and the ?lang= parameter in the address bar.
 *
 * One URL serves three languages, so these cannot be settled in the markup —
 * index.html carries the values for the bare English URL and this file corrects
 * them once a language is known.
 *
 * Publishes `window.seoTags`. Nothing here runs on its own: js/main.js decides
 * when each call happens.
 *
 * @requires js/i18n.js
 */

(function (window, document) {
    "use strict";

    /** Absolute origin used to build canonical and og:url values. */
    var ORIGIN = "https://interactive.li";

    /**
     * Open Graph wants language_TERRITORY, not a bare code.
     * @see https://ogp.me/#optional
     */
    var OG_LOCALES = { en: "en_US", de: "de_DE", fr: "fr_FR" };

    window.seoTags = {

        /**
         * Points canonical and og:url at the URL that was actually requested.
         *
         * An auto-detected language must not rewrite them: detection is
         * personalisation, not a distinct page. So the bare URL stays the
         * x-default and ?lang=xx is its own canonical.
         *
         * English is the exception: it is the copy already in the markup, so
         * ?lang=en and the bare URL are the same page and both canonicalise to
         * the bare one. Adding ?lang=en here would split it into two indexable
         * URLs carrying identical text. The hreflang set in the markup says the
         * same.
         *
         * og:locale describes the copy on screen, so that one follows the
         * active language.
         *
         * @param {string} language Language code on screen.
         * @returns {void}
         */
        sync: function (language) {
            var pinned = window.i18nEngine.languageFromQuery();
            var explicit = pinned && pinned !== window.i18nEngine.defaultLanguage;
            var href = ORIGIN + "/" + (explicit ? "?lang=" + pinned : "");

            document.querySelector("link[rel='canonical']").setAttribute("href", href);
            document.querySelector("meta[property='og:url']").setAttribute("content", href);
            document.querySelector("meta[property='og:locale']")
                .setAttribute("content", OG_LOCALES[language] || language);
        },

        /**
         * Writes ?lang= into the address bar after an explicit choice, so the
         * URL can be copied and shared. replaceState leaves the back button
         * alone.
         *
         * @param {string} language Language code to pin.
         * @returns {void}
         */
        pin: function (language) {
            var url;

            try {
                url = new window.URL(window.location.href);
                url.searchParams.set("lang", language);
                window.history.replaceState(null, "", url.pathname + url.search + url.hash);
            } catch (error) {
                // Older browser: the switcher still works, the URL just stays put.
            }
        }
    };

}(window, document));
