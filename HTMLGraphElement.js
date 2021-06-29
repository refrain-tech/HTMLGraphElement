'use strict';
class HTMLGraphElement extends HTMLCanvasElement {
  static #vertexShaderSource = 'precision mediump float;' +
                               '' +
                               'attribute vec4 aVertexColor;' +
                               'attribute vec2 aVertexPosition;' +
                               '' +
                               'varying lowp vec4 vColor;' +
                               '' +
                               'void main () {' +
                               '  gl_Position = vec4(aVertexPosition, 0.0, 1.0);' +
                               '  vColor = aVertexColor;' +
                               '}';
  static #fragmentShaderSource = 'precision mediump float;' +
                                 '' +
                                 'varying lowp vec4 vColor;' +
                                 '' +
                                 'void main () {' +
                                 '  gl_FragColor = vColor;' +
                                 '}';

  #autoClear = true;
  #autoRender = false;
  #elements = [];
  #gl = null;
  #maxX = 100;
  #maxY = 100;
  #minX = 0;
  #minY = 0;
  #originX = 0;
  #originY = 0;
  #rangeX = 100;
  #rangeY = 100;
  #programInfo = {};

  static get ORIGIN_LEFT () { return 0x0001; }
  static get ORIGIN_RIGHT () { return 0x0002; }
  static get ORIGIN_TOP () { return 0x0004; }
  static get ORIGIN_BOTTOM () { return 0x0008; }
  static get ORIGIN_CENTER () { return 0x0010; }
  static get observedAttributes () { return []; }

  get autoClear () { return this.#autoClear; }
  get autoRender () { return this.#autoRender; }

  set autoClear (autoClear) { this.#autoClear = autoClear; }
  set autoRender (autoRender) { this.#autoRender = autoRender; }

  constructor () {
    super();

    const gl = this.getContext('webgl');
    const program = this.#createProgram(gl, HTMLGraphElement.#vertexShaderSource, HTMLGraphElement.#fragmentShaderSource);

    if (program === null) throw new Error();

    gl.useProgram(program);

    const vertexColor = gl.getAttribLocation(program, 'aVertexColor');
    const vertexPosition = gl.getAttribLocation(program, 'aVertexPosition');

    this.#gl = gl;
    this.#programInfo = {program, attribute: {vertexColor, vertexPosition}};
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
  }

  connectedCallback () {
  }

  disconnectedCallback () {
  }

  addElement (element) {
    let {color = [255, 0, 0, 255], data} = element;

    color = color.map(value => value / 255);
    [name, ...data] = data;
    data = [...data.entries()].flat();

    this.#elements.push({color, data, name});

    if (this.#autoRender) this.render();

    return this.#elements.length - 1;
  }

  getElement (index) {
    return this.#elements[index];
  }

  getElementByName (name) {
    return this.#elements.find(element => element.name === name);
  }

  getIndexByName (name) {
    return this.#elements.findIndex(element => element.name === name);
  }

  removeElement (index) {
    const element = this.#elements[index];
    this.#elements.splice(index, 1);

    if (this.#autoRender) this.render();

    return element;
  }

  setOrigin (origin) {
    let originX, originY;

    switch (true) {
      case (origin & HTMLGraphElement.ORIGIN_LEFT) !== 0:
        originX = -1;
        break;
      case (origin & HTMLGraphElement.ORIGIN_RIGHT) !== 0:
        originX = 1;
        break;
      default:
        originX = 0;
        break;
    }

    switch (true) {
      case (origin & HTMLGraphElement.ORIGIN_BOTTOM) !== 0:
        originY = -1;
        break;
      case (origin & HTMLGraphElement.ORIGIN_TOP) !== 0:
        originY = 1;
        break;
      default:
        originY = 0;
        break;
    }

    this.#originX = originX;
    this.#originY = originY;

    if (this.#autoRender) this.render();
  }

  setRangeX (minX, maxX) {
    this.#maxX = maxX;
    this.#minX = minX;
    this.#rangeX = maxX - minX;

    if (this.#autoRender) this.render();
  }

  setRangeY (minY, maxY) {
    this.#maxY = maxY;
    this.#minY = minY;
    this.#rangeY = maxY - minY;

    if (this.#autoRender) this.render();
  }

  clear () {
    const gl = this.#gl;

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const {height, width} = gl.canvas;

    gl.viewport(0, 0, width, height);
  }

  render (indices = []) {
    if (this.#autoClear) this.clear();

    const gl = this.#gl;
    const elements = this.#elements;
    const {attribute: {vertexColor, vertexPosition}} = this.#programInfo;
    const maxX = this.#maxX;
    const maxY = this.#maxY;
    const minX = this.#minX;
    const minY = this.#minY;
    const originX = this.#originX;
    const originY = this.#originY;
    const rangeX = this.#rangeX;
    const rangeY = this.#rangeY;

    if (indices.length === 0) indices = [...elements.keys()];

    const mapping = (value, index) => index % 2 === 0 ?
      (value * (originX === 0 ? 1 : 2) - minX) / rangeX + originX :
      (value * (originY === 0 ? 1 : 2) - minY) / rangeY + originY;
    const filtering = (value, index, array) => Math.abs(array[index - index % 2]).limit(0, 1);

    elements.filter((e, index) => indices.includes(index)).map(({color, data}) => ({
      color,
      data: data.map(mapping).filter(filtering)
    })).forEach(({color, data}) => this.#draw(gl, data, color));

    this.#draw(gl, [originX, -1, originX, 1], [0, 0, 0, 1]);
    this.#draw(gl, [-1, originY, 1, originY], [0, 0, 0, 1]);
  }

  #draw (gl, array, color) {
    const {attribute: {vertexColor, vertexPosition}} = this.#programInfo;
    const buffer = this.#createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(array));

    gl.vertexAttrib4fv(vertexColor, color);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(vertexPosition);
    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, array.length / 2);
    gl.disableVertexAttribArray(vertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.flush();
  }

  #createBuffer (gl, type, data) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    gl.bindBuffer(type, null);

    return buffer;
  }

  #createProgram (gl, vertexShaderSource, fragmentShaderSource) {
    const program = gl.createProgram();
    const vertexShader = this.#createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.#createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

    return null;
  }

  #createShader (gl, type, shaderSource) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

    return null;
  }
}

customElements.define('x-graph', HTMLGraphElement, {extends: 'canvas'});
