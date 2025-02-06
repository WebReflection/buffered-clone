import { encode, decode } from '../../src/index.js';

let canvas = document.createElement('canvas');
canvas.width = 320;
canvas.height = 200;

const context = canvas.getContext('2d');
context.fillStyle = '#159';
context.fillRect(0, 0, canvas.width, canvas.height);

const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

const clone = decode(encode(imageData));
canvas = document.createElement('canvas');
canvas.width = clone.width;
canvas.height = clone.height;
canvas.getContext('2d').putImageData(clone, 0, 0);

document.body.appendChild(canvas);
