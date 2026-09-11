/**
 * Utility to inject coordinate tracking, native edge-to-edge fullscreen fit,
 * and camera controls into any uploaded 3D HTML file.
 */
export function injectIframeBridgeScript(html: string): string {
  const nativeCss = `
<style id="native-3d-fullscreen-fit">
  html, body {
    height: 100% !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: transparent !important;
  }
  .plotly-graph-div, div[id^='2bedc'], div.js-plotly-plot, .plot-container, .gl-container {
    height: 100% !important;
    width: 100% !important;
    min-height: 100% !important;
    min-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: transparent !important;
  }
  .svg-container, .main-svg {
    height: 100% !important;
    width: 100% !important;
    max-height: 100% !important;
    max-width: 100% !important;
    background: transparent !important;
  }
  /* Theme-adaptive text, axes, modebar, and logo rules */
  body.light-theme {
    color: #0f172a !important;
    background: transparent !important;
  }
  body.light-theme text,
  body.light-theme .xtick text,
  body.light-theme .ytick text,
  body.light-theme .ztick text,
  body.light-theme .gtitle,
  body.light-theme .annotation-text,
  body.light-theme .hovertext text {
    fill: #0f172a !important;
    color: #0f172a !important;
  }
  body.light-theme .modebar-group {
    background-color: rgba(255, 255, 255, 0.88) !important;
    border: 1px solid rgba(0, 0, 0, 0.12) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
  }
  body.light-theme .modebar-btn svg path,
  body.light-theme .modebar-btn svg {
    fill: #475569 !important;
  }
  body.light-theme .modebar-btn:hover svg path,
  body.light-theme .modebar-btn:hover svg {
    fill: #0f172a !important;
  }
  body.light-theme .modebar-btn.active svg path,
  body.light-theme .modebar-btn.active svg {
    fill: #2563eb !important;
  }
  body.light-theme .modebar-btn--logo svg path,
  body.light-theme .modebar-btn--logo svg path[fill="#FFF"],
  body.light-theme .modebar-btn--logo svg path[fill="#fff"] {
    fill: #0f172a !important;
  }
  body.light-theme .modebar-btn--logo svg rect {
    fill: #e2e8f0 !important;
  }

  body.dark-theme {
    color: #f8fafc !important;
    background: transparent !important;
  }
  body.dark-theme text,
  body.dark-theme .xtick text,
  body.dark-theme .ytick text,
  body.dark-theme .ztick text,
  body.dark-theme .gtitle,
  body.dark-theme .annotation-text,
  body.dark-theme .hovertext text {
    fill: #f8fafc !important;
    color: #f8fafc !important;
  }
  body.dark-theme .modebar-group {
    background-color: rgba(0, 0, 0, 0.75) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
  }
  body.dark-theme .modebar-btn svg path,
  body.dark-theme .modebar-btn svg {
    fill: #94a3b8 !important;
  }
  body.dark-theme .modebar-btn:hover svg path,
  body.dark-theme .modebar-btn:hover svg {
    fill: #ffffff !important;
  }
  body.dark-theme .modebar-btn.active svg path,
  body.dark-theme .modebar-btn.active svg {
    fill: #60a5fa !important;
  }
  body.dark-theme .modebar-btn--logo svg path,
  body.dark-theme .modebar-btn--logo svg path[fill="#FFF"],
  body.dark-theme .modebar-btn--logo svg path[fill="#fff"] {
    fill: #ffffff !important;
  }
  body.dark-theme .modebar-btn--logo svg rect {
    fill: #000000 !important;
  }
</style>
`;

  const bridgeScript = `
<script id="viewer-bridge-script">
  (function() {
    window.addEventListener("mousemove", function(e) {
      window.parent.postMessage({
        type: "3d_coord_move",
        clientX: e.clientX,
        clientY: e.clientY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      }, "*");
    });

    window._autoRotateActive = false;
    window._autoRotateAngle = 0;
    window._autoRotateReq = null;
    window._contoursShown = false;

    function getPlotDiv() {
      return document.querySelector(".plotly-graph-div") || 
             document.querySelector("div[id^='2bedc']") || 
             document.querySelector("div.js-plotly-plot") ||
             document.querySelector(".plot-container");
    }

    // Enforce full native viewport fill for uploaded Plotly files
    function enforceNativeFit() {
      var plotDiv = getPlotDiv();
      if (plotDiv) {
        plotDiv.style.width = "100%";
        plotDiv.style.height = "100%";
        if (window.Plotly && typeof window.Plotly.relayout === "function") {
          window.Plotly.relayout(plotDiv, {
            autosize: true,
            width: window.innerWidth,
            height: window.innerHeight,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            "margin.l": 0,
            "margin.r": 0,
            "margin.b": 0,
            "margin.t": 0,
            "margin.pad": 0
          }).catch(function(){});
          if (typeof window.Plotly.Plots !== "undefined" && typeof window.Plotly.Plots.resize === "function") {
            window.Plotly.Plots.resize(plotDiv);
          }
        }
      }
    }

    window.addEventListener("resize", enforceNativeFit);

    // Call at staged intervals to ensure plot renders at 100% viewport dimensions
    [50, 150, 350, 750, 1500, 3000].forEach(function(t) {
      setTimeout(enforceNativeFit, t);
    });

    function rotateStep() {
      if (!window._autoRotateActive) return;
      var plotDiv = getPlotDiv();
      if (plotDiv && window.Plotly) {
        window._autoRotateAngle += 0.015;
        var radius = 1.7;
        var eyeX = radius * Math.cos(window._autoRotateAngle);
        var eyeY = radius * Math.sin(window._autoRotateAngle);
        Plotly.relayout(plotDiv, {
          "scene.camera.eye": { x: eyeX, y: eyeY, z: 0.85 }
        }).catch(function(){});
      }
      window._autoRotateReq = requestAnimationFrame(rotateStep);
    }

    window.addEventListener("message", function(e) {
      var plotDiv = getPlotDiv();
      if (!plotDiv || !window.Plotly) return;

      var action = e.data && e.data.action;
      if (action === "reset_camera") {
        window._autoRotateActive = false;
        if (window._autoRotateReq) cancelAnimationFrame(window._autoRotateReq);
        Plotly.relayout(plotDiv, {
          "scene.camera": {
            eye: { x: 1.2, y: -1.2, z: 0.8 },
            center: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 0, z: 1 }
          }
        }).catch(function(){});
      } else if (action === "zoom_in") {
        var curEye = (plotDiv.layout && plotDiv.layout.scene && plotDiv.layout.scene.camera && plotDiv.layout.scene.camera.eye) || { x: 1.2, y: -1.2, z: 0.8 };
        Plotly.relayout(plotDiv, {
          "scene.camera.eye": {
            x: (curEye.x || 1.2) * 0.82,
            y: (curEye.y || -1.2) * 0.82,
            z: (curEye.z || 0.8) * 0.82
          }
        }).catch(function(){});
      } else if (action === "zoom_out") {
        var curEye = (plotDiv.layout && plotDiv.layout.scene && plotDiv.layout.scene.camera && plotDiv.layout.scene.camera.eye) || { x: 1.2, y: -1.2, z: 0.8 };
        Plotly.relayout(plotDiv, {
          "scene.camera.eye": {
            x: (curEye.x || 1.2) * 1.22,
            y: (curEye.y || -1.2) * 1.22,
            z: (curEye.z || 0.8) * 1.22
          }
        }).catch(function(){});
      } else if (action === "set_autorotate" || action === "toggle_autorotate") {
        var shouldEnable = action === "set_autorotate" ? !!e.data.enabled : !window._autoRotateActive;
        window._autoRotateActive = shouldEnable;
        if (window._autoRotateReq) cancelAnimationFrame(window._autoRotateReq);
        if (shouldEnable) {
          window._autoRotateReq = requestAnimationFrame(rotateStep);
        }
      } else if (action === "set_wireframe" || action === "toggle_contours") {
        var showWire = action === "set_wireframe" ? !!e.data.enabled : !window._contoursShown;
        window._contoursShown = showWire;
        var isDark = e.data.darkMode !== undefined ? !!e.data.darkMode : !document.body.classList.contains("light-theme");
        Plotly.restyle(plotDiv, {
          "contours.z.show": showWire,
          "contours.z.highlight": showWire,
          "contours.z.project.z": showWire,
          "contours.z.highlightcolor": isDark ? "#ffffff" : "#0f172a",
          "contours.z.highlightwidth": 2
        }).catch(function(){});
      } else if (action === "set_theme") {
        var isDark = !!e.data.darkMode;
        document.body.classList.toggle("dark-theme", isDark);
        document.body.classList.toggle("light-theme", !isDark);

        var textColor = isDark ? "#f8fafc" : "#0f172a";
        var axisLineColor = isDark ? "#475569" : "#94a3b8";
        var gridColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
        var hoverBg = isDark ? "#1e293b" : "#ffffff";
        var hoverBorder = isDark ? "#475569" : "#cbd5e1";

        Plotly.relayout(plotDiv, {
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          "font.color": textColor,
          "scene.bgcolor": "rgba(0,0,0,0)",
          "scene.xaxis.color": axisLineColor,
          "scene.yaxis.color": axisLineColor,
          "scene.zaxis.color": axisLineColor,
          "scene.xaxis.gridcolor": gridColor,
          "scene.yaxis.gridcolor": gridColor,
          "scene.zaxis.gridcolor": gridColor,
          "scene.xaxis.tickfont.color": textColor,
          "scene.yaxis.tickfont.color": textColor,
          "scene.zaxis.tickfont.color": textColor,
          "scene.xaxis.title.font.color": textColor,
          "scene.yaxis.title.font.color": textColor,
          "scene.zaxis.title.font.color": textColor,
          "hoverlabel.bgcolor": hoverBg,
          "hoverlabel.font.color": textColor,
          "hoverlabel.bordercolor": hoverBorder
        }).catch(function(){});

        if (window._contoursShown) {
          Plotly.restyle(plotDiv, {
            "contours.z.highlightcolor": isDark ? "#ffffff" : "#0f172a"
          }).catch(function(){});
        }

        // Direct updates for any SVG logo, icons or text elements
        var logoPaths = document.querySelectorAll(".modebar-btn--logo svg path, .plotlyjsicon svg path");
        logoPaths.forEach(function(p) {
          p.style.fill = isDark ? "#ffffff" : "#0f172a";
        });
        var logoRects = document.querySelectorAll(".modebar-btn--logo svg rect, .plotlyjsicon svg rect");
        logoRects.forEach(function(r) {
          r.style.fill = isDark ? "#000000" : "#e2e8f0";
        });
        var svgTexts = document.querySelectorAll("svg text");
        svgTexts.forEach(function(t) {
          t.style.fill = isDark ? "#f8fafc" : "#0f172a";
        });
      } else if (action === "resize") {
        enforceNativeFit();
      }
    });

    window.addEventListener("load", function() {
      setTimeout(function() {
        enforceNativeFit();
        var plotDiv = getPlotDiv();
        if (plotDiv && plotDiv.on) {
          plotDiv.on("plotly_hover", function(data) {
            if (data && data.points && data.points[0]) {
              var pt = data.points[0];
              window.parent.postMessage({
                type: "3d_surface_point",
                x: pt.x,
                y: pt.y,
                z: pt.z
              }, "*");
            }
          });
        }
      }, 1000);
    });
  })();
</script>
`;

  let result = html;

  // Inject CSS into <head> or at start
  if (result.includes('</head>')) {
    result = result.replace('</head>', `${nativeCss}\n</head>`);
  } else if (result.includes('<body')) {
    result = result.replace('<body', `${nativeCss}\n<body`);
  } else {
    result = nativeCss + result;
  }

  // Inject bridge script before </body> or at end
  if (result.includes('</body>')) {
    result = result.replace('</body>', `${bridgeScript}\n</body>`);
  } else {
    result = result + bridgeScript;
  }

  return result;
}
