// --- Physics & Engine Constants Setup --- //
const AU_TO_UNITS = 30; // 1 AU = 30 Three.js units
let PLANET_SCALE = 1.5; 
const EPOCH_LIMIT_MS = new Date('1957-01-01T00:00:00Z').getTime(); // Start of Space Age Link

// Global Simulation State
let simulationDate = new Date('2023-12-01T12:00:00Z');
let isPaused = false;
let lastTime = 0;
const EVENT_CARD_HEIGHT = 65; 

// Speed Control Physics [x0.1, x1, x10, x100]
const speedArray = [0.1, 1, 10, 100];
let currentSpeedIndex = 1; // Default to x1

// Scale logic
let isRealisticScale = false; // Toggle state

// Three.js Core
let scene, camera, renderer, controls;
let planetMeshes = {};
let orbitLines = {};
let sunMesh;
let sunLight;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let hoveredPlanet = null;

// Dynamic TLE satellite records
let issSatRec = null; 

// --- Layer Group Management --- //
let layers = {
    orbits: new THREE.Group(),
    moons: new THREE.Group(),
    planets: new THREE.Group(),
    spacecraft: new THREE.Group(),
    iss: new THREE.Group()
};

// --- Data Models (Korea Localized & Astronomical) --- //
let eventsTimeline = [
    { date: '1957-10-04T12:00:00Z', targetSystem: 'Earth', title: '스푸트니크 1호 발사', desc: '인류 최초의 인공위성.', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&fit=crop' },
    { date: '1969-07-20T20:17:00Z', targetSystem: 'Moon', title: '아폴로 11호 달 착륙', desc: '닐 암스트롱과 버즈 올드린, 인류 최초로 달을 밟다.', img: 'https://images.unsplash.com/photo-1522030299830-10b59b3f9ff7?q=80&w=400&fit=crop' },
    { date: '1986-02-09T00:00:00Z', targetSystem: 'Halley_Comet', title: '핼리 혜성 근일점 통과', desc: '태양에 가장 가깝게 접근하는 시기.', img: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=400&fit=crop' },
    { date: '2024-04-08T18:17:00Z', targetSystem: 'Earth', title: '개기 일식 (북미)', desc: '폭 185km에 달하는 달의 그림자가 북미 대륙을 지나다.', img: 'https://images.unsplash.com/photo-1532692225396-d8cb8aee52ed?q=80&w=400&fit=crop' },
    { date: '2025-11-20T00:00:00Z', targetSystem: 'Earth', title: '아르테미스 2호 발사 (예정)', desc: '유인 달 궤도선 발사 미션.', img: 'https://images.unsplash.com/photo-1446776811953-b23d5734c1ea?q=80&w=400&fit=crop' }
];

const planetsData = {
    Mercury: { nameKo: '수성', temp: '167°C', rotPeriod: '58.6일', a: 0.387, e: 0.2056, i: 7.004, L: 252.25, longPeri: 77.456, node: 48.331, period: 87.97, radius: 0.38, color: 0xaaaaaa, layer: 'planets' },
    Venus: { nameKo: '금성', temp: '464°C', rotPeriod: '-243일', a: 0.723, e: 0.0067, i: 3.394, L: 181.97, longPeri: 131.53, node: 76.680, period: 224.70, radius: 0.95, color: 0xe3bb76, layer: 'planets' },
    Earth: { 
        nameKo: '지구', temp: '15°C', rotPeriod: '1일', a: 1.000, e: 0.0167, i: 0.000, L: 100.46, longPeri: 102.94, node: 0.0, period: 365.25, radius: 1.00, color: 0x3366ff, layer: 'planets',
        moons: [ { nameKo: "달", temp: '-53°C', rotPeriod:'27.3일', a: 3.5, e: 0.05, i: 5.14, period: 27.32, radius: 0.27, color: 0xcccccc } ]
    },
    Mars: { nameKo: '화성', temp: '-65°C', rotPeriod: '1.03일', a: 1.523, e: 0.0934, i: 1.850, L: -4.553, longPeri: -23.943, node: 49.559, period: 686.97, radius: 0.53, color: 0xc1440e, layer: 'planets' },
    Jupiter: { 
        nameKo: '목성', temp: '-110°C', rotPeriod: '0.41일', a: 5.203, e: 0.0483, i: 1.305, L: 34.404, longPeri: 14.753, node: 100.46, period: 4332.59, radius: 11.20, color: 0xd8ca9d, layer: 'planets',
        moons: [
            { nameKo: "이오", temp: '-130°C', rotPeriod:'1.77일', a: 12.5, e: 0.004, i: 0.05, period: 1.76, radius: 0.4, color: 0xffcc00 },
            { nameKo: "유로파", temp: '-160°C', rotPeriod:'3.55일', a: 15.0, e: 0.009, i: 0.47, period: 3.55, radius: 0.35, color: 0xffffff }
        ]
    },
    Saturn: { nameKo: '토성', temp: '-140°C', rotPeriod: '0.45일', a: 9.537, e: 0.0541, i: 2.484, L: 49.944, longPeri: 92.431, node: 113.66, period: 10759.22, radius: 9.45, color: 0xe6e0b1, hasRings: true, layer: 'planets' },
    Halley_Comet: { nameKo: '핼리 혜성', temp: '변동', rotPeriod: '알 수 없음', a: 17.8, e: 0.967, i: 162.2, L: 0, longPeri: 170.0, node: 58.4, period: 27520, radius: 1.2, color: 0xcc88ff, isComet: true, layer: 'planets' },
    ISS: { nameKo: '국제우주정거장', temp: 'N/A', rotPeriod: 'N/A', a: 1.05, e: 0.001, i: 51.6, L: 50, longPeri: 0, node: 0, period: 365 * 0.95, radius: 0.5, color: 0x00ffff, isArtificial: true, layer: 'iss' }
};

// Spacecraft Logic: Precomputed waypoint interpolation logic
const spacecraftMissions = [
    {
        id: 'Voyager_2', nameKo: '보이저 2호 (탐사선)', color: 0xff0000, layer: 'spacecraft',
        launchDate: new Date('1977-08-20T00:00:00Z').getTime(), landDate: new Date('2050-01-01T00:00:00Z').getTime(), // Essentially infinity
        calcPos: (t) => {
            // Linear escape vector outward from Solar System over decades
            let progress = (t - new Date('1977-08-20T00:00:00Z').getTime()) / (86400000 * 365);
            return { x: progress * 5, y: progress * -1, z: progress * 3 }; 
        }
    }
];

// --- Bootstrapping --- //
async function bootstrap() {
    await fetchNASAData();
    await fetchISSTle();
    init3DScene();
    setupUI();
    initTimelineDOM();
    animate(0);
}
bootstrap();

async function fetchNASAData() {
    try {
        const todayDate = new Date().toISOString().split('T')[0];
        eventsTimeline.push({
            date: todayDate + 'T12:00:00Z', targetSystem: 'Sun',
            title: '최신 SDO 태양 흑점 관측', desc: 'NASA SDO 위성이 불과 몇 분 전 전송한 태양 디스크입니다.',
            img: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_256_0193.jpg'
        });
    } catch (e) { console.log('SDO Fetch error', e); }
}

async function fetchISSTle() {
    try {
        const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle');
        if(res.ok) {
            const data = await res.text();
            const lines = data.split('\n');
            if(lines.length >= 3 && window.satellite) {
                issSatRec = satellite.twoline2satrec(lines[1].trim(), lines[2].trim());
                console.log("[TLE] ISS Real-time Sync Complete via satellite.js");
            }
        }
    } catch (e) {
        console.log('[TLE] Failed to load Celestrak. Using math fallback.');
    }
}

// --- Space Engine Init --- //
function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030305);

    // Layer grouping injection
    Object.values(layers).forEach(group => scene.add(group));

    createStarfield();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Quality Shadows
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 30000);
    camera.position.set(0, 150, 300);

    // Deep Shadows: Minimal ambient light to emphasize point light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02); 
    scene.add(ambientLight);

    // Center Sun Light emitting across system
    sunLight = new THREE.PointLight(0xfff5ea, 3, 10000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 5000;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    // Sun object (Cannot receive shadow as it's the emitter)
    const sunGeo = new THREE.SphereGeometry(15, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffddaa }); // Basic Material means it emits/no shadow maps
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { nameEn: 'Sun', nameKo: '태양', temp: '5,500°C', rotPeriod: '27일 (상대적)', targetSystem: 'Sun' };
    scene.add(sunMesh);

    const glowGeo = new THREE.SphereGeometry(16.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    sunMesh.add(new THREE.Mesh(glowGeo, glowMat));

    // Major Entities Generation (Planets)
    Object.keys(planetsData).forEach(name => {
        let data = planetsData[name];
        
        let visualRadius = Math.max(0.5, Math.log10(data.radius * 10)) * PLANET_SCALE;
        if(data.isArtificial || data.isComet) visualRadius = data.radius * PLANET_SCALE;

        let matOptions = { color: data.color, roughness: 0.8, metalness: 0.05 };
        if(data.isArtificial || data.isComet) matOptions.emissive = data.color, matOptions.emissiveIntensity = 0.5;

        let geo = new THREE.SphereGeometry(visualRadius, 32, 32);
        let mat = new THREE.MeshStandardMaterial(matOptions); // Important for Shadows
        
        let mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { 
            nameEn: name, nameKo: data.nameKo, temp: data.temp, rotPeriod: data.rotPeriod, 
            period: data.period, targetSystem: name 
        };

        layers[data.layer].add(mesh);
        planetMeshes[name] = mesh;

        // Rings
        if (data.hasRings) {
            let ringGeo = new THREE.RingGeometry(visualRadius * 1.3, visualRadius * 2.2, 64);
            let ringMat = new THREE.MeshStandardMaterial({ color: 0xcfcba9, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
            let ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2 + 0.47; 
            ringMesh.castShadow = true;
            ringMesh.receiveShadow = true;
            mesh.add(ringMesh);
        }

        // Moons
        if (data.moons) {
            mesh.userData.moonMeshes = [];
            data.moons.forEach(moon => {
                let mGeo = new THREE.SphereGeometry(moon.radius * PLANET_SCALE, 16, 16);
                let mMat = new THREE.MeshStandardMaterial({ color: moon.color });
                let mMesh = new THREE.Mesh(mGeo, mMat);
                mMesh.castShadow = true;
                mMesh.receiveShadow = true;
                mMesh.userData = { nameEn: 'Moon', nameKo: moon.nameKo, temp: moon.temp, rotPeriod: moon.rotPeriod, targetSystem: name };
                
                layers.moons.add(mMesh);
                mesh.userData.moonMeshes.push(mMesh);
                drawMoonOrbitLine(moon, mesh);
            });
        }
        drawOrbitPath(name, data);
    });

    // Spacecraft initialization
    spacecraftMissions.forEach(mission => {
        let geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        let mat = new THREE.MeshStandardMaterial({ color: mission.color, emissive: mission.color, emissiveIntensity: 0.6 });
        let mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { nameEn: mission.id, nameKo: mission.nameKo, temp: 'N/A', rotPeriod: 'N/A', missionObject: true };
        layers.spacecraft.add(mesh);
        mission.meshRef = mesh;
    });

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 10000;
    controls.minDistance = 2;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointermove', onPointerMove);
}

function createStarfield() {
    const starsGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(8000 * 3);
    for(let i = 0; i < posArray.length; i++) posArray[i] = (Math.random() - 0.5) * 8000;
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, opacity: 0.4 })));
}

