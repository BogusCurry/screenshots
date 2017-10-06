/* globals catcher, callBackground */
/** This is a content script added to all screenshots.firefox.com pages, and allows the site to
    communicate with the add-on */

"use strict";

this.sitehelper = (function() {

  catcher.registerHandler((errorObj) => {
    callBackground("reportError", errorObj);
  });


  function sendCustomEvent(name, detail) {
    if (typeof detail == "object") {
      // Note sending an object can lead to security problems, while a string
      // is safe to transfer:
      detail = JSON.stringify(detail);
    }
    document.dispatchEvent(new CustomEvent(name, {detail}));
  }

  /** Set the cookie, even if third-party cookies are disabled in this browser
      (when they are disabled, login from the background page won't set cookies) */
  function sendBackupCookieRequest(authHeaders) {
    // We want this to be sent as though it is sent by the page, which will make
    // the cookie NOT a third party cookie:
    let MyXMLHttpRequest = document.defaultView.XMLHttpRequest;
    // FIXME: seems impossible to get an XMLHttpRequest that acts as though the
    // content page is what made the request
    console.log("using xmlhttprequest:", MyXMLHttpRequest, XMLHttpRequest === MyXMLHttpRequest);
    let req = new MyXMLHttpRequest();
    req.open("POST", "/api/set-login-cookie");
    for (let name in authHeaders) {
      req.setRequestHeader(name, authHeaders[name]);
    }
    req.send("");
    req.onload = () => {
      if (req.status != 200) {
        console.warn("Attempt to set Screenshots cookie via /api/set-login-cookie failed:", req.status, req.statusText, req.responseText);
      } else {
        console.log("Got a good response from setting cookie");
      }
    };
  }

  document.addEventListener("delete-everything", catcher.watchFunction((event) => {
    // FIXME: reset some data in the add-on
  }, false));

  document.addEventListener("request-login", catcher.watchFunction((event) => {
    let shotId = event.detail;
    catcher.watchPromise(callBackground("getAuthInfo", shotId || null).then((info) => {
      sendBackupCookieRequest(info.authHeaders);
      sendCustomEvent("login-successful", {deviceId: info.deviceId, isOwner: info.isOwner});
    }));
  }));

  document.addEventListener("request-onboarding", catcher.watchFunction((event) => {
    callBackground("requestOnboarding");
  }));

  // Depending on the script loading order, the site might get the addon-present event,
  // but probably won't - instead the site will ask for that event after it has loaded
  document.addEventListener("request-addon-present", catcher.watchFunction(() => {
    sendCustomEvent("addon-present");
  }));

  sendCustomEvent("addon-present");

})();
null;
