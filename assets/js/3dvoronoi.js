(function () {
    if (typeof THREE === "undefined") {
        console.error("Three.js not found.");
        return;
    }

    const MAX_SITES = 2048;
    const ENV_W = 2048;
    const ENV_H = 1024;

    const BETA_MIN = 10;
    const BETA_MAX = 5000.0;

    const canvas = document.getElementById("voronoi3dCanvas");
    const tempSlider = document.getElementById("voronoi3dTemperature");
    const tempLabel = document.getElementById("voronoi3dTemperatureLabel");
    const sitesInput = document.getElementById("voronoi3dNumSites");
    const genButton = document.getElementById("voronoi3dGenerate");

    if (!canvas || !tempSlider || !tempLabel || !sitesInput || !genButton) {
        console.warn("[3D Voronoi] UI elements not found, skipping initialization.");
        return;
    }

    function sliderToBeta(sliderValue) {
        const v = Math.max(0, Math.min(BETA_MAX, sliderValue || 0));
        const t = v / BETA_MAX;
        const logMin = Math.log(BETA_MIN);
        const logMax = Math.log(BETA_MAX);
        return Math.exp(logMin + t * (logMax - logMin));
    }

    function betaToSlider(beta) {
        const b = Math.max(BETA_MIN, Math.min(BETA_MAX, beta));
        const logMin = Math.log(BETA_MIN);
        const logMax = Math.log(BETA_MAX);
        const t = (Math.log(b) - logMin) / (logMax - logMin);
        return t * BETA_MAX;
    }

    const TAB20 = [
        [0.121, 0.466, 0.705], [1, 0.498, 0.054], [0.172, 0.627, 0.172], [0.839, 0.153, 0.157],
        [0.58, 0.404, 0.741], [0.549, 0.337, 0.294], [0.89, 0.467, 0.761], [0.498, 0.498, 0.498],
        [0.737, 0.741, 0.133], [0.09, 0.745, 0.811], [0.682, 0.78, 0.91], [1, 0.733, 0.47],
        [0.596, 0.875, 0.541], [1, 0.596, 0.588], [0.773, 0.69, 0.835], [0.769, 0.6, 0.58],
        [0.969, 0.714, 0.824], [0.78, 0.78, 0.78], [0.859, 0.859, 0.553], [0.62, 0.855, 0.898]
    ];

    let currentNumSites = parseInt(sitesInput.value || "16", 10);

    const initialSliderVal = parseFloat(tempSlider.value || "500");
    let currentBeta = sliderToBeta(initialSliderVal);
    tempLabel.textContent = currentBeta.toFixed(2);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const radius = 3.0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0xf9fafb, 1);

    function resizeRenderer() {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width || 600;
        const h = rect.height || 600;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    resizeRenderer();
    window.addEventListener("resize", resizeRenderer);

    const sphereGeom = new THREE.SphereGeometry(1, 512, 256);

    const sitesData = new Float32Array(MAX_SITES * 4);
    const colorsData = new Float32Array(MAX_SITES * 4);

    const sitesTex = new THREE.DataTexture(
        sitesData,
        MAX_SITES,
        1,
        THREE.RGBAFormat,
        THREE.FloatType
    );
    sitesTex.minFilter = sitesTex.magFilter = THREE.NearestFilter;

    const colorsTex = new THREE.DataTexture(
        colorsData,
        MAX_SITES,
        1,
        THREE.RGBAFormat,
        THREE.FloatType
    );
    colorsTex.minFilter = colorsTex.magFilter = THREE.NearestFilter;

    const envTarget = new THREE.WebGLRenderTarget(ENV_W, ENV_H, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
    });

    const envScene = new THREE.Scene();
    const envCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const voronoiUniforms = {
        uNumSites: { value: currentNumSites },
        uBeta: { value: currentBeta },
        uMaxSites: { value: MAX_SITES },
        uSitesTex: { value: sitesTex },
        uColorsTex: { value: colorsTex }
    };

    const voronoiVert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

    const voronoiFrag = `
precision highp float;
#define MAX_SITES ${MAX_SITES}
uniform int   uNumSites;
uniform float uBeta;
uniform float uMaxSites;
uniform sampler2D uSitesTex;
uniform sampler2D uColorsTex;
varying vec2 vUv;

vec3 fetchSite(int i){
  float fi = float(i) + 0.5;
  float u  = fi / uMaxSites;
  return texture2D(uSitesTex, vec2(u, 0.5)).xyz;
}
vec3 fetchColor(int i){
  float fi = float(i) + 0.5;
  float u  = fi / uMaxSites;
  return texture2D(uColorsTex, vec2(u, 0.5)).xyz;
}

void main(){
  float u = vUv.x;
  float v = vUv.y;
  float theta = u * 6.2831853;
  float phi   = v * 3.1415926;

  vec3 wo = normalize(vec3(
    sin(phi)*cos(theta),
    cos(phi),
    sin(phi)*sin(theta)
  ));

  float maxScore = -1e20;
  for (int i=0; i<MAX_SITES; ++i){
    if (i >= uNumSites) break;
    vec3 s  = normalize(fetchSite(i));
    float sc = uBeta * dot(wo, s);
    if (sc > maxScore) maxScore = sc;
  }

  float sumExp = 0.0;
  for (int i=0; i<MAX_SITES; ++i){
    if (i >= uNumSites) break;
    vec3 s  = normalize(fetchSite(i));
    float sc = uBeta * dot(wo, s);
    sumExp += exp(sc - maxScore);
  }
  sumExp = max(sumExp, 1e-6);

  vec3 col = vec3(0.0);
  for (int i=0; i<MAX_SITES; ++i){
    if (i >= uNumSites) break;
    vec3 s  = normalize(fetchSite(i));
    float sc = uBeta * dot(wo, s);
    float w  = exp(sc - maxScore) / sumExp;
    col += w * fetchColor(i);
  }

  gl_FragColor = vec4(col, 1.0);
}`;

    const voronoiMat = new THREE.ShaderMaterial({
        vertexShader: voronoiVert,
        fragmentShader: voronoiFrag,
        uniforms: voronoiUniforms
    });

    envScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), voronoiMat));

    const sphereUniforms = { uEnvMap: { value: envTarget.texture } };
    const sphereMat = new THREE.ShaderMaterial({
        vertexShader: `
varying vec3 vWorldNormal;
void main(){
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position  = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`,
        fragmentShader: `
precision highp float;
varying vec3 vWorldNormal;
uniform sampler2D uEnvMap;
void main(){
  vec3 N = normalize(vWorldNormal);
  float r_xz = sqrt(N.x*N.x + N.z*N.z);
  float phi   = atan(r_xz, N.y);
  float theta = atan(N.z, N.x);
  float u = (theta + 3.1415926) / 6.2831853;
  float v = 1.0 - (phi / 3.1415926);
  vec3 c = texture2D(uEnvMap, vec2(u, v)).rgb;
  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(c, 1.0);
}`,
        uniforms: sphereUniforms
    });

    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(sphere);

    function randomSpherePoints(n) {
        const pts = [];
        for (let i = 0; i < n; i++) {
            const z = Math.random() * 2 - 1;
            const t = Math.random() * 2 * Math.PI;
            const r = Math.sqrt(1 - z * z);
            const x = r * Math.cos(t);
            const y = z;
            const w = r * Math.sin(t);
            pts.push({ x, y, z: w });
        }
        return pts;
    }

    function randomTab20Colors(n) {
        const base = TAB20.slice();
        for (let i = base.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = base[i];
            base[i] = base[j];
            base[j] = tmp;
        }
        const out = [];
        for (let i = 0; i < n; i++) {
            const c = base[i % base.length];
            out.push({ r: c[0], g: c[1], b: c[2] });
        }
        return out;
    }

    function fillSitesAndColors(n) {
        const dirs = randomSpherePoints(n);
        const cols = randomTab20Colors(n);
        for (let i = 0; i < MAX_SITES; i++) {
            const idx = i * 4;
            if (i < n) {
                const d = dirs[i];
                const c = cols[i];
                sitesData[idx] = d.x;
                sitesData[idx + 1] = d.y;
                sitesData[idx + 2] = d.z;
                sitesData[idx + 3] = 0.0;
                colorsData[idx] = c.r;
                colorsData[idx + 1] = c.g;
                colorsData[idx + 2] = c.b;
                colorsData[idx + 3] = 1.0;
            } else {
                sitesData[idx] = 0;
                sitesData[idx + 1] = 1;
                sitesData[idx + 2] = 0;
                sitesData[idx + 3] = 0.0;
                colorsData[idx] = 0;
                colorsData[idx + 1] = 0;
                colorsData[idx + 2] = 0;
                colorsData[idx + 3] = 1.0;
            }
        }
        sitesTex.needsUpdate = true;
        colorsTex.needsUpdate = true;
    }

    function updateVoronoi() {
        voronoiUniforms.uNumSites.value = currentNumSites;
        voronoiUniforms.uBeta.value = currentBeta;
        renderer.setRenderTarget(envTarget);
        renderer.render(envScene, envCamera);
        renderer.setRenderTarget(null);
    }

    fillSitesAndColors(currentNumSites);
    updateVoronoi();

    let userInteractingTemp = false;
    let tempRafId = null;
    let tempLastTs = null;
    let tempDir = 1;
    const TEMP_SECONDS_PER_HALF_CYCLE = 3;
    let tempAutoEnabled = false;

    function tempStep(ts) {
        if (!tempAutoEnabled) return;
        if (tempLastTs == null) tempLastTs = ts;
        const dt = (ts - tempLastTs) / 1000;
        tempLastTs = ts;

        if (!userInteractingTemp) {
            const min = parseFloat(tempSlider.min || "0");
            const max = parseFloat(tempSlider.max || String(BETA_MAX));
            const range = max - min;
            const speed = range / Math.max(0.1, TEMP_SECONDS_PER_HALF_CYCLE);

            let v = parseFloat(tempSlider.value || "0");
            if (!Number.isFinite(v)) v = (min + max) * 0.5;

            v += tempDir * speed * dt;

            if (v >= max) { v = max; tempDir = -1; }
            else if (v <= min) { v = min; tempDir = 1; }

            tempSlider.value = String(v);

            currentBeta = sliderToBeta(v);
            tempLabel.textContent = currentBeta.toFixed(2);
            updateVoronoi();
        }

        tempRafId = requestAnimationFrame(tempStep);
    }

    function startTempAuto() {
        if (!tempAutoEnabled) return;
        if (tempRafId != null) return;
        tempLastTs = null;
        tempRafId = requestAnimationFrame(tempStep);
    }

    function stopTempAuto() {
        if (tempRafId != null) cancelAnimationFrame(tempRafId);
        tempRafId = null;
        tempLastTs = null;
    }

    function setTempAutoAnimate(enabled) {
        tempAutoEnabled = !!enabled;
        if (tempAutoEnabled) startTempAuto();
        else stopTempAuto();
    }

    const tempOnDown = () => { userInteractingTemp = true; };
    const tempOnUp = () => { userInteractingTemp = false; };

    tempSlider.addEventListener("pointerdown", tempOnDown);
    window.addEventListener("pointerup", tempOnUp);
    tempSlider.addEventListener("mousedown", tempOnDown);
    window.addEventListener("mouseup", tempOnUp);
    tempSlider.addEventListener("touchstart", tempOnDown, { passive: true });
    window.addEventListener("touchend", tempOnUp, { passive: true });

    tempSlider.addEventListener("input", (e) => {
        const sliderVal = parseFloat(e.target.value || "0");
        currentBeta = sliderToBeta(sliderVal);
        tempLabel.textContent = currentBeta.toFixed(2);
        updateVoronoi();
    });

    genButton.addEventListener("click", () => {
        let n = parseInt(sitesInput.value, 10);
        if (!Number.isFinite(n)) n = currentNumSites;
        n = Math.max(2, Math.min(MAX_SITES, n));
        currentNumSites = n;
        sitesInput.value = String(currentNumSites);
        fillSitesAndColors(currentNumSites);
        updateVoronoi();
    });

    const basePos = new THREE.Vector3(0, 0, radius);
    const baseUp = new THREE.Vector3(0, 1, 0);
    const camQuat = new THREE.Quaternion();

    let yawBase = 0;
    let pitchBase = 0;
    let autoYaw = 0;
    let autoPitch = 0;

    let dragging = false;
    let lastX = 0, lastY = 0;

    const AUTO_YAW_SPEED = 0.25;
    const AUTO_PITCH_AMPLITUDE = 0.25;
    const AUTO_PITCH_SPEED = 0.4;

    let lastTime = performance.now();
    let elapsed = 0.0;

    function applyCameraTransform() {
        let totalYaw = yawBase + autoYaw;
        let totalPitch = pitchBase + autoPitch;

        const maxPitch = Math.PI / 2 - 0.01;
        totalPitch = Math.max(-maxPitch, Math.min(maxPitch, totalPitch));

        const euler = new THREE.Euler(totalPitch, totalYaw, 0, "YXZ");
        camQuat.setFromEuler(euler);

        const pos = basePos.clone().applyQuaternion(camQuat);
        const up = baseUp.clone().applyQuaternion(camQuat);
        camera.position.copy(pos);
        camera.up.copy(up);
        camera.lookAt(0, 0, 0);
    }
    applyCameraTransform();

    function onMouseDown(e) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    }

    function onMouseUp() {
        dragging = false;
    }

    function onMouseMove(e) {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        const speed = 0.005;
        yawBase -= dx * speed;
        pitchBase -= dy * speed;

        const maxPitch = Math.PI / 2 - 0.01;
        pitchBase = Math.max(-maxPitch, Math.min(maxPitch, pitchBase));

        applyCameraTransform();
    }

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();
        const dt = (now - lastTime) * 0.001;
        lastTime = now;
        elapsed += dt;

        if (!dragging) {
            autoYaw += AUTO_YAW_SPEED * dt;
            if (autoYaw > Math.PI * 2.0) autoYaw -= Math.PI * 2.0;
            autoPitch = AUTO_PITCH_AMPLITUDE * Math.sin(AUTO_PITCH_SPEED * elapsed);
        }

        applyCameraTransform();
        renderer.render(scene, camera);
    }

    animate();

    window.setVoronoi3DTempAutoAnimate = setTempAutoAnimate;
})();
