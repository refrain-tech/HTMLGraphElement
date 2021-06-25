'use strict';

Array.prototype.transpose = function () {
  const array = [...this];
  array.forEach((column, columnIndex) => column.forEach((row, rowIndex) => (this[rowIndex] = this[rowIndex] || []).push(row)));
  return this;
};

const graph = document.querySelector('#graph');
const render = document.querySelector('#render');
const elements = [];

document.addEventListener('dragover', event => {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}, false);

document.addEventListener('drop', event => {
  const {dataTransfer: {files: [file]}} = event;

  if (file === undefined) return;

  event.stopPropagation();
  event.preventDefault();
  load(file);
}, false);

render.addEventListener('click', event => {
  graph.autoClear = false;
  graph.clear();

  [...document.querySelectorAll('#checks input[type = "checkbox"]')]
      .map(({checked}, index) => ({checked, index}))
      .filter(({checked}) => checked)
      .forEach(({index}) => graph.render([index]));
}, false);

function load (file) {
  const reader = new FileReader();
  reader.addEventListener('load', event => {
    const {result} = reader;

    const arr = result.replace(/\r/g, '')
        .split('\n')
        .filter(line => line !== '')
        .map(line => line.split(',').slice(2));

    const createFormItem = name => `<input name = '${name}' type = 'checkbox' /><label for = '${name}'>${name}</label>`;
    checks.innerHTML = arr[0].reduce((html, name) => html + createFormItem(name), '');

    arr.transpose();

    graph.setOrigin(HTMLGraphElement.ORIGIN_LEFT | HTMLGraphElement.ORIGIN_BOTTOM);
    graph.setRangeX(0, arr.length);
    graph.setRangeY(0, 5);

    const colors = [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 0, 255],
      [0, 255, 255, 255],
      [255, 0, 255, 255]
    ];

    for (const [index, data] of arr.entries()) graph.addElement({color: colors[index % colors.length], data});
  }, false);
  reader.readAsText(file, 'Shift-JIS');
}
