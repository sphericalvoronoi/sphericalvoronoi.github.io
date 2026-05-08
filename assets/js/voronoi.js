(function (global) {
    "use strict";

    function initVoronoiPolarViewer(options) {
        options = options || {};

        const MAX_SITES = options.maxSites || 64;
        const DEFAULT_SITES = options.defaultSites || 8;
        const MIN_SITES = options.minSites || 2;

        const MAX_TAU = options.maxTemperature || 1250;
        const DEFAULT_TAU = options.defaultTemperature || 250;

        const BETA_MIN = options.minBeta || 1;
        const BETA_MAX = options.maxBeta || 50.0;

        const canvasId = options.canvasId || "voronoiCanvas";
        const numSitesInputId = options.numSitesInputId || "numSitesInput";
        const temperatureId = options.temperatureId || "temperature";
        const temperatureLabelId = options.temperatureLabelId || "temperatureLabel";
        const generateButtonId = options.generateButtonId || "generateVoronoi";

        const AUTO_ANIMATE = options.autoAnimate ?? true;
        const AUTO_TAU = options.autoTau ?? false;

        const TAU_MIN = options.tauMin ?? 0;
        const TAU_MAX = options.tauMax ?? MAX_TAU;
        const TAU_HALF_CYCLE_SECONDS = options.tauHalfCycleSeconds ?? 3;

        const SITES_OMEGA_MIN = options.sitesOmegaMin ?? 0.15;
        const SITES_OMEGA_MAX = options.sitesOmegaMax ?? 0.45;
        const SITES_WOBBLE = options.sitesWobble ?? 0.15;
        const SITES_WOBBLE_FREQ = options.sitesWobbleFreq ?? 0.6;

        const canvas = document.getElementById(canvasId);
        const numSitesInput = document.getElementById(numSitesInputId);
        const tauSlider = document.getElementById(temperatureId);
        const tauLabel = document.getElementById(temperatureLabelId);
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

        function clamp(x, a, b) {
            return Math.max(a, Math.min(b, x));
        }

        function getTauRange() {
            const minAttr = parseFloat(tauSlider?.min ?? String(TAU_MIN));
            const maxAttr = parseFloat(tauSlider?.max ?? String(TAU_MAX));
            const tmin = isNaN(minAttr) ? TAU_MIN : minAttr;
            const tmax = isNaN(maxAttr) ? TAU_MAX : maxAttr;
            return { tmin, tmax };
        }

        function tauToBeta(tau) {
            const { tmin, tmax } = getTauRange();
            const clamped = clamp(tau || 0, tmin, tmax);
            const t = (clamped - tmin) / Math.max(1e-6, (tmax - tmin));
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
                Math.min(MAX_SITES, parseInt(numSitesInput?.value, 10) || DEFAULT_SITES)
            );

            sites = [];
            for (let i = 0; i < K; i++) {
                const angle = randUniform(0, 2 * Math.PI);
                const colorRGB = tab20Color(i);
                const lambda = randUniform(0.3, 1.2);
                const omega = randUniform(SITES_OMEGA_MIN, SITES_OMEGA_MAX) * (Math.random() < 0.5 ? -1 : 1);
                const phase = randUniform(0, 2 * Math.PI);
                sites.push({
                    angle,
                    dir: { x: Math.cos(angle), y: Math.sin(angle) },
                    colorRGB,
                    lambda,
                    omega,
                    phase
                });
            }
        }

        let globalTime = 0;

        function updateSites(dt) {
            const twoPi = 2 * Math.PI;
            globalTime += dt;

            const wobbleOmega = twoPi * SITES_WOBBLE_FREQ;

            for (const s of sites) {
                const wobble = SITES_WOBBLE * Math.sin(wobbleOmega * globalTime + s.phase);
                s.angle = (s.angle + (s.omega * (1 + wobble)) * dt) % twoPi;
                if (s.angle < 0) s.angle += twoPi;
                s.dir.x = Math.cos(s.angle);
                s.dir.y = Math.sin(s.angle);
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
            return { values, scale };
        }

        function drawTauBadge(tau) {
            const x = 14;
            const y = 14;
            const padX = 12;
            const padY = 9;

            const title = "τ";
            const value = (isNaN(tau) ? "?" : tau.toFixed(1));

            ctx.save();
            ctx.font = "800 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
            const w1 = ctx.measureText(title).width;
            ctx.font = "800 36px system-ui, -apple-system, Segoe UI, Roboto, Arial";
            const w2 = ctx.measureText(value).width;

            const gap = 10;
            const w = padX * 2 + w1 + gap + w2;
            const h = padY * 2 + 18;

            ctx.globalAlpha = 0.98;
            ctx.fillStyle = "rgba(255,255,255,0.80)";
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.lineWidth = 1;

            ctx.font = "600 24px system-ui, -apple-system, Segoe UI, Roboto, Arial";
            ctx.fillStyle = "rgba(0,0,0,1)";
            ctx.fillText(title, x + padX, y + padY + 14);

            ctx.font = "800 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
            const gx = x + padX + w1 + gap;
            const gy = y + padY + 14;

            ctx.fillStyle = "rgba(15,23,42,0.92)";
            ctx.fillText(value, gx, gy);

            ctx.restore();
        }

        function clearCanvas(tau) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff";
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

            drawTauBadge(tau);
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
                    r += w * c[0];
                    g += w * c[1];
                    b += w * c[2];
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

        function getTau() {
            const raw = parseFloat(tauSlider?.value);
            if (!isNaN(raw)) return raw;
            const { tmin, tmax } = getTauRange();
            return clamp(DEFAULT_TAU, tmin, tmax);
        }

        function setTau(tau) {
            if (!tauSlider) return;
            tauSlider.value = String(tau);
        }

        function render() {
            if (!sites.length) return;

            const tau = getTau();
            const beta = tauToBeta(tau);

            if (tauLabel) tauLabel.textContent = tau.toFixed(1);

            clearCanvas(tau);
            drawColorRing(beta);
            drawFunctionCurve(beta);
        }

        let autoAnimEnabled = AUTO_ANIMATE;
        let autoTauEnabled = AUTO_TAU;
        let userInteracting = false;
        let rafId = null;
        let lastTs = null;
        let tauTime = 0;

        function step(ts) {
            if (!autoAnimEnabled) return;

            if (lastTs == null) lastTs = ts;
            let dt = (ts - lastTs) / 1000;
            lastTs = ts;
            dt = clamp(dt, 0, 0.05);

            updateSites(dt);

            if (autoTauEnabled && !userInteracting && tauSlider) {
                tauTime += dt;

                const { tmin, tmax } = getTauRange();
                const mid = 0.5 * (tmin + tmax);
                const amp = 0.5 * (tmax - tmin);

                const omegaTau = Math.PI / Math.max(0.1, TAU_HALF_CYCLE_SECONDS);
                const tau = mid - amp * Math.cos(omegaTau * tauTime);

                setTau(tau);
            }

            render();
            rafId = requestAnimationFrame(step);
        }

        function startAuto() {
            if (!autoAnimEnabled) return;
            if (rafId != null) return;
            lastTs = null;
            rafId = requestAnimationFrame(step);
        }

        function stopAuto() {
            if (rafId != null) cancelAnimationFrame(rafId);
            rafId = null;
            lastTs = null;
        }

        function setAutoAnimate(enabled) {
            autoAnimEnabled = !!enabled;
            if (autoAnimEnabled) startAuto();
            else stopAuto();
        }

        function setAutoTau(enabled) {
            autoTauEnabled = !!enabled;
            if (!autoTauEnabled) tauTime = 0;
        }

        if (tauSlider) {
            tauSlider.addEventListener("input", render);

            const onDown = () => { userInteracting = true; };
            const onUp = () => { userInteracting = false; };

            tauSlider.addEventListener("pointerdown", onDown);
            window.addEventListener("pointerup", onUp);

            tauSlider.addEventListener("mousedown", onDown);
            window.addEventListener("mouseup", onUp);

            tauSlider.addEventListener("touchstart", onDown, { passive: true });
            window.addEventListener("touchend", onUp, { passive: true });
        }

        if (generateBtn) {
            generateBtn.addEventListener("click", function () {
                initSites();
                render();
            });
        }

        if (tauSlider) {
            const { tmin, tmax } = getTauRange();
            if (tauSlider.value == null || tauSlider.value === "") {
                setTau(clamp(DEFAULT_TAU, tmin, tmax));
            }
        }

        initSites();
        render();
        if (autoAnimEnabled) startAuto();

        return { setAutoAnimate, setAutoTau };
    }

    global.initVoronoiPolarViewer = initVoronoiPolarViewer;
})(window);
