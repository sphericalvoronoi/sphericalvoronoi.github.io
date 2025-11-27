/* ======================
   MODELING REFLECTIONS
   ====================== */

const scenes = [

    {
        name: 'GardenSpheres',
        comparisons: [
            { name: 'Ref-GS vs. Ours', left: './assets/video/refgs_gardenspheres.mp4', right: './assets/video/ours_gardenspheres.mp4' },
            { name: '3DGS-DR vs. Ours', left: './assets/video/3dgsdr_gardenspheres.mp4', right: './assets/video/ours_gardenspheres.mp4' },
            { name: 'GShader vs. Ours', left: './assets/video/gshader_gardenspheres.mp4', right: './assets/video/ours_gardenspheres.mp4' },
        ]
    },
    // {
    //     name: 'Sedan',
    //     comparisons: [
    //         { name: 'Ref-GS vs. Ours', left: './assets/video/refgs_sedan.mp4', right: './assets/video/ours_sedan.mp4' },
    //         { name: '3DGS-DR vs. Ours', left: './assets/video/3dgsdr_sedan.mp4', right: './assets/video/ours_sedan.mp4' },
    //         { name: 'GShader vs. Ours', left: './assets/video/gshader_sedan.mp4', right: './assets/video/ours_sedan.mp4' },
    //     ]
    // },
    {
        name: 'Toaster',
        comparisons: [
            { name: 'GT vs. Ours', left: './assets/video/gt_toaster.mp4', right: './assets/video/ours_toaster.mp4' },
            { name: 'Ref-GS vs. Ours', left: './assets/video/refgs_toaster.mp4', right: './assets/video/ours_toaster.mp4' },
            { name: '3DGS-DR vs. Ours', left: './assets/video/3dgsdr_toaster.mp4', right: './assets/video/ours_toaster.mp4' },
            { name: 'GShader vs. Ours', left: './assets/video/gshader_toaster.mp4', right: './assets/video/ours_toaster.mp4' },
        ]
    },
    {
        name: 'Car',
        comparisons: [
            { name: 'GT vs. Ours', left: './assets/video/gt_car.mp4', right: './assets/video/ours_car.mp4' },
            { name: 'Ref-GS vs. Ours', left: './assets/video/refgs_car.mp4', right: './assets/video/ours_car.mp4' },
            { name: '3DGS-DR vs. Ours', left: './assets/video/3dgsdr_car.mp4', right: './assets/video/ours_car.mp4' },
            { name: 'GShader vs. Ours', left: './assets/video/gshader_car.mp4', right: './assets/video/ours_car.mp4' },
        ]
    },
    // {
    //     name: 'Helmet',
    //     comparisons: [
    //         { name: 'GT vs. Ours', left: './assets/video/gt_helmet.mp4', right: './assets/video/ours_helmet.mp4' },
    //         { name: 'Ref-GS vs. Ours', left: './assets/video/refgs_helmet.mp4', right: './assets/video/ours_helmet.mp4' },
    //         { name: '3DGS-DR vs. Ours', left: './assets/video/3dgsdr_helmet.mp4', right: './assets/video/ours_helmet.mp4' },
    //         { name: 'GShader vs. Ours', left: './assets/video/gshader_helmet.mp4', right: './assets/video/ours_helmet.mp4' },
    //     ]
    // },
    {
        name: 'Bell',
        comparisons: [
            { name: 'Ref-GS vs. Ours', left: './assets/video/refgs_bell.mp4', right: './assets/video/ours_bell.mp4' },
            { name: '3DGS-DR vs. Ours', left: './assets/video/3dgsdr_bell.mp4', right: './assets/video/ours_bell.mp4' },
            { name: 'GShader vs. Ours', left: './assets/video/gshader_bell.mp4', right: './assets/video/ours_bell.mp4' },
        ]
    },
    // {
    //     name: 'GardenSpheres (Normals)',
    //     comparisons: [
    //         { name: 'Ref-GS vs. Ours', left: './assets/video/refgs_gardenspheres_normals.mp4', right: './assets/video/ours_gardenspheres_normals.mp4' },
    //         { name: '3DGS-DR vs. Ours', left: './assets/video/3dgsdr_gardenspheres_normals.mp4', right: './assets/video/ours_gardenspheres_normals.mp4' },
    //         { name: 'GShader vs. Ours', left: './assets/video/gshader_gardenspheres_normals.mp4', right: './assets/video/ours_gardenspheres_normals.mp4' },
    //     ]
    // },
    
];

const gridContainer = document.getElementById('comparisonGrid');
let activeVideos = {};

