/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "b4124987c6388b5a9c5ed2651a4584e0"
  }, {
    "url": "pwa-512x512.png",
    "revision": "60d8d1ce622ae1a195254cd8857f5fe4"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d7ca32c8a4bbd5d52f440f4c15e196e1"
  }, {
    "url": "index.html",
    "revision": "82e2f42448b3f80191fc9ad0a89f18da"
  }, {
    "url": "icon.svg",
    "revision": "bd2315e8176c2bc6fe21bc2b1a2dfd07"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "56c8f7f75ae90e80a4898715f1c8319f"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/web-Dmablkgr.js",
    "revision": null
  }, {
    "url": "assets/web-Bl70lZES.js",
    "revision": null
  }, {
    "url": "assets/kia_269d7c8e.png",
    "revision": null
  }, {
    "url": "assets/kia-sad.png",
    "revision": null
  }, {
    "url": "assets/kia-happy.png",
    "revision": null
  }, {
    "url": "assets/index-DJQ9I4X6.js",
    "revision": null
  }, {
    "url": "assets/index-CF0OoFBS.css",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-Thin-DdUiS1cj.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-SemiBold-26ZP1ILp.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-Regular-CtGL0YI-.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-Medium-D86t5Axy.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-Light-Byrs-DlH.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-ExtraLight-DNfybfsL.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-ExtraBold-DCjt2qDm.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-Bold-_OhAJEdh.woff2",
    "revision": null
  }, {
    "url": "assets/Vazirmatn-Black-DA1YqYMq.woff2",
    "revision": null
  }, {
    "url": "assets/Abacus3D-Bwzfy_Sf.js",
    "revision": null
  }, {
    "url": "assets/aistudio/kia_269d7c8e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_f710d8b5.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_ccb47a3f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_c888f76e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_7fbd57d6.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_4ec70801.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_4c9ea31d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_43ff1f81.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_320a24ff.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_2d49a54f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-22_022904_2f9f7361.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "56c8f7f75ae90e80a4898715f1c8319f"
  }, {
    "url": "icon.svg",
    "revision": "bd2315e8176c2bc6fe21bc2b1a2dfd07"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d7ca32c8a4bbd5d52f440f4c15e196e1"
  }, {
    "url": "pwa-512x512.png",
    "revision": "60d8d1ce622ae1a195254cd8857f5fe4"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "b4124987c6388b5a9c5ed2651a4584e0"
  }, {
    "url": "assets/kia-happy.png",
    "revision": "14541be29b1c6c07b2104f66a666b8f1"
  }, {
    "url": "assets/kia-sad.png",
    "revision": "8e489af58b862eaf503715051172a95c"
  }, {
    "url": "assets/kia_269d7c8e.png",
    "revision": "3dac16ea8fea417dedf673494950b8ad"
  }, {
    "url": "assets/aistudio/kia_269d7c8e.png",
    "revision": "823b4597b325ea3950c41e6184d49cad"
  }, {
    "url": "manifest.webmanifest",
    "revision": "a563abe7b16bf7dcca50719fa20173df"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/downloads\//, /^\/api\//]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^\/audio\/.*/i, new workbox.CacheFirst({
    "cacheName": "static-audio-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 60,
      maxAgeSeconds: 7776000
    }), new workbox.CacheableResponsePlugin({
      statuses: [200]
    })]
  }), 'GET');

}));
