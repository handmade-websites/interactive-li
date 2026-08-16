/**
 * @file The language switcher in the masthead: which entry reads as current,
 * and what a click on one means.
 *
 * It reports the choice and stops there — loading the language and updating the
 * head are js/main.js's business. Its own aria-current is the state it reads
 * back, so it needs to know nothing about the translation engine.
 *
 * Publishes `window.langSwitcher`. Nothing here runs on its own.
 */

(function (window, document) {
    "use strict";

    /** The switcher entries, in markup order. */
    var SELECTOR = ".lang-link";

    window.langSwitcher = {

        /**
         * Marks the language on screen.
         *
         * aria-current is the attribute assistive tech reads, and the
         * stylesheet keys off it too, so the visible state and the announced
         * state cannot drift apart. It is also what onSelect tests against, so
         * this must be called whenever the copy changes.
         *
         * @param {string} language Language code on screen.
         * @returns {void}
         */
        mark: function (language) {
            document.querySelectorAll(SELECTOR).forEach(function (link) {
                if (link.getAttribute("data-lang") === language) {
                    link.setAttribute("aria-current", "true");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        },

        /**
         * Calls back with the code a visitor picked, ignoring a click on the
         * language already shown.
         *
         * The entries are real links to ?lang=xx. With scripting on we swap in
         * place instead of reloading; the href stays meaningful for
         * middle-click, "copy link address", and crawlers.
         *
         * A modified click is left to the browser, so ctrl/cmd-click still
         * opens the variant in a new tab rather than swapping this one.
         *
         * @param {function(string): void} handler Receives the chosen code.
         * @returns {void}
         */
        onSelect: function (handler) {
            document.querySelectorAll(SELECTOR).forEach(function (link) {
                link.addEventListener("click", function (event) {
                    var language = link.getAttribute("data-lang");

                    if (event.metaKey || event.ctrlKey || event.shiftKey
                            || event.altKey || event.button !== 0) {
                        return;
                    }

                    event.preventDefault();

                    if (language && !link.hasAttribute("aria-current")) {
                        handler(language);
                    }
                });
            });
        }
    };

}(window, document));