scenes.forEach((scene, sceneIndex) => {
    const card = document.createElement('div');
    card.className = 'comparison-card';

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('div');
    title.className = 'scene-title';
    title.textContent = scene.name;
    header.appendChild(title);

    const tabs = document.createElement('div');
    tabs.className = 'comparison-tabs';

    scene.comparisons.forEach((comp, compIndex) => {
        const tab = document.createElement('div');
        tab.className = `comparison-tab ${compIndex === 0 ? 'active' : ''}`;
        tab.textContent = comp.name;
        tab.onclick = () => switchComparison(sceneIndex, compIndex);
        tabs.appendChild(tab);
    });

    header.appendChild(tabs);

    const comparisonWrapper = document.createElement('div');
    comparisonWrapper.className = 'comparison-wrapper';
    comparisonWrapper.id = `wrapper-${sceneIndex}`;

    const leftContainer = document.createElement('div');
    leftContainer.className = 'video-container left';
    leftContainer.id = `left-container-${sceneIndex}`;
    leftContainer.innerHTML = `
        <div class="video-label left" id="left-label-${sceneIndex}">${scene.comparisons[0].name.split(' vs. ')[0]}</div>
        <video id="left-video-${sceneIndex}" loop muted>
            <source src="${scene.comparisons[0].left}" type="video/mp4">
        </video>
    `;

    const rightContainer = document.createElement('div');
    rightContainer.className = 'video-container right';
    rightContainer.id = `right-container-${sceneIndex}`;
    rightContainer.innerHTML = `
        <div class="video-label right" id="right-label-${sceneIndex}">${scene.comparisons[0].name.split(' vs. ')[1]}</div>
        <video id="right-video-${sceneIndex}" loop muted>
            <source src="${scene.comparisons[0].right}" type="video/mp4">
        </video>
    `;

    const slider = document.createElement('div');
    slider.className = 'slider';
    slider.id = `slider-${sceneIndex}`;

    comparisonWrapper.appendChild(leftContainer);
    comparisonWrapper.appendChild(rightContainer);
    comparisonWrapper.appendChild(slider);

    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.innerHTML = `
        <button id="play-btn-${sceneIndex}">▶ Play</button>
    `;

    card.appendChild(header);
    card.appendChild(comparisonWrapper);
    card.appendChild(controls);

    gridContainer.appendChild(card);

    setupSlider(sceneIndex);
    setupPlayButton(sceneIndex);
});

function setupSlider(sceneIndex) {
    const slider = document.getElementById(`slider-${sceneIndex}`);
    const wrapper = document.getElementById(`wrapper-${sceneIndex}`);
    const leftContainer = document.getElementById(`left-container-${sceneIndex}`);
    const rightContainer = document.getElementById(`right-container-${sceneIndex}`);

    let isDragging = false;
    let currentSlider = null;

    slider.addEventListener('mousedown', () => {
        isDragging = true;
        currentSlider = sceneIndex;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        currentSlider = null;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || currentSlider !== sceneIndex) return;

        const rect = wrapper.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));

        const percentage = (x / rect.width) * 100;
        slider.style.left = percentage + '%';
        leftContainer.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        rightContainer.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    });

    slider.addEventListener('touchstart', (e) => {
        isDragging = true;
        currentSlider = sceneIndex;
        e.preventDefault();
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
        currentSlider = null;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || currentSlider !== sceneIndex) return;

        const rect = wrapper.getBoundingClientRect();
        let x = e.touches[0].clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));

        const percentage = (x / rect.width) * 100;
        slider.style.left = percentage + '%';
        leftContainer.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        rightContainer.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    });
}

function setupPlayButton(sceneIndex) {
    const playBtn = document.getElementById(`play-btn-${sceneIndex}`);
    const leftVideo = document.getElementById(`left-video-${sceneIndex}`);
    const rightVideo = document.getElementById(`right-video-${sceneIndex}`);

    activeVideos[sceneIndex] = false;

    playBtn.onclick = () => {
        if (activeVideos[sceneIndex]) {
            leftVideo.pause();
            rightVideo.pause();
            playBtn.textContent = '▶ Play';
            activeVideos[sceneIndex] = false;
        } else {
            leftVideo.play();
            rightVideo.play();
            playBtn.textContent = '⏸ Pause';
            activeVideos[sceneIndex] = true;
        }
    };

    leftVideo.addEventListener('timeupdate', () => {
        if (Math.abs(leftVideo.currentTime - rightVideo.currentTime) > 0.3) {
            rightVideo.currentTime = leftVideo.currentTime;
        }
    });
}

