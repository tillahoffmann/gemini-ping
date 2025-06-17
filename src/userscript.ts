"use strict";
// ==UserScript==
// @name         Gemini Ping
// @version      1.0.0
// @description  Ping when Gemini has finished.
// @author       You
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

function removePrefix(text: string, prefix: string): string {
    if (text.startsWith(prefix)) {
        text = text.substring(prefix.length);
    }
    return text;
}

(function () {

    // Download a notification sound.
    let audio: HTMLAudioElement | null = null;
    // Use GM_xmlhttpRequest to fetch the audio file because it bypasses page CSP.
    GM_xmlhttpRequest({
        method: "GET",
        url: "http://i.cloudup.com/2OPb5OYAI2.ogg",
        responseType: "blob",
        onload: function (response) {
            // Check for a successful response
            if (response.status >= 200 && response.status < 300) {
                // Create a Blob from the audio data and then create an Object URL
                const blob = response.response;
                const audioObjectUrl = URL.createObjectURL(blob);
                audio = new Audio(audioObjectUrl);
            }
        }
    });

    // Periodically check if the processing status changed.
    let processing = false;
    setInterval(() => {
        const stopButton = document.querySelector("[aria-label='Stop response']");

        if (processing && !stopButton) {
            // We are no longer processing, change the prefix and alert.
            document.title = `✅ ${removePrefix(document.title, "⏳ ")}`;
            processing = false;
            if (audio) {
                audio.play();
            }
        } else if (!processing && stopButton) {
            // We have started processing, change the prefix.
            document.title = `⏳ ${removePrefix(document.title, "✅ ")}`;
            processing = true;
        }
    }, 1000);
})();
