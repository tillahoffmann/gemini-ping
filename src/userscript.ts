"use strict";
// ==UserScript==
// @name         Gemini Ping
// @version      1.0.0
// @description  Ping when Gemini has finished.
// @author       You
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    // Load the audio cue file.
    let audio: HTMLAudioElement | null = null;
    GM_xmlhttpRequest({
        method: "GET",
        url: "http://i.cloudup.com/2OPb5OYAI2.ogg",
        responseType: "blob",
        onload: function (response) {
            if (response.status >= 200 && response.status < 300) {
                const blob = response.response;
                const audioObjectUrl = URL.createObjectURL(blob);
                audio = new Audio(audioObjectUrl);
            }
        }
    });

    // Get the title of the current conversation.
    function getConversationTitle(): string {
        const titleElement = document.body.querySelector(".selected > .conversation-title");
        if (!titleElement || !titleElement.textContent) {
            return "Google Gemini";
        }
        return titleElement.textContent.trim();
    }

    // Change the title when generation starts.
    function onGenerationStart(): void {
        document.title = `⏳ ${getConversationTitle()}`;
    }

    // Update the title and send a notification when the generation ends.
    function onGenerationEnd(this: XMLHttpRequest): void {
        const title = getConversationTitle();

        const notificationOptions: NotificationOptions = {
            icon: "https://www.google.com/images/branding/product/1x/gemini_48dp.png",
            silent: false,
        };
        if (this.status >= 200 && this.status < 300) {
            document.title = `✅ ${title}`;
            notificationOptions.body = "Your response is ready.";
        } else {
            document.title = `❌ ${title}`;
            notificationOptions.body = "Your request failed.";
        }

        // Play the notification sound regardless.
        if (audio) {
            audio.play().catch(e => console.error("Audio playback failed:", e));
        }

        Notification.requestPermission().then((permission: NotificationPermission) => {
            if (permission === "granted") {
                const notification = new Notification(title, notificationOptions);
                notification.onclick = () => window.focus();
            }
        });
    }

    function interceptXhr(): void {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        interface PatchedXMLHttpRequest extends XMLHttpRequest {
            _method: string;
            _url: string;
        }

        XMLHttpRequest.prototype.open = function (this: PatchedXMLHttpRequest, method: string, url: string | URL, ...args: any[]) {
            // Add the method and url to the patched request because we cannot identify the
            // request details in the `send` method.
            this._method = method;
            this._url = url.toString();
            return originalOpen.apply(this, [method, url, ...args] as any);
        };

        XMLHttpRequest.prototype.send = function (this: PatchedXMLHttpRequest, body?: any) {
            const isStreamingRequest = (
                this._method.toUpperCase() === 'POST'
                && new URL(this._url, window.location.origin).pathname.endsWith('/StreamGenerate')
            );
            if (isStreamingRequest) {
                onGenerationStart()
                this.addEventListener("loadend", onGenerationEnd, { once: true });
            }
            return originalSend.call(this, body);
        };
    }

    interceptXhr();
})();
