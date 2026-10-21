/* 图标库：24x24 线性图标。用法 ic('wifi', 24, 'cls', 1.7) */
(function () {
  var P = {
    layers: "<path d='M12 3 2.5 7.5 12 12l9.5-4.5L12 3Z'/><path d='M2.5 12 12 16.5 21.5 12'/><path d='M2.5 16.5 12 21l9.5-4.5'/>",
    wifi: "<path d='M2 8.6a15 15 0 0 1 20 0'/><path d='M5.4 12.2a10 10 0 0 1 13.2 0'/><path d='M9 15.7a5 5 0 0 1 6 0'/><circle cx='12' cy='19' r='1.1'/>",
    chip: "<rect x='7' y='7' width='10' height='10' rx='2'/><path d='M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3'/>",
    nodes: "<circle cx='12' cy='5' r='2.2'/><circle cx='5' cy='18' r='2.2'/><circle cx='19' cy='18' r='2.2'/><path d='M12 7.4v4M10.2 12.4 6.6 16M13.8 12.4 17.4 16'/>",
    db: "<ellipse cx='12' cy='5.5' rx='8' ry='3'/><path d='M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13'/><path d='M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'/>",
    pin: "<path d='M12 21.5s7-6.4 7-11.2A7 7 0 1 0 5 10.3c0 4.8 7 11.2 7 11.2Z'/><circle cx='12' cy='10' r='2.6'/>",
    shield: "<path d='M12 3 20 6v6c0 5-3.6 8.4-8 9.2C7.6 20.4 4 17 4 12V6Z'/><path d='m8.6 11.8 2.4 2.4 4.4-4.8'/>",
    link: "<path d='M9.2 14.8 14.8 9.2'/><path d='M11 6.2 12.6 4.6a3.9 3.9 0 0 1 5.5 5.5L16.5 11.7'/><path d='M13 17.8l-1.6 1.6a3.9 3.9 0 0 1-5.5-5.5l1.6-1.6'/>",
    dish: "<path d='M4.5 15.5A9 9 0 0 1 15.5 4.5'/><path d='M2.5 19.5A13 13 0 0 1 19.5 2.5'/><circle cx='16' cy='16' r='2.2'/><path d='m14.6 17.4-3.2 3.2'/>",
    server: "<rect x='3' y='4' width='18' height='6.4' rx='1.6'/><rect x='3' y='13.6' width='18' height='6.4' rx='1.6'/><path d='M6.8 7.2h.02M6.8 16.8h.02'/>",
    mic: "<rect x='9' y='2.5' width='6' height='11' rx='3'/><path d='M5 11a7 7 0 0 0 14 0'/><path d='M12 18v3.5M9 21.5h6'/>",
    refresh: "<path d='M20 12a8 8 0 1 1-2.6-5.9'/><path d='M20 4v4.5h-4.5'/>",
    info: "<circle cx='12' cy='12' r='9'/><path d='M12 11v5.5'/><circle cx='12' cy='8' r='.9' fill='currentColor' stroke='none'/>",
    check: "<path d='M4.5 12.5 9.5 17.5 19.5 6.5'/>",
    crosshair: "<circle cx='12' cy='12' r='7'/><path d='M12 2v3.2M12 18.8V22M2 12h3.2M18.8 12H22'/><circle cx='12' cy='12' r='1.5' fill='currentColor' stroke='none'/>",
    target: "<circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='4.2'/><circle cx='12' cy='12' r='1.2' fill='currentColor' stroke='none'/>",
    flag: "<path d='M5.5 21.5V3.5'/><path d='M5.5 4.5h11l-1.7 3.6 1.7 3.6h-11'/>",
    bell: "<path d='M6 9.2a6 6 0 0 1 12 0c0 3.9 1.4 5.4 1.4 5.4H4.6S6 13.1 6 9.2Z'/><path d='M10 18.4a2 2 0 0 0 4 0'/>",
    gear: "<circle cx='12' cy='12' r='3.2'/><path d='M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6'/>"
  };
  window.ICONS = P;
  window.ic = function (name, size, cls, sw) {
    return '<svg class="' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.7) + '" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || '') + '</svg>';
  };
})();
