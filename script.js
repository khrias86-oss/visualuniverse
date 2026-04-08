// Constants and Scale Setup
const AU_TO_UNITS = 30; // 1 AU = 30 Three.js units
const PLANET_SCALE = 1.5; // Base visual scale for planets
const EPOCH_LIMIT_MS = new Date('1957-01-01T00:00:00Z').getTime(); // Start of Space Age Limit

// Static Astronomical Events Data (Fallback + Historical)
let eventsTimeline = [
    { date: '1957-10-04T12:00:00Z', title: 'Sputnik 1 Launch', desc: 'First artificial Earth satellite.', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop' },
    { date: '1969-07-20T20:17:00Z', title: 'Apollo 11 Moon Landing', desc: 'Commander Neil Armstrong and lunar module pilot Buzz Aldrin.', img: 'https://images.unsplash.com/photo-1522030299830-10b59b3f9ff7?q=80&w=400&auto=format&fit=crop' },
    { date: '1986-02-09T00:00:00Z', title: 'Halley\'s Comet Perihelion', desc: 'Halley\'s Comet reaches its closest approach to the Sun.', img: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=400&auto=format&fit=crop' },
    { date: '2021-06-26T00:00:00Z', title: 'ISS Visibility - Global', desc: 'Optimal orbital trajectory for naked-eye viewing across northern hemisphere.', img: 'https://images.unsplash.com/photo-1446776811953-b23d5734c1ea?q=80&w=400&auto=format&fit=crop' },
    { date: '2023-02-20T00:00:00Z', title: 'Voyager 1 Milestone', desc: 'Voyager 1 interstellar communications relay test.', img: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=400&auto=format&fit=crop' },
    { date: '2026-08-12T00:00:00Z', title: 'Total Solar Eclipse', desc: 'Visible across Arctic, eastern Greenland, and Spain.', img: 'https://images.unsplash.com/photo-1532692225396-d8cb8aee52ed?q=80&w=400&auto=format&fit=crop' },
    { date: '2061-07-28T00:00:00Z', title: 'Halley\'s Comet Returns', desc: 'Next predicted perihelion of Halley\'s Comet.', img: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=400&auto=format&fit=crop' }
];

// Planet & System Data (J2000 Keplerian Elements approx)
const planetsData = {
    Mercury: { a: 0.387, e: 0.2056, i: 7.004, L: 252.25, longPeri: 77.456, node: 48.331, period: 87.97, radius: 0.38, color: 0xaaaaaa },
    Venus: { a: 0.723, e: 0.0067, i: 3.394, L: 181.97, longPeri: 131.53, node: 76.680, period: 224.70, radius: 0.95, color: 0xe3bb76 },
    Earth: { 
        a: 1.000, e: 0.0167, i: 0.000, L: 100.46, longPeri: 102.94, node: 0.0, period: 365.25, radius: 1.00, color: 0x3366ff,
        moons: [
            { name: "Moon", a: 3.5, e: 0.05, i: 5.14, period: 27.32, radius: 0.27, color: 0xcccccc } 
        ]
    },
    Mars: { a: 1.523, e: 0.0934, i: 1.850, L: -4.553, longPeri: -23.943, node: 49.559, period: 686.97, radius: 0.53, color: 0xc1440e },
    Jupiter: { 
        a: 5.203, e: 0.0483, i: 1.305, L: 34.404, longPeri: 14.753, node: 100.46, period: 4332.59, radius: 11.20, color: 0xd8ca9d,
        moons: [
            { name: "Io", a: 12.5, e: 0.004, i: 0.05, period: 1.76, radius: 0.4, color: 0xffcc00 },
            { name: "Europa", a: 15.0, e: 0.009, i: 0.47, period: 3.55, radius: 0.35, color: 0xffffff }
        ]
    },
    Saturn: { a: 9.537, e: 0.0541, i: 2.484, L: 49.944, longPeri: 92.431, node: 113.66, period: 10759.22, radius: 9.45, color: 0xe6e0b1, hasRings: true },
    Uranus: { a: 19.191, e: 0.0471, i: 0.769, L: 313.23, longPeri: 170.96, node: 74.00, period: 30685.4, radius: 4.00, color: 0xaaccff },
    Neptune: { a: 30.068, e: 0.0085, i: 1.769, L: -55.12, longPeri: 44.97, node: 131.72, period: 60189.0, radius: 3.88, color: 0x5b5ddf },
    
    // Artificial & Comets
    Halley_Comet: { a: 17.8, e: 0.967, i: 162.2, L: 0, longPeri: 170.0, node: 58.4, period: 27520, radius: 1.2, color: 0xcc88ff, isComet: true },
    Voyager_1_SIM: { a: 15.0, e: 1.2, i: 35.0, L: 0, longPeri: 0, node: 45, period: 99999, radius: 1.2, color: 0xff0000, isArtificial: true },
    ISS_Dynamic: { a: 1.002, e: 0.001, i: 51.6, L: 50, longPeri: 0, node: 0, period: 365.25 * 0.95, radius: 1.5, color: 0x00ffff, isArtificial: true }
};

// Global Simulation State
// Start slightly in the past
let simulationDate = new Date('2023-12-01T12:00:00Z');
let timeSpeedMultiplier = 10; 
let isPaused = false;
let lastTime = 0;
const EVENT_CARD_HEIGHT = 60; 

// Three.js Core Components
let scene, camera, renderer, controls;
let planetMeshes = {};
let orbitLines = {};
let sunMesh;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let hoveredPlanet = null;

// Async Init workflow
async function bootstrap() {
    await fetchLiveAPIs(); // Tries to grab live TLE & NASA SDO
    init3DScene();
    setupUI();
    initTimelineDOM();
    animate(0);
}
bootstrap();

async function fetchLiveAPIs() {
    // 1. Fetch live NASA SDO Image for today's representation
    try {
        const todayDate = new Date().toISOString().split('T')[0];
        eventsTimeline.push({
            date: todayDate + 'T12:00:00Z',
            title: 'Live: NASA SDO Sun',
            desc: 'Current observations of the Sun from the Solar Dynamics Observatory.',
            img: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_256_0193.jpg'
        });
    } catch (e) { console.log('SDO Fetch error', e); }

    // 2. Fetch CelesTrak TLE for ISS (If fails, fallback already defined in planetsData)
    try {
        const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json');
        if(res.ok) {
            const data = await res.json();
            const issElem = data.find(item => item.OBJECT_NAME.includes('ISS'));
            if(issElem) {
                // Update internal parameters roughly mapped to keplerian logic framework
                // To keep visualization simple within our engine, we inject it into our format
                planetsData.ISS_Dynamic.period = (24 * 60) / issElem.MEAN_MOTION; // rough translation
                planetsData.ISS_Dynamic.i = issElem.INCLINATION;
                planetsData.ISS_Dynamic.e = issElem.ECCENTRICITY;
                console.log("[Live Tracker] Synchronized ISS TLE Data");
            }
        }
    } catch (e) {
        console.log('[Live Tracker] CORS/Block issue on Celestrak. Using static bundled ISS fallback.');
    }
}

function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);

    createStarfield();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(0, 150, 300);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.08); 
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffee, 2, 5000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Sun Setup
    const sunGeo = new THREE.SphereGeometry(15, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffddaa });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    const glowGeo = new THREE.SphereGeometry(16.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending 
    });
    sunMesh.add(new THREE.Mesh(glowGeo, glowMat));

    // Create Entities
    Object.keys(planetsData).forEach(name => {
        let data = planetsData[name];
        
        let visualRadius = Math.max(0.5, Math.log10(data.radius * 10)) * PLANET_SCALE;
        // CRISIS FIX: Force artificial/cometary objects to be large enough to see, ignore logarithm reduction
        if(data.isArtificial || data.isComet) visualRadius = data.radius * PLANET_SCALE;

        let matOptions = (data.isArtificial || data.isComet)
            ? { color: data.color, emissive: data.color, emissiveIntensity: 0.5, roughness: 0.1 }
            : { color: data.color, roughness: 0.7, metalness: 0.1 };

        let geo = new THREE.SphereGeometry(visualRadius, 32, 32);
        let mat = new THREE.MeshStandardMaterial(matOptions);
        
        let mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { name: name, data: data };
        scene.add(mesh);
        planetMeshes[name] = mesh;

        if (data.hasRings) {
            let ringGeo = new THREE.RingGeometry(visualRadius * 1.3, visualRadius * 2.2, 64);
            let ringMat = new THREE.MeshBasicMaterial({ color: 0xcfcba9, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
            let ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2 + 0.47; 
            mesh.add(ringMesh);
        }

        // Moons configuration
        if (data.moons) {
            mesh.userData.moonMeshes = [];
            data.moons.forEach(moon => {
                let mGeo = new THREE.SphereGeometry(moon.radius * PLANET_SCALE, 16, 16);
                let mMat = new THREE.MeshStandardMaterial({ color: moon.color });
                let mMesh = new THREE.Mesh(mGeo, mMat);
                mMesh.userData = { data: moon };
                scene.add(mMesh);
                mesh.userData.moonMeshes.push(mMesh);
                drawMoonOrbitLine(moon, mesh);
            });
        }

        drawOrbitPath(name, data);
    });

    // OrbitControls Bug Fix: Map explicit touches and mouse buttons
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 6000;
    controls.minDistance = 5;
    
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    };
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('click', onClick);
}

