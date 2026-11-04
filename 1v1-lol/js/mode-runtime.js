/* Restore the bundled mode categories when the retired server clock is unavailable.
 * Only for 3.800 / Unity 2019.4.24f1. Calls the game's own category initialization;
 * room creation, party requirements, login and matchmaking stay with the game.
 */
(function () {
  'use strict';
  if (window.OneVOneModes) return;

  var lastRotation = 0, lastData = 0, failedRotation = 0;
  var state = { restored: false, error: '', categories: null };

  function restore() {
    var m = window.unityInstance && window.unityInstance.Module;
    if (!m || !m.HEAPU32 || typeof m.dynCall_vii !== 'function' ||
        typeof m.stackSave !== 'function' || typeof m.stackRestore !== 'function') return;
    var version = typeof m.unityVersion === 'string' ? m.unityVersion : m.unityVersion && m.unityVersion.string;
    if (m.productVersion !== '3.800' || version !== '2019.4.24f1') return;
    function u32(p) { return m.HEAPU32[p >>> 2]; }
    function valid(p, size) { return Number.isInteger(p) && p > 1024 && !(p & 3) && p + size < m.HEAPU8.length; }
    if (m.HEAPU8.length < 6239032 || u32(4724056) !== 8511 || u32(4724060) !== 3222784 ||
        u32(3222784 + (0xa46 - 1) * 4) !== 15459) return;
    function statics(cell) {
      var klass = u32(cell);
      return valid(klass, 100) ? u32(klass + 92) : 0;
    }
    var config = statics(6238364), rotations = statics(6239024);
    if (!valid(config, 8) || !valid(rotations, 4) || !m.HEAPU8[config + 4]) return;
    var data = u32(config), rotation = u32(rotations);
    if (!valid(data, 88) || !valid(rotation, 32) || !u32(rotation + 8) ||
        (rotation === lastRotation && data === lastData) || rotation === failedRotation) return;
    var menu = u32(rotation + 16);
    if (!valid(menu, 84) || !u32(menu + 8)) return;
    // The normal initializer waits for ServerClock.Ready. With no clock response,
    // the data is loaded but these three native category setters never run.
    var stack = m.stackSave();
    try {
      var counts = {};
      [[64, 48, 'competitive'], [68, 52, 'casual'], [72, 60, 'custom']].forEach(function (entry) {
        var groups = u32(data + entry[0]), buttons = u32(menu + entry[1]);
        if (!valid(groups, 16) || u32(groups + 12) !== 1 || !valid(buttons, 16)) throw new Error('Unexpected mode category layout');
        var items = u32(groups + 8);
        if (!valid(items, 20)) throw new Error('Missing mode group');
        var group = u32(items + 16);
        if (!valid(group, 16) || u32(group + 12) > u32(buttons + 12)) throw new Error('Mode category exceeds available buttons');
        counts[entry[2]] = u32(group + 12);
      });
      m.HEAP32[(rotation + 24) >>> 2] = 0;
      m.dynCall_vii(15459, rotation, 0);
      lastRotation = rotation;
      lastData = data;
      state.restored = true;
      state.categories = counts;
      state.error = '';
    } catch (error) {
      failedRotation = rotation;
      state.error = String(error);
      console.warn('Mode categories could not be restored:', error);
    } finally {
      m.stackRestore(stack);
    }
  }

  window.OneVOneModes = { status: function () { return Object.assign({}, state, { categories: state.categories && Object.assign({}, state.categories) }); } };
  window.setInterval(restore, 500);
})();