function switchComparison(sceneIndex, compIndex) {
    const scene = scenes[sceneIndex];
    const comp = scene.comparisons[compIndex];

    const leftVideo = document.getElementById(`left-video-${sceneIndex}`);
    const rightVideo = document.getElementById(`right-video-${sceneIndex}`);
    const leftLabel = document.getElementById(`left-label-${sceneIndex}`);
    const rightLabel = document.getElementById(`right-label-${sceneIndex}`);

    const wasPlaying = activeVideos[sceneIndex];

    leftVideo.src = comp.left;
    rightVideo.src = comp.right;
    leftLabel.textContent = comp.name.split(' vs. ')[0];
    rightLabel.textContent = comp.name.split(' vs. ')[1];

    if (wasPlaying) {
        leftVideo.play();
        rightVideo.play();
    }

    const card = document.querySelectorAll('#comparisonGrid .comparison-card')[sceneIndex];
    const tabs = card.querySelectorAll('.comparison-tab');
    tabs.forEach((tab, index) => {
        tab.classList.toggle('active', index === compIndex);
    });
}

/* ======================
   MODELING RADIANCE
   ====================== */

const scenes2 = [
    {
        name: 'Bicycle',
        comparisons: [
            { name: 'SH vs. Ours (Voronoi)', left: './radiance/cmp/bicycle_sh.mp4', right: './radiance/cmp/bicycle_voronoi.mp4' },
            { name: 'SG vs. Ours (Voronoi)', left: './radiance/cmp/bicycle_sgs.mp4', right: './radiance/cmp/bicycle_voronoi.mp4' },
            { name: 'SB vs. Ours (Voronoi)', left: './radiance/cmp/bicycle_sb.mp4', right: './radiance/cmp/bicycle_voronoi.mp4' },
        ]
    },
    {
        name: 'Bonsai',
        comparisons: [
            { name: 'SH vs. Ours (Voronoi)', left: './radiance/cmp/bonsai_sh.mp4', right: './radiance/cmp/bonsai_voronoi.mp4' },
            { name: 'SG vs. Ours (Voronoi)', left: './radiance/cmp/bonsai_sgs.mp4', right: './radiance/cmp/bonsai_voronoi.mp4' },
            { name: 'SB vs. Ours (Voronoi)', left: './radiance/cmp/bonsai_sb.mp4', right: './radiance/cmp/bonsai_voronoi.mp4' },
        ]
    },
    {
        name: 'Garden',
        comparisons: [
            { name: 'SH vs. Ours (Voronoi)', left: './radiance/cmp/garden_sh.mp4', right: './radiance/cmp/garden_voronoi.mp4' },
            { name: 'SG vs. Ours (Voronoi)', left: './radiance/cmp/garden_sgs.mp4', right: './radiance/cmp/garden_voronoi.mp4' },
            { name: 'SB vs. Ours (Voronoi)', left: './radiance/cmp/garden_sb.mp4', right: './radiance/cmp/garden_voronoi.mp4' },
        ]
    },
    {
        name: 'Counter',
        comparisons: [
            { name: 'SH vs. Ours (Voronoi)', left: './radiance/cmp/counter_sh.mp4', right: './radiance/cmp/counter_voronoi.mp4' },
            { name: 'SG vs. Ours (Voronoi)', left: './radiance/cmp/counter_sgs.mp4', right: './radiance/cmp/counter_voronoi.mp4' },
            { name: 'SB vs. Ours (Voronoi)', left: './radiance/cmp/counter_sb.mp4', right: './radiance/cmp/counter_voronoi.mp4' },
        ]
    },
];

const gridContainer2 = document.getElementById('comparisonGrid2');
let activeVideos2 = {};

