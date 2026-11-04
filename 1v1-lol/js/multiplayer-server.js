/* Route Photon/Exit Games' signaling socket to the working community server.
 * Keep every other WebSocket connection unchanged.
 */
(function () {
  'use strict';

  var NativeWebSocket = window.WebSocket;
  var endpoint = 'wss://ws.onecloudcdn.site/ns';

  window.WebSocket = function WebSocket(url, protocols) {
    var value = typeof url === 'string' ? url : String(url);
    var redirect = false;
    try {
      var parsed = new URL(value);
      redirect = parsed.protocol === 'ws:' || parsed.protocol === 'wss:'
        ? parsed.hostname === 'exitgames.com' || parsed.hostname.endsWith('.exitgames.com')
        : false;
    } catch (_) {
      // Keep malformed/relative socket URLs untouched.
    }
    var target = redirect ? endpoint : url;

    return protocols === undefined
      ? new NativeWebSocket(target)
      : new NativeWebSocket(target, protocols);
  };

  // Preserve the native WebSocket API expected by Unity/Photon.
  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = NativeWebSocket.CONNECTING;
  window.WebSocket.OPEN = NativeWebSocket.OPEN;
  window.WebSocket.CLOSING = NativeWebSocket.CLOSING;
  window.WebSocket.CLOSED = NativeWebSocket.CLOSED;
})();
