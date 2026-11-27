// © 2026 HB9688 – All rights reserved. See LICENSE.
// Farben aus farbverlauf.txt (Quelle). Index 0 = A, 25 = Z.
(function (AP) {
  AP.PALETTE = [
    '#FFF4E6', '#FFEBD4', '#FFE2C2', '#FFD9B0', '#FFD09E', '#FFC78C', '#FFBE7A',
    '#FFB568', '#FFAC56', '#FFA344', '#FF9A32', '#FF911F', '#FF8800', '#F57F00',
    '#EB7600', '#E16D00', '#D76400', '#CD5B00', '#C35200', '#B94900', '#AF4000',
    '#A53700', '#9B2E00', '#912500', '#871C00', '#6B1200'
  ];
  AP.LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  AP.colorOf = function (layer) { return AP.PALETTE[AP.LETTERS.indexOf(layer)]; };
})(globalThis.AP = globalThis.AP || {});