function drawOrbitPath(name, data) {
    const points = [];
    for(let i = 0; i <= 360; i++) points.push(calculateKeplerianPosition(data, i * (data.period / 360)));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    let pathOptions = { color: 0x445566, transparent: true, opacity: 0.3 };
    let material;
    if (data.isComet || data.isArtificial) {
        pathOptions.color = data.color;
        pathOptions.dashSize = 5;
        pathOptions.gapSize = 3;
        pathOptions.opacity = 0.8;
        material = new THREE.LineDashedMaterial(pathOptions);
    } else {
        material = new THREE.LineBasicMaterial(pathOptions);
    }

    const orbitLine = new THREE.Line(geometry, material);
    if (data.isComet || data.isArtificial) orbitLine.computeLineDistances();
    
    layers.orbits.add(orbitLine);
}

function drawMoonOrbitLine(moonObj, parentMesh) {
    const points = [];
    for (let i = 0; i <= 64; i++) {
        let angle = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * moonObj.a * PLANET_SCALE, 0, Math.sin(angle) * moonObj.a * PLANET_SCALE));
    }
    const mat = new THREE.LineDashedMaterial({ color: 0xa0a0a0, transparent: true, opacity: 0.2, dashSize: 1, gapSize: 1 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    line.computeLineDistances();
    // Tied to parent to move with planet. Note: Orbit group handles planetary orbits, moons are nested to planet coord space
    parentMesh.add(line);
}

// --- UI Binding --- //
function setupUI() {
    // Speed Controls Check
    function bindSpeedControls(rewindId, pauseId, forwardId, btn1xIds) {
        const btnPaw = document.getElementById(pauseId);
        const btnRew = document.getElementById(rewindId);
        const btnFwd = document.getElementById(forwardId);
        
        if(btnPaw) btnPaw.addEventListener('click', (e) => {
            isPaused = !isPaused;
            e.target.textContent = isPaused ? '▶️' : '⏸';
            e.target.classList.toggle('active', isPaused);
        });

        if(btnRew) btnRew.addEventListener('click', () => {
            currentSpeedIndex = Math.max(0, currentSpeedIndex - 1);
            updateSpeedLabel();
        });

        if(btnFwd) btnFwd.addEventListener('click', () => {
            currentSpeedIndex = Math.min(speedArray.length - 1, currentSpeedIndex + 1);
            updateSpeedLabel();
        });
    }

    bindSpeedControls('btn-rewind', 'btn-pause', 'btn-fastforward');
    bindSpeedControls('mob-btn-rewind', 'mob-btn-pause', 'mob-btn-fastforward');
    updateSpeedLabel();

    // Date Toggles
    const handleDate = (e) => {
        const parsed = new Date(e.target.value);
        if (!isNaN(parsed.getTime())) simulationDate = parsed;
    };
    document.getElementById('date-picker')?.addEventListener('change', handleDate);
    document.getElementById('mob-date-picker')?.addEventListener('change', handleDate);

    // Layer Checkboxes Toggle
    const checks = {
        'toggle-orbits': 'orbits',
        'toggle-moons': 'moons',
        'toggle-planets': 'planets',
        'toggle-spacecraft': 'spacecraft',
        'toggle-iss': 'iss'
    };
    for (let id in checks) {
        let el = document.getElementById(id);
        if(el) {
            el.addEventListener('change', (e) => {
                let groupName = checks[id];
                if(layers[groupName]) layers[groupName].visible = e.target.checked;
            });
        }
    }

    // Realistic Scale Toggle (Requires resize logic in future or just simple multiplier)
    const scaleToggle = document.getElementById('toggle-real-scale');
    if(scaleToggle) scaleToggle.addEventListener('change', (e) => {
        isRealisticScale = e.target.checked;
        PLANET_SCALE = isRealisticScale ? 0.3 : 1.5; // drastically shrink scale for 'realism'
        // Object scaling logic runs implicitly through animate loop positions? (No, geometry is baked. For visual effect we scale meshes)
        Object.values(planetMeshes).forEach(mesh => {
            // Apply scale uniform scalar
            mesh.scale.set(PLANET_SCALE/1.5, PLANET_SCALE/1.5, PLANET_SCALE/1.5);
        });
    });
}

function updateSpeedLabel() {
    let speed = speedArray[currentSpeedIndex];
    document.querySelectorAll('.speed-label').forEach(l => l.textContent = `속도: x${speed}`);
}

function initTimelineDOM() {
    eventsTimeline.sort((a,b) => new Date(a.date) - new Date(b.date));
    const list = document.getElementById('events-list');
    if(!list) return;
    
    eventsTimeline.forEach((ev) => {
        const d = new Date(ev.date);
        const el = document.createElement('div');
        el.className = 'event-card';
        el.innerHTML = `<div class="event-title">${ev.title}</div><div class="event-date">${d.toLocaleDateString('ko-KR')}</div>`;

        // Click sets time and tweens camera
        el.addEventListener('click', () => {
             simulationDate = d;
             updateHUD();
             focusCameraOnEvent(ev);
        });
        
        list.appendChild(el);
    });
}

function focusCameraOnEvent(event) {
    if(!event.targetSystem) return;
    
    // Find Target mesh base pos
    let targetObj = planetMeshes[event.targetSystem];
    if(event.targetSystem === 'Sun') targetObj = sunMesh;
    if(!targetObj) return;

    // Use current mesh world pos + offset
    const targetPos = new THREE.Vector3();
    targetObj.getWorldPosition(targetPos);

    let baseDist = targetObj.geometry.boundingSphere.radius * targetObj.scale.x;
    let cameraOffset = new THREE.Vector3(targetPos.x + baseDist * 3, Math.max(20, targetPos.y + baseDist * 1.5), targetPos.z + baseDist * 4);

    // TWEEN Setup
    new TWEEN.Tween(camera.position)
        .to(cameraOffset, 2000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();

    new TWEEN.Tween(controls.target)
        .to(targetPos, 2000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Raycasting Hover Tooltips
function onPointerMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    let interactables = [];
    Object.values(layers).forEach(layer => { if(layer.visible) interactables.push(...layer.children); });
    
    // Add sun manually
    interactables.push(sunMesh);

    const intersects = raycaster.intersectObjects(interactables, false);
    const tooltip = document.getElementById('hover-tooltip');

    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        let obj = intersects[0].object;
        let data = obj.userData;
        
        if (data.nameEn && data.nameKo) {
            tooltip.classList.remove('hidden');
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY + 15}px`;
            
            document.getElementById('tt-name-en').textContent = data.nameEn;
            document.getElementById('tt-name-ko').textContent = data.nameKo;
            document.getElementById('tt-temp').textContent = data.temp || '-';
            document.getElementById('tt-period').textContent = data.period ? `${data.period.toFixed(1)}일` : 'N/A';
            document.getElementById('tt-rotation').textContent = data.rotPeriod || '-';
        }
    } else {
        document.body.style.cursor = 'default';
        tooltip.classList.add('hidden');
    }
}

// Math Engine
function calculateKeplerianPosition(data, offsetDays) {
    let w = data.longPeri - data.node;
    let M = data.L - data.longPeri + (360.0 / data.period) * offsetDays;
    M = (M % 360 + 360) % 360; 

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
    document.getElementById('current-date').textContent = simulationDate.toLocaleDateString('ko-KR', options);
}

function updateTimelineHUD() {
    const list = document.getElementById('events-list');
    if (!list) return;

    let activeIndex = -1;
    const simMs = simulationDate.getTime();
    for (let i = 0; i < eventsTimeline.length; i++) {
        if (simMs >= new Date(eventsTimeline[i].date).getTime()) activeIndex = i;
        else break; 
    }
    
    if (activeIndex >= 0) {
        let pDate = new Date(eventsTimeline[activeIndex].date).getTime();
        let nextDate = pDate;
        if (activeIndex < eventsTimeline.length - 1) nextDate = new Date(eventsTimeline[activeIndex + 1].date).getTime();
        
        let progress = 0;
        if (nextDate > pDate) progress = Math.max(0, Math.min(1, (simMs - pDate) / (nextDate - pDate)));
        
        const containerHeight = document.getElementById('events-container').clientHeight;
        let transY = (containerHeight / 2) - ((activeIndex + progress) * EVENT_CARD_HEIGHT);
        list.style.transform = `translateY(${transY}px)`;
    }
}

// ------------------------------------------------ //
// --- Main Render & Physics Logic (1s = 1day!) --- //
// ------------------------------------------------ //
function animate(time) {
    if(!scene) return;
    requestAnimationFrame(animate);
    
    TWEEN.update(time); // Crucial for camera animation

    let deltaTimeSec = (time - lastTime) / 1000.0; 
    lastTime = time;
    if(deltaTimeSec > 0.1) deltaTimeSec = 0.1; // cap

    if (!isPaused) {
        // Core Physics Requirement: speed x1 MUST equal 1 simulation day per 1 real second.
        // 1 day = 86400000 ms.
        const baseSpeedMsPerSec = 86400000; 
        const multiplier = speedArray[currentSpeedIndex]; // e.g., 0.1, 1, 10, 100
        
        let msToAdd = deltaTimeSec * baseSpeedMsPerSec * multiplier;
        simulationDate.setTime(simulationDate.getTime() + msToAdd);
    }

    const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
    let epochDays = (simulationDate.getTime() - J2000) / 86400000;

    // Keplerian Planets Overhaul
    Object.keys(planetsData).forEach(name => {
        const data = planetsData[name];
        if (name === 'ISS' && issSatRec && window.satellite) {
            // Realtime ISS Propagator override
            const positionAndVelocity = satellite.propagate(issSatRec, simulationDate);
            if (positionAndVelocity.position) {
                const gmst = satellite.gstime(simulationDate);
                const pos = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
                // Simple conversion to visualization orbit format around earth (simplified mapping to AU_UNITS)
                const earthPos = calculateKeplerianPosition(planetsData['Earth'], epochDays);
                // Convert geo alt(km), lat, lon to xyz offset
                let altitudeAu = (pos.height / 149597870.7) * 2000; // Fake amplification for visibility
                let offsetZ = Math.cos(pos.latitude) * Math.cos(pos.longitude) * altitudeAu * AU_TO_UNITS * PLANET_SCALE;
                let offsetX = Math.cos(pos.latitude) * Math.sin(pos.longitude) * altitudeAu * AU_TO_UNITS * PLANET_SCALE;
                let offsetY = Math.sin(pos.latitude) * altitudeAu * AU_TO_UNITS * PLANET_SCALE;
                
                planetMeshes['ISS'].position.set(earthPos.x + offsetX, earthPos.y + offsetY, earthPos.z + offsetZ);
            }
        } else {
            // Standard Keplerian
            let pos = calculateKeplerianPosition(data, epochDays);
            let pMesh = planetMeshes[name];
            
            if (pMesh) {
                pMesh.position.copy(pos);
                pMesh.rotation.y += 0.02; // Rotate
                // Moons
                if (data.moons && pMesh.userData.moonMeshes) {
                    data.moons.forEach((m, idx) => {
                        let mMesh = pMesh.userData.moonMeshes[idx];
                        let mAngle = epochDays * (360 / m.period) * Math.PI / 180;
                        mMesh.position.set(pos.x + Math.cos(mAngle)*m.a*PLANET_SCALE, pos.y, pos.z + Math.sin(mAngle)*m.a*PLANET_SCALE);
                    });
                }
            }
        }
    });

    // Spacecraft explicit trajectory interpolation
    spacecraftMissions.forEach(mission => {
        if(mission.meshRef) {
            let simMs = simulationDate.getTime();
            if(simMs >= mission.launchDate && simMs <= mission.landDate) {
                mission.meshRef.visible = true && layers.spacecraft.visible;
                let posObj = mission.calcPos(simMs);
                mission.meshRef.position.set(posObj.x, posObj.y, posObj.z);
            } else {
                mission.meshRef.visible = false;
            }
        }
    });

    sunMesh.rotation.y += 0.005;

    updateHUD();
    updateTimelineHUD();
    
    controls.update();
    renderer.render(scene, camera);
}
