// "use strict";

// var canvas;
// var gl;

// window.onload = function () {
//     canvas = document.getElementById("gl-canvas");
//     gl = canvas.getContext('webgl2');
//     if (!gl) alert("WebGL 2.0 isn't available");
//     gl.viewport(0, 0, canvas.width, canvas.height);
//     gl.clearColor(0.0, 0.0, 0.0, 1.0);
//     gl.clear(gl.COLOR_BUFFER_BIT);
// };

// function show(el) {
//   if (!el) return;
//   el.classList.remove("hidden");
// }
// function hide(el) {
//   if (!el) return;
//   el.classList.add("hidden");
// }

//  /*if (ButtonL) {
//   ButtonL.addEventListener("click", () => {
//     hide(movie-list);
//     hide(recommendations);
//     show(login-form);
//     const su = document.getElementById("username");
//     if (su) su.focus();
//   });
// }*/

//  document.getElementById("ButtonL").onclick = function(){show(document.getElementById("login-form"))};


document.addEventListener('DOMContentLoaded', function () {
  const loginToggle = document.getElementById('login-toggle');
  const loginForm = document.getElementById('login-form');
  const submitLogin = document.getElementById('submit-login');

  // Toggle login panel
  loginToggle.addEventListener('click', function () {
    const isHidden = loginForm.classList.toggle('hidden');
    loginForm.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
  });

  // Example submit handler
  submitLogin.addEventListener('click', function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    // Replace with real auth logic
    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }
    // Simulate successful login
    alert('Logged in as ' + username);
    loginForm.classList.add('hidden');
    loginForm.setAttribute('aria-hidden', 'true');
  });
});
