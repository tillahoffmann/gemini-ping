"use strict";
// ==UserScript==
// @name         Gemini Ping
// @version      1.0.0
// @description  Ping when Gemini has finished.
// @author       You
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

function getConversationTitle(): string {
    const titleElement = document.body.querySelector(".selected > .conversation-title");
    if (!titleElement || !titleElement.textContent) {
        return "Google Gemini";
    }
    return titleElement.textContent.trim();
}

function interceptStreamingRequest(callback: EventListenerOrEventListenerObject) {
    // Store the original methods that we want to intercept.
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    // Interface definition for modified request. We need to store the request
    // parameters because they are not available in `send`.
    interface PatchedXMLHttpRequest extends XMLHttpRequest {
        _method: string;
        _url: string;
    }

    // Overwrite open and send methods.
    XMLHttpRequest.prototype.open = function (this: PatchedXMLHttpRequest, method: string, url: string | URL, ...args: any[]) {
        this._method = method;
        this._url = url.toString();
        return originalOpen.apply(this, [method, url, ...args] as any);
    };

    XMLHttpRequest.prototype.send = function (this: PatchedXMLHttpRequest, body?: any) {
        if (this._method.toUpperCase() === 'POST' && new URL(this._url, window.location.origin).pathname.endsWith('/StreamGenerate')) {
            this.addEventListener('load', callback, false);
        }
        return originalSend.call(this, body);
    };
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

    // Set up an observer to check if we now have a button to stop processing.
    const TARGET_LABEL = "Stop response";
    const TARGET_ATTR = "aria-label";
    const observer = new MutationObserver(function (mutations: Array<MutationRecord>) {
        for (const mutation of mutations) {
            // We only care about aria-label changes.
            if (mutation.attributeName !== TARGET_ATTR) {
                continue;
            }

            const oldValue = mutation.oldValue;
            const newValue = (mutation.target as HTMLElement).getAttribute(TARGET_ATTR);
            if (oldValue !== TARGET_LABEL && newValue === TARGET_LABEL) {
                // Started processing.
                document.title = `⏳ ${getConversationTitle()}`;
            }
        }
    });
    observer.observe(
        document.body, { subtree: true, attributes: true, attributeOldValue: true }
    );

    // Overwrite the streaming responses to check if we're done with processing.
    interceptStreamingRequest(() => {
        // Finished processing.
        const title = getConversationTitle();
        document.title = `✅ ${title}`;
        if (audio) {
            audio.play();
        }

        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                const notification = new Notification(
                    title, {
                    silent: false,
                });
                notification.onclick = () => { window.focus() };
            }
        });
    });
})();


