/**
 * @file Boot order for index.html.
 *
 * The other three files publish functions and do nothing on their own, so the
 * sequence below is the whole of the page's behaviour: detect a language, apply
 * it, keep the switcher and the head metadata in step with it.
 *
 * @requires js/i18n.js
 * @requires js/seo.js
 * @requires js/switcher.js
 */

(function (window, document) {
    "use strict";

    /**
     * Brings the page furniture in line with the copy now on screen.
     *
     * @param {string} language Language code on screen.
     * @returns {void}
     */
    function reflect(language) {
        window.langSwitcher.mark(language);
        window.seoTags.sync(language);
    }

    document.addEventListener("DOMContentLoaded", function () {
        var i18n = window.i18nEngine;

        document.getElementById("year").textContent = new Date().getFullYear();

        // index.html ships with the English copy inline, so if the locale files
        // cannot be fetched — opened straight off disk over file://, say — the
        // page still reads correctly in English.
        i18n.init().then(function () {
            reflect(i18n.currentLanguage);

            // Only now, so the warm-up cannot compete with the fetch the
            // visitor is actually waiting for.
            i18n.warmCache();
        }, function () {
            reflect(i18n.defaultLanguage);
        });

        window.langSwitcher.onSelect(function (language) {
            function done() {
                // Pin first, then reflect: seoTags.sync reads the query string,
                // so the other order would leave canonical stale.
                window.seoTags.pin(i18n.currentLanguage);
                reflect(i18n.currentLanguage);
            }

            // Both paths: setLanguage records the choice before it fetches, so
            // a locale that fails to load still leaves the switcher and the URL
            // showing what the visitor asked for.
            i18n.setLanguage(language).then(done, done);
        });
    });

}(window, document));