function createStarfield() {
    const starsGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(8000 * 3);
    for(let i = 0; i < posArray.length; i++) {
        posArray[i] = (Math.random() - 0.5) * 5000;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, opacity: 0.6 })));
}

function drawOrbitPath(name, data) {
    const points = [];
    for(let i = 0; i <= 360; i++) {
        points.push(calculateKeplerianPosition(data, i * (data.period / 360)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    let pathOptions = { color: 0x445566, transparent: true, opacity: 0.4 };
    
    let material;
    if (data.isComet || data.isArtificial) {
        pathOptions.color = data.color;
        pathOptions.dashSize = 5;
        pathOptions.gapSize = 3;
        material = new THREE.LineDashedMaterial(pathOptions);
    } else {
        material = new THREE.LineBasicMaterial(pathOptions);
    }

    const orbitLine = new THREE.Line(geometry, material);
    
    // Crucial for DashedMaterial to render properly
    if (data.isComet || data.isArtificial) {
        orbitLine.computeLineDistances();
    }
    
    orbitLines[name] = orbitLine;
    scene.add(orbitLine);
}

function drawMoonOrbitLine(moonObj, parentMesh) {
    const points = [];
    for (let i = 0; i <= 64; i++) {
        let angle = (i / 64) * Math.PI * 2;
        let x = Math.cos(angle) * moonObj.a * PLANET_SCALE;
        let z = Math.sin(angle) * moonObj.a * PLANET_SCALE;
        points.push(new THREE.Vector3(x, 0, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    // Moons get faint dashed paths to differentiate
    const mat = new THREE.LineDashedMaterial({ color: 0xa0a0a0, transparent: true, opacity: 0.3, dashSize: 1, gapSize: 1 });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    parentMesh.add(line);
}

function setupUI() {
    // Shared functionality for desktop and mobile buttons
    function bindSpeedControls(rewindId, pauseId, forwardId) {
        const btnPaw = document.getElementById(pauseId);
        const btnRew = document.getElementById(rewindId);
        const btnFwd = document.getElementById(forwardId);
        
        if(btnPaw) btnPaw.addEventListener('click', (e) => {
            isPaused = !isPaused;
            e.target.textContent = isPaused ? '▶️' : '⏸';
            e.target.classList.toggle('active', isPaused);
            
            // Sync opposite
            const otherPaw = pauseId === 'btn-pause' ? document.getElementById('mob-btn-pause') : document.getElementById('btn-pause');
            if(otherPaw) {
                otherPaw.textContent = isPaused ? '▶️' : '⏸';
                otherPaw.classList.toggle('active', isPaused);
            }
        });

        if(btnRew) btnRew.addEventListener('click', () => {
            timeSpeedMultiplier = -Math.abs(timeSpeedMultiplier * (timeSpeedMultiplier === 10 ? 1 : 2));
            if (timeSpeedMultiplier < -1000) timeSpeedMultiplier = -1000;
            updateSpeedLabel();
        });

        if(btnFwd) btnFwd.addEventListener('click', () => {
            if(timeSpeedMultiplier < 0) timeSpeedMultiplier = 10;
            else timeSpeedMultiplier *= 10;
            if (timeSpeedMultiplier > 1000) timeSpeedMultiplier = 1000;
            updateSpeedLabel();
        });
    }

    bindSpeedControls('btn-rewind', 'btn-pause', 'btn-fastforward');
    bindSpeedControls('mob-btn-rewind', 'mob-btn-pause', 'mob-btn-fastforward');

    // Date Pickers
    const dPicker = document.getElementById('date-picker');
    const mPicker = document.getElementById('mob-date-picker');

    const handleDate = (e) => {
        const parsed = new Date(e.target.value);
        if (!isNaN(parsed.getTime())) simulationDate = parsed;
    };
    if(dPicker) dPicker.addEventListener('change', handleDate);
    if(mPicker) mPicker.addEventListener('change', handleDate);

    // Mobile FAB Modal integration
    const fabButton = document.getElementById('mobile-fab');
    const modalWrapper = document.getElementById('mobile-controls-modal');
    const closeModalBtn = document.getElementById('close-mobile-modal');

    if(fabButton && modalWrapper) {
        fabButton.addEventListener('click', () => {
            modalWrapper.classList.remove('hidden');
        });
        closeModalBtn.addEventListener('click', () => {
            modalWrapper.classList.add('hidden');
        });
        modalWrapper.addEventListener('click', (e) => {
            if (e.target === modalWrapper) modalWrapper.classList.add('hidden');
        });
    }

    // Timeline Collapse
    const toggleTimeline = document.getElementById('toggle-timeline');
    const timelinePanel = document.getElementById('timeline-panel');
    if(toggleTimeline && timelinePanel) {
        toggleTimeline.addEventListener('click', () => {
            timelinePanel.classList.toggle('collapsed');
            toggleTimeline.textContent = timelinePanel.classList.contains('collapsed') ? '▲' : '▼';
        });
    }

    // Info panel close
    document.getElementById('close-info')?.addEventListener('click', () => {
        document.getElementById('planet-info').classList.add('hidden');
        selectedPlanet = null;
    });

    updateSpeedLabel();
}

function updateSpeedLabel() {
    const labels = document.querySelectorAll('.speed-label');
    let txt = timeSpeedMultiplier < 0 ? `Rewind x${Math.abs(timeSpeedMultiplier)}` : `Speed x${timeSpeedMultiplier}`;
    labels.forEach(l => l.textContent = txt);
}

function initTimelineDOM() {
    eventsTimeline.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const list = document.getElementById('events-list');
    if(!list) return;
    
    eventsTimeline.forEach((ev) => {
        const d = new Date(ev.date);
        const el = document.createElement('div');
        el.className = 'event-card';
        el.innerHTML = `<div class="event-title">${ev.title}</div><div class="event-date">${d.toLocaleDateString()}</div>`;

        // Touch & Mouse compatibility
        el.addEventListener('pointerenter', () => showEventPopup(ev, el));
        el.addEventListener('pointerleave', hideEventPopup);
        // On Mobile, clicking opens popup as sticky till closed
        el.addEventListener('click', () => {
            showEventPopup(ev, el);
            setTimeout(hideEventPopup, 3000); // auto dismiss after 3 sec for mobile
        });
        
        list.appendChild(el);
    });
}

function showEventPopup(ev, elementRef) {
    const popup = document.getElementById('event-popup');
    if(!popup) return;
    const rect = elementRef.getBoundingClientRect();
    
    document.getElementById('event-popup-title').textContent = ev.title;
    document.getElementById('event-popup-desc').textContent = ev.desc;
    document.getElementById('event-popup-img').src = ev.img;
    
    // Ensure popup fits on screen
    let pTop = rect.top;
    if (pTop > window.innerHeight - 250) pTop = window.innerHeight - 250;
    
    popup.style.top = `${pTop}px`;
    // Attach to left of timeline
    popup.style.right = `${window.innerWidth - rect.left + 15}px`;
    popup.classList.remove('hidden');
}

function hideEventPopup() {
    document.getElementById('event-popup')?.classList.add('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
    // Only detect on desktop pointer, skip touch hover to avoid glitches
    if(event.pointerType !== 'mouse') return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(Object.values(planetMeshes), false);
    
    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        hoveredPlanet = intersects[0].object;
    } else {
        document.body.style.cursor = 'default';
        hoveredPlanet = null;
    }
}

function onClick(event) {
    // Touch device support for click based on raycaster update directly at click
    if(event.pointerType !== 'mouse') {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
    }
    
    const intersects = raycaster.intersectObjects(Object.values(planetMeshes), false);
    if (intersects.length > 0) hoveredPlanet = intersects[0].object;
    else return; // Don't hide info sheet if clicking blank space

    if (hoveredPlanet) {
        selectedPlanet = hoveredPlanet;
        const data = selectedPlanet.userData.data;
        document.getElementById('info-name').textContent = selectedPlanet.userData.name;
        document.getElementById('info-distance').textContent = data.a.toFixed(3);
        document.getElementById('info-radius').textContent = data.radius.toFixed(2);
        
        let periodDisplay = data.period > 90000 ? "N/A (Escape Trajectory)" : data.period.toFixed(1);
        document.getElementById('info-period').textContent = periodDisplay;
        
        document.getElementById('planet-info').classList.remove('hidden');
    }
}

function calculateKeplerianPosition(data, offsetDays) {
    let w = data.longPeri - data.node;
    let M = data.L - data.longPeri + (360.0 / data.period) * offsetDays;
    
    M = typeof M === "number" && !isNaN(M) ? M % 360 : 0;
    if (M < 0) M += 360;

    let M_rad = M * Math.PI / 180;
    let e = data.e;
    let i_rad = data.i * Math.PI / 180;
    let node_rad = data.node * Math.PI / 180;
    let w_rad = w * Math.PI / 180;

    let E = M_rad;
    for(let iter=0; iter<10; iter++){
        let deltaE = (M_rad - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
        E += deltaE;
        if (Math.abs(deltaE) < 1e-6) break;
    }

    let x_orb = data.a * (Math.cos(E) - e);
    let y_orb = data.a * Math.sqrt(1 - e*e) * Math.sin(E);

    let x_ecl = (Math.cos(node_rad)*Math.cos(w_rad) - Math.sin(node_rad)*Math.sin(w_rad)*Math.cos(i_rad)) * x_orb 
              + (-Math.cos(node_rad)*Math.sin(w_rad) - Math.sin(node_rad)*Math.cos(w_rad)*Math.cos(i_rad)) * y_orb;
    let y_ecl = (Math.sin(node_rad)*Math.cos(w_rad) + Math.cos(node_rad)*Math.sin(w_rad)*Math.cos(i_rad)) * x_orb 
              + (-Math.sin(node_rad)*Math.sin(w_rad) + Math.cos(node_rad)*Math.cos(w_rad)*Math.cos(i_rad)) * y_orb;
    let z_ecl = (Math.sin(w_rad)*Math.sin(i_rad)) * x_orb 
              + (Math.cos(w_rad)*Math.sin(i_rad)) * y_orb;

    return new THREE.Vector3(x_ecl * AU_TO_UNITS, z_ecl * AU_TO_UNITS, -y_ecl * AU_TO_UNITS);
}

function updateHUD() {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    document.getElementById('current-date').textContent = simulationDate.toLocaleDateString('en-US', options);
    
    const isoStr = simulationDate.toISOString().split('T')[0];
    const pickerD = document.getElementById('date-picker');
    const pickerM = document.getElementById('mob-date-picker');

    if (pickerD && document.activeElement !== pickerD) pickerD.value = isoStr;
    if (pickerM && document.activeElement !== pickerM) pickerM.value = isoStr;
}

function updateTimelineHUD() {
    const list = document.getElementById('events-list');
    if (!list) return;

    let activeIndex = -1;
    const simMs = simulationDate.getTime();

    for (let i = 0; i < eventsTimeline.length; i++) {
        const evDate = new Date(eventsTimeline[i].date).getTime();
        if (simMs >= evDate) activeIndex = i;
        else break; 
    }
    
    if (activeIndex >= 0) {
        let pDate = new Date(eventsTimeline[activeIndex].date).getTime();
        let nextDate = pDate;
        
        if (activeIndex < eventsTimeline.length - 1) {
            nextDate = new Date(eventsTimeline[activeIndex + 1].date).getTime();
        }
        
        let progress = 0;
        if (nextDate > pDate) progress = Math.max(0, Math.min(1, (simMs - pDate) / (nextDate - pDate)));
        
        const containerHeight = document.getElementById('events-container').clientHeight;
        const middleLine = containerHeight / 2;
        let logicalY = (activeIndex + progress) * EVENT_CARD_HEIGHT;
        let transY = middleLine - logicalY;
        
        list.style.transform = `translateY(${transY}px)`;
    } else {
        const containerHeight = document.getElementById('events-container')?.clientHeight || 300;
        list.style.transform = `translateY(${containerHeight/2}px)`;
    }
}

function animate(time) {
    if(!scene) return;
    requestAnimationFrame(animate);

    let deltaTime = (time - lastTime) / 1000; 
    lastTime = time;
    if(deltaTime > 0.1) deltaTime = 0.1; 

    if (!isPaused) {
        let msToAdd = deltaTime * timeSpeedMultiplier * 86400000;
        let nextTime = simulationDate.getTime() + msToAdd;
        
        if(nextTime < EPOCH_LIMIT_MS) {
            nextTime = EPOCH_LIMIT_MS;
            timeSpeedMultiplier = 1; 
        }
        simulationDate.setTime(nextTime);
    }

    const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
    let epochDays = (simulationDate.getTime() - J2000) / 86400000;

    Object.keys(planetsData).forEach(name => {
        const data = planetsData[name];
        let pos = calculateKeplerianPosition(data, epochDays);
        let pMesh = planetMeshes[name];
        
        if (pMesh) {
            pMesh.position.copy(pos);
            pMesh.rotation.y += 0.01 * (data.isArtificial ? 3 : 1); 

            if (data.moons && pMesh.userData.moonMeshes) {
                data.moons.forEach((m, idx) => {
                    let moonMesh = pMesh.userData.moonMeshes[idx];
                    let mAngle = epochDays * (360 / m.period) * Math.PI / 180;
                    
                    let mx = Math.cos(mAngle) * m.a * PLANET_SCALE;
                    let mz = Math.sin(mAngle) * m.a * PLANET_SCALE;
                    
                    moonMesh.position.set(pos.x + mx, pos.y, pos.z + mz);
                });
            }
        }
    });

    sunMesh.rotation.y += 0.005;

    updateHUD();
    updateTimelineHUD();
    
    controls.update();
    renderer.render(scene, camera);
}
