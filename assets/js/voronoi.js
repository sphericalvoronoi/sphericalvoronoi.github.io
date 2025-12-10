(function (global) {
    "use strict";

    function initVoronoiPolarViewer(options) {
        options = options || {};

        const MAX_SITES = options.maxSites || 64;
        const DEFAULT_SITES = options.defaultSites || 8;
        const MIN_SITES = options.minSites || 2;

        // Ora la temperatura slider va 0..MAX_TEMPERATURE (default 5000)
        const MAX_TEMPERATURE = options.maxTemperature || 2500;
        const DEFAULT_TEMPERATURE = options.defaultTemperature || 250;

        // Intervallo effettivo di beta usato nel modello
        const BETA_MIN = options.minBeta || 0.01;
        const BETA_MAX = options.maxBeta || 2500.0;

        const canvasId = options.canvasId || "voronoiCanvas";
        const numSitesInputId = options.numSitesInputId || "numSitesInput";
        const temperatureId = options.temperatureId || "temperature";
        const temperatureLabelId = options.temperatureLabelId || "temperatureLabel";
        const generateButtonId = options.generateButtonId || "generateVoronoi";

        const canvas = document.getElementById(canvasId);
        const numSitesInput = document.getElementById(numSitesInputId);
        const temperatureSlider = document.getElementById(temperatureId);
        const temperatureLabel = document.getElementById(temperatureLabelId);
        const generateBtn = document.getElementById(generateButtonId);

        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

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
            return TAB20[i % TAB20.length];
        }

        function randUniform(min, max) {
            return min + Math.random() * (max - min);
        }

        // --- NUOVO: temperatura (slider) -> beta in scala logaritmica ---
        function temperatureToBeta(temp) {
            const clamped = Math.max(0, Math.min(MAX_TEMPERATURE, temp || 0));
            const t = clamped / MAX_TEMPERATURE; // [0,1]
            const logMin = Math.log(BETA_MIN);
            const logMax = Math.log(BETA_MAX);
            return Math.exp(logMin + t * (logMax - logMin));
        }

        let sites = [];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = Math.min(canvas.width, canvas.height) * 0.42;
        const bandThickness = outerRadius * 0.12;
        const innerRadius = outerRadius - bandThickness;
        const numSamples = 4096;
        const numCurveSamples = 4096;

        function initSites() {
            const K = Math.max(
                MIN_SITES,
                Math.min(MAX_SITES, parseInt(numSitesInput.value, 10) || DEFAULT_SITES)
            );
            sites = [];
            for (let i = 0; i < K; i++) {
                const angle = randUniform(0, 2 * Math.PI);
                const dir = { x: Math.cos(angle), y: Math.sin(angle) };
                const colorRGB = tab20Color(i);
                const lambda = randUniform(0.3, 1.2);
                sites.push({ angle, dir, colorRGB, lambda });
            }
        }

        function computeWeightsForAngle(theta, beta) {
            const dx = Math.cos(theta);
            const dy = Math.sin(theta);
            const logits = [];
            let maxLogit = -Infinity;
            for (const s of sites) {
                const ddx = dx - s.dir.x;
                const ddy = dy - s.dir.y;
                const dist = Math.sqrt(ddx * ddx + ddy * ddy) + 1e-8;
                const logit = -beta * dist;
                logits.push(logit);
                if (logit > maxLogit) maxLogit = logit;
            }
            let sumExp = 0;
            const weights = [];
            for (let i = 0; i < logits.length; i++) {
                const e = Math.exp(logits[i] - maxLogit);
                weights.push(e);
                sumExp += e;
            }
            if (sumExp < 1e-10) {
                const K = sites.length || 1;
                return new Array(K).fill(1 / K);
            }
            for (let i = 0; i < weights.length; i++) weights[i] /= sumExp;
            return weights;
        }

        function computeFunctionValues(beta) {
            const values = [];
            let maxAbs = 0;
            for (let i = 0; i < numCurveSamples; i++) {
                const theta = (2 * Math.PI * i) / numCurveSamples;
                const w = computeWeightsForAngle(theta, beta);
                let v = 0;
                for (let k = 0; k < sites.length; k++) v += w[k] * sites[k].lambda;
                values.push(v);
                if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
            }
            const scale = maxAbs > 1e-6 ? (outerRadius * 0.9) / maxAbs : 1;
            return { values, scale, maxAbs };
        }

        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#f8f9fb";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.strokeStyle = "rgba(148,163,184,0.35)";
            const rings = 4, spokes = 8;
            for (let i = 1; i <= rings; i++) {
                const r = (outerRadius * i) / rings;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, 2 * Math.PI);
                ctx.stroke();
            }
            for (let i = 0; i < spokes; i++) {
                const a = (2 * Math.PI * i) / spokes;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(outerRadius * Math.cos(a), -outerRadius * Math.sin(a));
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
                    const w = weights[k], c = sites[k].colorRGB;
                    r += w * c[0]; g += w * c[1]; b += w * c[2];
                }
                ctx.strokeStyle = "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
                ctx.lineWidth = Math.max(1, bandThickness * 0.8);
                const rMid = innerRadius + bandThickness * 0.5;
                const x1 = rMid * Math.cos(theta), y1 = -rMid * Math.sin(theta);
                const x2 = rMid * Math.cos(theta + (2 * Math.PI) / numSamples);
                const y2 = -rMid * Math.sin(theta + (2 * Math.PI) / numSamples);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Vettori: lunghezza fissa indipendente dalla temperatura
        function drawSitesAndArrows() {
            ctx.save();
            ctx.translate(centerX, centerY);
            let maxLambda = 0;
            for (const s of sites) {
                const a = Math.abs(s.lambda);
                if (a > maxLambda) maxLambda = a;
            }
            if (maxLambda < 1e-6) maxLambda = 1;
            const maxRay = innerRadius * 0.9;
            for (const s of sites) {
                const n = s.lambda / maxLambda;
                const ray = n * maxRay;

                const x = ray * Math.cos(s.angle);
                const y = -ray * Math.sin(s.angle);

                ctx.strokeStyle = ctx.fillStyle = rgbArrayToCss(s.colorRGB);
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(x, y);
                ctx.stroke();

                const hl = 10, a = s.angle;
                const la = a + Math.PI * 0.87;
                const ra = a - Math.PI * 0.87;

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + hl * Math.cos(la), y - hl * Math.sin(la));
                ctx.lineTo(x + hl * Math.cos(ra), y - hl * Math.sin(ra));
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }

        function drawFunctionCurve(beta) {
            const { values, scale } = computeFunctionValues(beta);

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < numCurveSamples; i++) {
                const theta = (2 * Math.PI * i) / numCurveSamples;
                const r = values[i] * scale;
                const x = r * Math.cos(theta), y = -r * Math.sin(theta);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            drawSitesAndArrows();
        }

        function render() {
            if (!sites.length) return;
            const tempRaw = parseFloat(temperatureSlider.value);
            const temp = !isNaN(tempRaw) ? tempRaw : DEFAULT_TEMPERATURE;

            const beta = temperatureToBeta(temp);

            // Mostriamo beta effettivo, non la temperatura grezza
            temperatureLabel.textContent = beta.toFixed(2);

            clearCanvas();
            drawColorRing(beta);
            drawFunctionCurve(beta);
        }

        if (temperatureSlider) {
            temperatureSlider.addEventListener("input", render);
        }

        if (generateBtn) {
            generateBtn.addEventListener("click", function () {
                initSites();
                render();
            });
        }

        initSites();
        render();
    }

    global.initVoronoiPolarViewer = initVoronoiPolarViewer;
})(window);
