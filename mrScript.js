"use strict";

var canvas;
var gl;

window.onload = function () {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
};

function show(el) {
  if (!el) return;
  el.style.display = "block";
}
function hide(el) {
  if (!el) return;
  el.style.display = "none";
}

if (ButtonL) {
  ButtonL.addEventListener("click", () => {
    hide(movie-list);
    hide(recommendations);
    show(login-form);
    const su = document.getElementById("username");
    if (su) su.focus();
  });
}

//  document.getElementById("ButtonL").onclick = function(){show(document.getElementById("login-form"))};
