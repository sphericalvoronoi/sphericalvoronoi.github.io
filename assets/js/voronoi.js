// voronoi_polar.js
// Interactive soft Voronoi viewer on a circle (polar-like visualization)
// Exposes: window.initVoronoiPolarViewer(options?)

(function (global) {
    "use strict";

    /**
     * Initialize the Voronoi polar viewer.
     *
     * @param {Object} options
     * @param {string} [options.canvasId="voronoiCanvas"]
     * @param {string} [options.numSitesId="numSites"]
     * @param {string} [options.temperatureId="temperature"]
     * @param {string} [options.jitterId="jitter"]
     * @param {string} [options.numSitesLabelId="numSitesLabel"]
     * @param {string} [options.temperatureLabelId="temperatureLabel"]
     * @param {string} [options.jitterLabelId="jitterLabel"]
     * @param {string} [options.randomizeButtonId="randomizeAmplitudes"]
     */
    function initVoronoiPolarViewer(options) {
        options = options || {};

        const canvasId = options.canvasId || "voronoiCanvas";
        const numSitesId = options.numSitesId || "numSites";
        const temperatureId = options.temperatureId || "temperature";
        const jitterId = options.jitterId || "jitter";
        const numSitesLabelId = options.numSitesLabelId || "numSitesLabel";
        const temperatureLabelId = options.temperatureLabelId || "temperatureLabel";
        const jitterLabelId = options.jitterLabelId || "jitterLabel";
        const randomizeButtonId =
            options.randomizeButtonId || "randomizeAmplitudes";

        const canvas = document.getElementById(canvasId);
        const numSitesSlider = document.getElementById(numSitesId);
        const temperatureSlider = document.getElementById(temperatureId);
        const jitterSlider = document.getElementById(jitterId);
        const numSitesLabel = document.getElementById(numSitesLabelId);
        const temperatureLabel = document.getElementById(temperatureLabelId);
        const jitterLabel = document.getElementById(jitterLabelId);
        const randomizeBtn = document.getElementById(randomizeButtonId);

        if (!canvas) {
            console.error("[VoronoiPolar] Canvas not found:", canvasId);
            return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("[VoronoiPolar] 2D context not available");
            return;
        }

        // Basic sanity checks for controls (not fatal if some are missing)
        if (!numSitesSlider) console.warn("[VoronoiPolar] numSites slider missing");
        if (!temperatureSlider)
            console.warn("[VoronoiPolar] temperature slider missing");
        if (!jitterSlider) console.warn("[VoronoiPolar] jitter slider missing");
        if (!randomizeBtn)
            console.warn("[VoronoiPolar] randomize button missing");

        // --------------------------------------------------
        // Matplotlib tab20 colormap replicated (RGB 0–255)
        // --------------------------------------------------
        const TAB20 = [
            [31, 119, 180], [174, 199, 232],
            [255, 127, 14], [255, 187, 120],
            [44, 160, 44], [152, 223, 138],
            [214, 39, 40], [255, 152, 150],
            [148, 103, 189], [197, 176, 213],
            [140, 86, 75], [196, 156, 148],
            [227, 119, 194], [247, 182, 210],
            [127, 127, 127], [199, 199, 199],
            [188, 189, 34], [219, 219, 141],
            [23, 190, 207], [158, 218, 229],
        ];

        function rgbArrayToCss(rgb) {
            return "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")";
        }

        function tab20Color(i) {
            const c = TAB20[i % TAB20.length];
            return c;
        }

        function randUniform(min, max) {
            return min + Math.random() * (max - min);
        }

        // temperature slider [0,500] -> beta in [betaMin, betaMax]
        function temperatureToBeta(temp) {
            const t = temp / 500.0;  // <-- 0..500
            const betaMin = 0.05;
            const betaMax = 25.0;    // max beta ~25 when temp=500
            return betaMin + t * (betaMax - betaMin);
        }

        // --------------------------------------------------
        // Internal state
        // --------------------------------------------------
        let sites = []; // { angle, dir: {x,y}, colorRGB: [r,g,b], lambda }

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = Math.min(canvas.width, canvas.height) * 0.42;
        const bandThickness = outerRadius * 0.12;
        const innerRadius = outerRadius - bandThickness;

        // increased samples to reduce visible bands
        const numSamples = 4096;      // points along the ring
        const numCurveSamples = 4096; // samples for f(theta) curve

        // --------------------------------------------------
        // Sites initialization
        // --------------------------------------------------
        function initSites() {
            if (!numSitesSlider || !jitterSlider) return;

            const K = parseInt(numSitesSlider.value, 10);
            const jitterDeg = parseFloat(jitterSlider.value);
            const jitterRadMax = (jitterDeg * Math.PI) / 180.0;

            sites = [];

            for (let i = 0; i < K; i++) {
                const baseAngle = (2 * Math.PI * i) / K;
                const jitter = randUniform(-jitterRadMax, jitterRadMax);
                const angle = baseAngle + jitter;

                const dir = {
                    x: Math.cos(angle),
                    y: Math.sin(angle),
                };

                // Use tab20 color palette (Matplotlib-like)
                const colorRGB = tab20Color(i);

                // Amplitude for f(theta)
                const lambda = randUniform(0.3, 1.0);

                sites.push({ angle, dir, colorRGB, lambda });
            }
        }

        function randomizeAmplitudes() {
            for (const s of sites) {
                s.lambda = randUniform(0.3, 1.2);
            }
        }

        // --------------------------------------------------
        // Softmax over sites at a given angle
        // --------------------------------------------------
        function computeWeightsForAngle(theta, beta) {
            const dx = Math.cos(theta);
            const dy = Math.sin(theta);

            const logits = [];
            let maxLogit = -Infinity;

            // logits = -beta * ||d - site||
            for (const s of sites) {
                const ddx = dx - (s.dir.x || 0);
                const ddy = dy - (s.dir.y || 0);
                const dist = Math.sqrt(ddx * ddx + ddy * ddy) + 1e-8;
                const logit = -beta * dist;
                logits.push(logit);
                if (logit > maxLogit) maxLogit = logit;
            }

            let sumExp = 0.0;
            const weights = [];
            for (let i = 0; i < logits.length; i++) {
                const e = Math.exp(logits[i] - maxLogit);
                weights.push(e);
                sumExp += e;
            }

            if (sumExp < 1e-10) {
                // fallback to uniform
                const K = sites.length || 1;
                return new Array(K).fill(1.0 / K);
            }

            for (let i = 0; i < weights.length; i++) {
                weights[i] /= sumExp;
            }
            return weights;
        }

        // f(theta) = sum_i w_i(theta) * lambda_i
        function computeFunctionValues(beta) {
            const values = [];
            let maxAbs = 0.0;

            for (let i = 0; i < numCurveSamples; i++) {
                const theta = (2 * Math.PI * i) / numCurveSamples;
                const w = computeWeightsForAngle(theta, beta);
                let v = 0.0;
                for (let k = 0; k < sites.length; k++) {
                    v += w[k] * sites[k].lambda;
                }
                values.push(v);
                const av = Math.abs(v);
                if (av > maxAbs) maxAbs = av;
            }

            // scale to fit inside the disk
            const scale = maxAbs > 1e-6 ? (outerRadius * 0.9) / maxAbs : 1.0;

            return { values, scale, maxAbs };
        }

        // --------------------------------------------------
        // Drawing functions
        // --------------------------------------------------
        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // panel background
            ctx.fillStyle = "#f8f9fb";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // light polar grid
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
            ctx.lineWidth = 1;

            const rings = 4;
            for (let i = 1; i <= rings; i++) {
                const r = (outerRadius * i) / rings;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, 2 * Math.PI);
                ctx.stroke();
            }

            const spokes = 8;
            for (let i = 0; i < spokes; i++) {
                const angle = (2 * Math.PI * i) / spokes;
                const x = outerRadius * Math.cos(angle);
                const y = -outerRadius * Math.sin(angle); // y up
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(x, y);
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawColorRing(beta) {
            ctx.save();
            ctx.translate(centerX, centerY);

            for (let i = 0; i < numSamples; i++) {
                const theta = (2 * Math.PI * i) / numSamples;
                const weights = computeWeightsForAngle(theta, beta);

                let r = 0, g = 0, b = 0;
                for (let k = 0; k < sites.length; k++) {
                    const w = weights[k];
                    const c = sites[k].colorRGB;
                    r += w * c[0];
                    g += w * c[1];
                    b += w * c[2];
                }
                const color =
                    "rgb(" + Math.round(r) + ", " + Math.round(g) + ", " + Math.round(b) + ")";

                ctx.strokeStyle = color;
                ctx.lineWidth = Math.max(1, bandThickness * 0.8);

                const rMid = innerRadius + bandThickness * 0.5;
                const x1 = rMid * Math.cos(theta);
                const y1 = -rMid * Math.sin(theta);
                const x2 = rMid * Math.cos(theta + (2 * Math.PI) / numSamples);
                const y2 = -rMid * Math.sin(theta + (2 * Math.PI) / numSamples);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawSitesAndArrows(maxAbs) {
            ctx.save();
            ctx.translate(centerX, centerY);

            for (const s of sites) {
                const lambda = s.lambda;
                const normalized = maxAbs > 1e-6 ? lambda / maxAbs : 0.5;
                const rayLength = normalized * outerRadius * 0.9;

                const x = rayLength * Math.cos(s.angle);
                const y = -rayLength * Math.sin(s.angle);

                ctx.strokeStyle = rgbArrayToCss(s.colorRGB);
                ctx.fillStyle = rgbArrayToCss(s.colorRGB);
                ctx.lineWidth = 2;

                // main line
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(x, y);
                ctx.stroke();

                // small arrow head
                const headLength = 10;
                const angle = s.angle;
                const xEnd = x;
                const yEnd = y;
                const leftAngle = angle + Math.PI * 0.87;
                const rightAngle = angle - Math.PI * 0.87;

                ctx.beginPath();
                ctx.moveTo(xEnd, yEnd);
                ctx.lineTo(
                    xEnd + headLength * Math.cos(leftAngle),
                    yEnd - headLength * Math.sin(leftAngle)
                );
                ctx.lineTo(
                    xEnd + headLength * Math.cos(rightAngle),
                    yEnd - headLength * Math.sin(rightAngle)
                );
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }

        function drawFunctionCurve(beta) {
            const result = computeFunctionValues(beta);
            const values = result.values;
            const scale = result.scale;
            const maxAbs = result.maxAbs;

            ctx.save();
            ctx.translate(centerX, centerY);

            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.beginPath();

            for (let i = 0; i < numCurveSamples; i++) {
                const theta = (2 * Math.PI * i) / numCurveSamples;
                const radius = values[i] * scale;

                const x = radius * Math.cos(theta);
                const y = -radius * Math.sin(theta);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // arrows on top
            drawSitesAndArrows(maxAbs);
        }

        // --------------------------------------------------
        // Render loop
        // --------------------------------------------------
        function render() {
            if (!sites.length) return;

            const temp = temperatureSlider
                ? parseFloat(temperatureSlider.value)
                : 250.0;
            const beta = temperatureToBeta(temp);

            if (numSitesLabel && numSitesSlider) {
                numSitesLabel.textContent = String(numSitesSlider.value);
            }
            if (temperatureLabel && temperatureSlider) {
                temperatureLabel.textContent = String(temperatureSlider.value);
            }
            if (jitterLabel && jitterSlider) {
                jitterLabel.textContent = jitterSlider.value + "°";
            }

            clearCanvas();
            drawColorRing(beta);
            drawFunctionCurve(beta);
        }

        // --------------------------------------------------
        // Event listeners
        // --------------------------------------------------
        if (numSitesSlider) {
            numSitesSlider.addEventListener("input", function () {
                initSites();
                render();
            });
        }

        if (temperatureSlider) {
            temperatureSlider.addEventListener("input", function () {
                render();
            });
        }

        if (jitterSlider) {
            jitterSlider.addEventListener("input", function () {
                initSites();
                render();
            });
        }

        if (randomizeBtn) {
            randomizeBtn.addEventListener("click", function () {
                randomizeAmplitudes();
                render();
            });
        }

        // --------------------------------------------------
        // Initial setup
        // --------------------------------------------------
        initSites();
        render();
    }

    // Expose to global scope
    global.initVoronoiPolarViewer = initVoronoiPolarViewer;
})(window);