scenes2.forEach((scene, sceneIndex) => {
    const card = document.createElement('div');
    card.className = 'comparison-card';

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('div');
    title.className = 'scene-title';
    title.textContent = scene.name;
    header.appendChild(title);

    const tabs = document.createElement('div');
    tabs.className = 'comparison-tabs';

    scene.comparisons.forEach((comp, compIndex) => {
        const tab = document.createElement('div');
        tab.className = `comparison-tab ${compIndex === 0 ? 'active' : ''}`;
        tab.textContent = comp.name;
        tab.onclick = () => switchComparison2(sceneIndex, compIndex);
        tabs.appendChild(tab);
    });

    header.appendChild(tabs);

    const comparisonWrapper = document.createElement('div');
    comparisonWrapper.className = 'comparison-wrapper';
    comparisonWrapper.id = `wrapper2-${sceneIndex}`;

    const leftContainer = document.createElement('div');
    leftContainer.className = 'video-container left';
    leftContainer.id = `left-container2-${sceneIndex}`;
    leftContainer.innerHTML = `
        <div class="video-label left" id="left-label2-${sceneIndex}">${scene.comparisons[0].name.split(' vs. ')[0]}</div>
        <video id="left-video2-${sceneIndex}" loop muted>
            <source src="${scene.comparisons[0].left}" type="video/mp4">
        </video>
    `;

    const rightContainer = document.createElement('div');
    rightContainer.className = 'video-container right';
    rightContainer.id = `right-container2-${sceneIndex}`;
    rightContainer.innerHTML = `
        <div class="video-label right" id="right-label2-${sceneIndex}">${scene.comparisons[0].name.split(' vs. ')[1]}</div>
        <video id="right-video2-${sceneIndex}" loop muted>
            <source src="${scene.comparisons[0].right}" type="video/mp4">
        </video>
    `;

    const slider = document.createElement('div');
    slider.className = 'slider';
    slider.id = `slider2-${sceneIndex}`;

    comparisonWrapper.appendChild(leftContainer);
    comparisonWrapper.appendChild(rightContainer);
    comparisonWrapper.appendChild(slider);

    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.innerHTML = `
        <button id="play-btn2-${sceneIndex}">▶ Play</button>
    `;

    card.appendChild(header);
    card.appendChild(comparisonWrapper);
    card.appendChild(controls);

    gridContainer2.appendChild(card);

    setupSlider2(sceneIndex);
    setupPlayButton2(sceneIndex);
});

function setupSlider2(sceneIndex) {
    const slider = document.getElementById(`slider2-${sceneIndex}`);
    const wrapper = document.getElementById(`wrapper2-${sceneIndex}`);
    const leftContainer = document.getElementById(`left-container2-${sceneIndex}`);
    const rightContainer = document.getElementById(`right-container2-${sceneIndex}`);

    let isDragging = false;
    let currentSlider = null;

    slider.addEventListener('mousedown', () => {
        isDragging = true;
        currentSlider = sceneIndex;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        currentSlider = null;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || currentSlider !== sceneIndex) return;

        const rect = wrapper.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));

        const percentage = (x / rect.width) * 100;
        slider.style.left = percentage + '%';
        leftContainer.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        rightContainer.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    });

    slider.addEventListener('touchstart', (e) => {
        isDragging = true;
        currentSlider = sceneIndex;
        e.preventDefault();
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
        currentSlider = null;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || currentSlider !== sceneIndex) return;

        const rect = wrapper.getBoundingClientRect();
        let x = e.touches[0].clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));

        const percentage = (x / rect.width) * 100;
        slider.style.left = percentage + '%';
        leftContainer.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        rightContainer.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    });
}

function setupPlayButton2(sceneIndex) {
    const playBtn = document.getElementById(`play-btn2-${sceneIndex}`);
    const leftVideo = document.getElementById(`left-video2-${sceneIndex}`);
    const rightVideo = document.getElementById(`right-video2-${sceneIndex}`);

    activeVideos2[sceneIndex] = false;

    playBtn.onclick = () => {
        if (activeVideos2[sceneIndex]) {
            leftVideo.pause();
            rightVideo.pause();
            playBtn.textContent = '▶ Play';
            activeVideos2[sceneIndex] = false;
        } else {
            leftVideo.play();
            rightVideo.play();
            playBtn.textContent = '⏸ Pause';
            activeVideos2[sceneIndex] = true;
        }
    };

    leftVideo.addEventListener('timeupdate', () => {
        if (Math.abs(leftVideo.currentTime - rightVideo.currentTime) > 0.3) {
            rightVideo.currentTime = leftVideo.currentTime;
        }
    });
}

function switchComparison2(sceneIndex, compIndex) {
    const scene = scenes2[sceneIndex];
    const comp = scene.comparisons[compIndex];

    const leftVideo = document.getElementById(`left-video2-${sceneIndex}`);
    const rightVideo = document.getElementById(`right-video2-${sceneIndex}`);
    const leftLabel = document.getElementById(`left-label2-${sceneIndex}`);
    const rightLabel = document.getElementById(`right-label2-${sceneIndex}`);

    const wasPlaying = activeVideos2[sceneIndex];

    leftVideo.src = comp.left;
    rightVideo.src = comp.right;
    leftLabel.textContent = comp.name.split(' vs. ')[0];
    rightLabel.textContent = comp.name.split(' vs. ')[1];

    if (wasPlaying) {
        leftVideo.play();
        rightVideo.play();
    }

    const card = document.querySelectorAll('#comparisonGrid2 .comparison-card')[sceneIndex];
    const tabs = card.querySelectorAll('.comparison-tab');
    tabs.forEach((tab, index) => {
        tab.classList.toggle('active', index === compIndex);
    });
}
