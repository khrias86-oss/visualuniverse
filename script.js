// --- Physics & Engine Constants Setup --- //
const AU_TO_UNITS = 30; 
let PLANET_SCALE = 1.5; 
const EPOCH_LIMIT_MS = new Date('1950-01-01T00:00:00Z').getTime();

let simulationDate = new Date('2023-12-01T12:00:00Z');
let isPaused = false;
let lastTime = 0;

const speedArray = [0.1, 1, 10, 100];
let currentSpeedIndex = 1; 
let isRealisticScale = false; 

let scene, camera, renderer, controls;
let planetMeshes = {};
let orbitLines = {};
let sunMesh, sunLight;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let activeTooltipObject = null; 
let issSatRec = null; 

// The strict Raycasting target array (Meshes only)
const interactiveMeshes = [];

let layers = {
    orbits: new THREE.Group(),
    moons: new THREE.Group(),
    planets: new THREE.Group(),
    spacecraft: new THREE.Group(),
    iss: new THREE.Group()
};

// --- Localization & Database --- //
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
    Uranus: { nameKo: '천왕성', temp: '-195°C', rotPeriod: '-0.71일', a: 19.191, e: 0.0471, i: 0.769, L: 313.23, longPeri: 170.96, node: 74.00, period: 30685.4, radius: 4.00, color: 0xaaccff, layer: 'planets' },
    Neptune: { nameKo: '해왕성', temp: '-200°C', rotPeriod: '0.67일', a: 30.068, e: 0.0085, i: 1.769, L: -55.12, longPeri: 44.97, node: 131.72, period: 60189.0, radius: 3.88, color: 0x5b5ddf, layer: 'planets' },
    
    Halley_Comet: { nameKo: '핼리 혜성', temp: '가변적', rotPeriod: '불명', a: 17.8, e: 0.967, i: 162.2, L: 0, longPeri: 170.0, node: 58.4, period: 27520, radius: 1.2, color: 0xcc88ff, isComet: true, layer: 'planets' },
    ISS: { nameKo: '국제우주정거장', temp: 'N/A', rotPeriod: 'N/A', a: 1.05, e: 0.001, i: 51.6, L: 50, longPeri: 0, node: 0, period: 365 * 0.95, radius: 0.5, color: 0x00ffff, isArtificial: true, layer: 'iss' }
};

const spacecraftMissions = [
    {
        id: 'Voyager_1', nameKo: '보이저 1호', color: 0xff0000, layer: 'spacecraft',
        launchDate: new Date('1977-09-05T00:00:00Z').getTime(), landDate: new Date('2050-01-01T00:00:00Z').getTime(),
        calcPos: (t) => { let p = (t - new Date('1977-09-05T00:00:00Z').getTime()) / (86400000 * 365); return { x: p * 4.5, y: p * 2.5, z: p * -3 }; }
    },
    {
        id: 'Voyager_2', nameKo: '보이저 2호', color: 0xff4400, layer: 'spacecraft',
        launchDate: new Date('1977-08-20T00:00:00Z').getTime(), landDate: new Date('2050-01-01T00:00:00Z').getTime(),
        calcPos: (t) => { let p = (t - new Date('1977-08-20T00:00:00Z').getTime()) / (86400000 * 365); return { x: p * 5, y: p * -1, z: p * 3 }; }
    }
];

let masterTimeline = [
    { date: '1957-10-04T12:00:00Z', type: 'human', targetSystem: 'Earth', title: '스푸트니크 1호 발사', desc: '인류 최초의 인공위성 (소련).' },
    { date: '1961-04-12T09:07:00Z', type: 'human', targetSystem: 'Earth', title: '유리 가가린 우주비행', desc: '보스토크 1호 탑승, 인류 최초의 우주 비행사.' },
    { date: '1969-07-20T20:17:00Z', type: 'human', targetSystem: 'Moon', title: '아폴로 11호 달 착륙', desc: '닐 암스트롱과 버즈 올드린, 고요의 바다 착륙.' },
    { date: '1970-04-13T00:00:00Z', type: 'human', targetSystem: 'Moon', title: '아폴로 13호 사고', desc: '산소 탱크 폭발 후 무사 귀환.' },
    { date: '1973-12-03T00:00:00Z', type: 'human', targetSystem: 'Jupiter', title: '파이오니어 10호 목성 근접', desc: '최초의 목성 플라이바이.' },
    { date: '1976-07-20T00:00:00Z', type: 'human', targetSystem: 'Mars', title: '바이킹 1호 화성 착륙', desc: '최초의 성공적인 화성 표면 착륙.' },
    { date: '1977-08-20T00:00:00Z', type: 'human', targetSystem: 'Voyager_2', title: '보이저 2호 발사', desc: '거대 가스 행성 탐사 미션 시작.' },
    { date: '1977-09-05T00:00:00Z', type: 'human', targetSystem: 'Voyager_1', title: '보이저 1호 발사', desc: '성간 거리를 향한 끝없는 여정.' },
    { date: '1986-01-24T00:00:00Z', type: 'human', targetSystem: 'Uranus', title: '보이저 2호 천왕성 접근', desc: '최초이자 유일한 천왕성 근접 비행.' },
    { date: '1986-02-09T00:00:00Z', type: 'natural', targetSystem: 'Halley_Comet', title: '핼리 혜성 근일점', desc: '가장 최근에 태양에 근접했던 핼리 혜성.' },
    { date: '1989-08-25T00:00:00Z', type: 'human', targetSystem: 'Neptune', title: '보이저 2호 해왕성 접근', desc: '태양계 최외곽 행성 탐사 완료.' },
    { date: '1990-04-24T00:00:00Z', type: 'human', targetSystem: 'Earth', title: '허블 우주 망원경 발사', desc: '디스커버리 에 의해 궤도 진입.' },
    { date: '1994-07-16T00:00:00Z', type: 'natural', targetSystem: 'Jupiter', title: '슈메이커-레비 9 혜성 충돌', desc: '목성에 거대한 혜성 조각들이 연달아 충돌함.' },
    { date: '1997-07-04T00:00:00Z', type: 'human', targetSystem: 'Mars', title: '마스 패스파인더 착륙', desc: '최초의 화성 로버 소저너 활동 시작.' },
    { date: '1998-11-20T00:00:00Z', type: 'human', targetSystem: 'ISS', title: '국제우주정거장(ISS) 조립 시작', desc: '자리야 모듈 발사.' },
    { date: '2004-01-04T00:00:00Z', type: 'human', targetSystem: 'Mars', title: '스피릿 로버 화성 착륙', desc: '화성 탐사 로버 미션(MER) 첫 주자.' },
    { date: '2004-07-01T00:00:00Z', type: 'human', targetSystem: 'Saturn', title: '카시니-하위헌스 토성 진입', desc: '토성 궤도 진입 및 심층 관측 시작.' },
    { date: '2012-08-06T00:00:00Z', type: 'human', targetSystem: 'Mars', title: '큐리오시티 로버 착륙', desc: '게일 분화구에 원자력 추진 로버 착륙.' },
    { date: '2015-07-14T00:00:00Z', type: 'human', targetSystem: 'Sun', title: '뉴 호라이즌스 명왕성 접근', desc: '왜소행성의 선명한 그림자 포착.' },
    { date: '2017-08-21T18:00:00Z', type: 'natural', targetSystem: 'Earth', title: '북미 대륙 거대 일식', desc: '미국 전역을 가로지른 개기 일식 현상.' },
    { date: '2021-02-18T00:00:00Z', type: 'human', targetSystem: 'Mars', title: '퍼서비어런스 화성 착륙', desc: '인제뉴어티 헬리콥터 동반 성공 착륙.' },
    { date: '2021-12-25T00:00:00Z', type: 'human', targetSystem: 'Earth', title: '제임스 웹 우주 망원경 발사', desc: '아리안 5 로켓, L2 라그랑주 점을 향해 출발.' },
    { date: '2022-11-16T00:00:00Z', type: 'human', targetSystem: 'Moon', title: '아르테미스 1호 발사', desc: 'SLS 로켓 무인 달 궤도 비행 테스트.' },
    { date: '2024-04-08T18:17:00Z', type: 'natural', targetSystem: 'Earth', title: '개기 일식 (북미)', desc: '2024년 달의 완전한 그림자 관측.' },
    { date: '2025-11-20T00:00:00Z', type: 'human', targetSystem: 'Moon', title: '아르테미스 2호 (예정)', desc: '유인 우주선 달 궤도 플라이바이 귀환 유력.' },
    { date: '2026-08-12T00:00:00Z', type: 'natural', targetSystem: 'Earth', title: '개기 일식 (아이슬란드/스페인)', desc: '유럽 대륙을 강타할 일광 차단 현상.' },
    { date: '2027-08-02T00:00:00Z', type: 'natural', targetSystem: 'Earth', title: '개기 일식 (북아프리카)', desc: '역대 최장 시간에 이르는 사하라 개기 일식.' },
    { date: '2029-04-13T00:00:00Z', type: 'natural', targetSystem: 'Earth', title: '소행성 아포피스 근접 비행', desc: '직경 340m 소행성이 지구에 매우 근접.' },
    { date: '2030-01-01T00:00:00Z', type: 'human', targetSystem: 'Mars', title: '마스 샘플 리턴 (예정)', desc: '화성의 토양 물질을 지구로 가져오는 미션 추진 중.' }
];

// --- Bootstrapping --- //
async function bootstrap() {
    await fetchISSTle();
    init3DScene();
    setupUI();
    renderTimeline();
    animate(0);
}
bootstrap();

async function fetchISSTle() {
    const staticIssTLE = `ISS (ZARYA)
1 25544U 98067A   23297.52500000  .00010000  00000-0  18625-3 0  9997
2 25544  51.6429 276.5414 0005726  50.9620 309.1869 15.50020164421882`;
    
    try {
        const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle');
        if(res.ok) {
            const data = await res.text();
            const lines = data.split('\n');
            if(lines.length >= 3 && window.satellite) {
                issSatRec = satellite.twoline2satrec(lines[1].trim(), lines[2].trim());
                return;
            }
        }
        throw new Error('Fallback trigger');
    } catch (e) {
        console.log('[TLE] Network or parse failed. Injecting robust static fallback TLE.');
        const lines = staticIssTLE.split('\n');
        issSatRec = satellite.twoline2satrec(lines[1].trim(), lines[2].trim());
    }
}

// --- Space Engine Init --- //
function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000002);

    Object.values(layers).forEach(group => scene.add(group));
    createStarfield();

    // FIXED: Added logarithmicDepthBuffer to resolve Z-fighting
    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // FIXED: Ensured direct Canvas DOM object blocks touch-action panning scrolling
    renderer.domElement.style.touchAction = 'none';
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 40000);
    camera.position.set(0, 150, 300);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02); 
    scene.add(ambientLight);

    sunLight = new THREE.PointLight(0xffeedd, 3, 10000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    const sunGeo = new THREE.SphereGeometry(15, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffddaa });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { nameEn: 'Sun', nameKo: '태양', temp: '5,500°C', rotPeriod: '27일' };
    scene.add(sunMesh);
    interactiveMeshes.push(sunMesh); // ONLY push interactable meshes

    Object.keys(planetsData).forEach(name => {
        let data = planetsData[name];
        
        let visualRadius = Math.max(0.5, Math.log10(data.radius * 10)) * PLANET_SCALE;
        if(data.isArtificial || data.isComet) visualRadius = data.radius * PLANET_SCALE;

        let matOptions = { color: data.color, roughness: 0.8, metalness: 0.05 };
        if(data.isArtificial || data.isComet) matOptions.emissive = data.color, matOptions.emissiveIntensity = 0.5;

        let geo = new THREE.SphereGeometry(visualRadius, 32, 32);
        let mat = new THREE.MeshStandardMaterial(matOptions);
        
        let mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { 
            nameEn: name, nameKo: data.nameKo, temp: data.temp, rotPeriod: data.rotPeriod, 
            period: data.period
        };

        layers[data.layer].add(mesh);
        interactiveMeshes.push(mesh); // STRICT Raycaster whitelist
        planetMeshes[name] = mesh;

        if (data.hasRings) {
            let ringGeo = new THREE.RingGeometry(visualRadius * 1.3, visualRadius * 2.2, 64);
            let ringMat = new THREE.MeshStandardMaterial({ color: 0xcfcba9, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
            let ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2 + 0.47; 
            ringMesh.castShadow = true; ringMesh.receiveShadow = true;
            mesh.add(ringMesh);
        }

        if (data.moons) {
            mesh.userData.moonMeshes = [];
            data.moons.forEach(moon => {
                let mGeo = new THREE.SphereGeometry(moon.radius * PLANET_SCALE, 16, 16);
                let mMat = new THREE.MeshStandardMaterial({ color: moon.color });
                let mMesh = new THREE.Mesh(mGeo, mMat);
                mMesh.castShadow = true; mMesh.receiveShadow = true;
                mMesh.userData = { nameEn: 'Moon', nameKo: moon.nameKo, temp: moon.temp, rotPeriod: moon.rotPeriod };
                
                layers.moons.add(mMesh);
                interactiveMeshes.push(mMesh); // STRICT Raycaster whitelist
                mesh.userData.moonMeshes.push(mMesh);
                drawMoonOrbitLine(moon, mesh);
            });
        }
        drawOrbitPath(name, data);
    });

    spacecraftMissions.forEach(mission => {
        let geo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        let mat = new THREE.MeshStandardMaterial({ color: mission.color, emissive: mission.color, emissiveIntensity: 0.6 });
        let mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { nameEn: mission.id, nameKo: mission.nameKo, temp: 'N/A', rotPeriod: 'N/A' };
        layers.spacecraft.add(mesh);
        interactiveMeshes.push(mesh); // STRICT Raycaster whitelist
        mission.meshRef = mesh;
    });

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 15000;
    controls.minDistance = 2;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    window.addEventListener('resize', onWindowResize);
    // Raycaster listeners
    renderer.domElement.addEventListener('pointerdown', onPointerMove);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
}

function createStarfield() {
    const starsGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(8000 * 3);
    for(let i = 0; i < posArray.length; i++) posArray[i] = (Math.random() - 0.5) * 10000;
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, opacity: 0.4 })));
}

function drawOrbitPath(name, data) {
    const points = [];
    for(let i = 0; i <= 360; i++) points.push(calculateKeplerianPosition(data, i * (data.period / 360)));
    let pathOptions = { color: 0x445566, transparent: true, opacity: 0.3 };
    let material;
    if (data.isComet || data.isArtificial) {
        pathOptions.color = data.color;
        pathOptions.dashSize = 5; pathOptions.gapSize = 3; pathOptions.opacity = 0.8;
        material = new THREE.LineDashedMaterial(pathOptions);
    } else material = new THREE.LineBasicMaterial(pathOptions);

    const orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    if (data.isComet || data.isArtificial) orbitLine.computeLineDistances();
    // Do NOT push OrbitLine to interactiveMeshes arrays
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
    parentMesh.add(line);
}

// --- UI Logic --- //
function setupUI() {
    const btnPaw = document.getElementById('btn-pause');
    const btnRew = document.getElementById('btn-rewind');
    const btnFwd = document.getElementById('btn-fastforward');
    
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
    updateSpeedLabel();

    const handleDate = (e) => {
        const parsed = new Date(e.target.value);
        // FIXED: NaN Prevention via Strict Validation
        if (!isNaN(parsed.getTime())) {
            simulationDate = parsed;
        } else {
            // Revert safely to current simulation bounds if typed absurdly
            e.target.value = simulationDate.toISOString().split('T')[0];
        }
    };
    document.getElementById('date-picker')?.addEventListener('change', handleDate);

    const tlBtn = document.getElementById('toggle-timeline');
    const tlPanel = document.getElementById('timeline-panel');
    tlBtn?.addEventListener('click', () => {
        tlPanel.classList.toggle('collapsed');
        tlBtn.textContent = tlPanel.classList.contains('collapsed') ? '▲' : '▼';
    });

    const checks = {
        'toggle-orbits': 'orbits', 'toggle-moons': 'moons', 
        'toggle-planets': 'planets', 'toggle-spacecraft': 'spacecraft', 'toggle-iss': 'iss'
    };
    for (let id in checks) {
        let el = document.getElementById(id);
        if(el) el.addEventListener('change', (e) => layers[checks[id]].visible = e.target.checked);
    }

    const scaleToggle = document.getElementById('toggle-real-scale');
    if(scaleToggle) scaleToggle.addEventListener('change', (e) => {
        isRealisticScale = e.target.checked;
        PLANET_SCALE = isRealisticScale ? 0.3 : 1.5; 
        Object.values(planetMeshes).forEach(mesh => mesh.scale.set(PLANET_SCALE/1.5, PLANET_SCALE/1.5, PLANET_SCALE/1.5));
    });

    document.getElementById('filter-natural')?.addEventListener('change', renderTimeline);
    document.getElementById('filter-human')?.addEventListener('change', renderTimeline);
}

function updateSpeedLabel() {
    document.querySelector('.speed-label').textContent = `x${speedArray[currentSpeedIndex]}`;
}

function renderTimeline() {
    masterTimeline.sort((a,b) => new Date(a.date) - new Date(b.date));
    const list = document.getElementById('events-list');
    if(!list) return;
    list.innerHTML = ''; 

    const showNat = document.getElementById('filter-natural')?.checked;
    const showHum = document.getElementById('filter-human')?.checked;

    masterTimeline.forEach((ev) => {
        if (ev.type === 'natural' && !showNat) return;
        if (ev.type === 'human' && !showHum) return;

        const d = new Date(ev.date);
        const el = document.createElement('div');
        el.className = 'event-card';
        el.setAttribute('data-type', ev.type);
        el.innerHTML = `<div class="event-title">${ev.title}</div><div class="event-date">${d.toLocaleDateString('ko-KR')}</div>`;

        el.addEventListener('click', () => {
             simulationDate = d;
             updateBottomHUD();
             focusCameraOnEvent(ev);
        });
        list.appendChild(el);
    });
}

function focusCameraOnEvent(event) {
    if(!event.targetSystem) return;
    
    let targetObj = planetMeshes[event.targetSystem];
    if(event.targetSystem === 'Sun') targetObj = sunMesh;
    if(!targetObj) targetObj = spacecraftMissions.find(m => m.id === event.targetSystem)?.meshRef;
    if(!targetObj) return;

    const targetPos = new THREE.Vector3();
    targetObj.getWorldPosition(targetPos);

    let baseDist = (targetObj.geometry && targetObj.geometry.boundingSphere) ? targetObj.geometry.boundingSphere.radius * targetObj.scale.x : 5;
    let cameraOffset = new THREE.Vector3(targetPos.x + baseDist * 4, Math.max(10, targetPos.y + baseDist * 2), targetPos.z + baseDist * 5);

    new TWEEN.Tween(camera.position).to(cameraOffset, 2000).easing(TWEEN.Easing.Cubic.InOut).start();
    new TWEEN.Tween(controls.target).to(targetPos, 2000).easing(TWEEN.Easing.Cubic.InOut).start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// FIXED: Exact bounding client rect constraints and strict array checking
function onPointerMove(event) {
    if(!renderer || !renderer.domElement) return;

    let targetClientX = event.clientX; 
    let targetClientY = event.clientY;
    if(event.changedTouches && event.changedTouches.length>0) {
        targetClientX = event.changedTouches[0].clientX; 
        targetClientY = event.changedTouches[0].clientY;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ( ( targetClientX - rect.left ) / rect.width ) * 2 - 1;
    mouse.y = - ( ( targetClientY - rect.top ) / rect.height ) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // STRICT FIX: Apply raycasting ONLY to the explicitly registered meshes (no orbit lines/lights)
    const intersects = raycaster.intersectObjects(interactiveMeshes, false);

    if (intersects.length > 0) {
        // Safe check for actual visibility 
        let hit = intersects.find(hit => hit.object.visible);
        if(hit) {
            document.body.style.cursor = 'pointer';
            activeTooltipObject = hit.object; 
            
            let data = activeTooltipObject.userData;
            document.getElementById('tt-name-en').textContent = data.nameEn || '';
            document.getElementById('tt-name-ko').textContent = data.nameKo || '';
            document.getElementById('tt-temp').textContent = data.temp || '-';
            document.getElementById('tt-period').textContent = data.period ? `${data.period.toFixed(1)}일` : 'N/A';
            document.getElementById('tt-rotation').textContent = data.rotPeriod || '-';
            
            document.getElementById('hover-tooltip').classList.remove('hidden');
            return;
        }
    } 
    document.body.style.cursor = 'default';
    document.getElementById('hover-tooltip').classList.add('hidden');
    activeTooltipObject = null;
}

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

function updateBottomHUD() {
    const isoStr = simulationDate.toISOString().split('T')[0];
    document.getElementById('current-date').textContent = simulationDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const pickerD = document.getElementById('date-picker');
    if (pickerD && document.activeElement !== pickerD) pickerD.value = isoStr;
}

// ------------------------------------------------ //
// --- Main Render & Physics Logic --- //
// ------------------------------------------------ //
function animate(time) {
    if(!scene) return;
    requestAnimationFrame(animate);
    TWEEN.update(time);

    let deltaTimeSec = (time - lastTime) / 1000.0; 
    lastTime = time;
    if(deltaTimeSec > 0.1) deltaTimeSec = 0.1; 

    if (!isPaused) {
        const baseSpeedMsPerSec = 86400000; 
        const multiplier = speedArray[currentSpeedIndex]; 
        let msToAdd = deltaTimeSec * baseSpeedMsPerSec * multiplier;
        simulationDate.setTime(simulationDate.getTime() + msToAdd);
    }

    const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
    let epochDays = (simulationDate.getTime() - J2000) / 86400000;

    Object.keys(planetsData).forEach(name => {
        const data = planetsData[name];
        if (name === 'ISS' && issSatRec && window.satellite) {
            const positionAndVelocity = satellite.propagate(issSatRec, simulationDate);
            if (positionAndVelocity.position) {
                const gmst = satellite.gstime(simulationDate);
                const pos = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
                const earthPos = calculateKeplerianPosition(planetsData['Earth'], epochDays);
                let altitudeAu = (pos.height / 149597870.7) * 2000; 
                let offsetZ = Math.cos(pos.latitude) * Math.cos(pos.longitude) * altitudeAu * AU_TO_UNITS * PLANET_SCALE;
                let offsetX = Math.cos(pos.latitude) * Math.sin(pos.longitude) * altitudeAu * AU_TO_UNITS * PLANET_SCALE;
                let offsetY = Math.sin(pos.latitude) * altitudeAu * AU_TO_UNITS * PLANET_SCALE;
                planetMeshes['ISS'].position.set(earthPos.x + offsetX, earthPos.y + offsetY, earthPos.z + offsetZ);
            }
        } else {
            let pos = calculateKeplerianPosition(data, epochDays);
            let pMesh = planetMeshes[name];
            if (pMesh) {
                pMesh.position.copy(pos);
                pMesh.rotation.y += 0.02; 
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

    if (activeTooltipObject) {
        let vec = new THREE.Vector3();
        activeTooltipObject.getWorldPosition(vec);
        vec.project(camera); 

        const tooltip = document.getElementById('hover-tooltip');
        // Hide if behind camera or object itself is hidden via layers toggle
        if (vec.z > 1.0 || !activeTooltipObject.visible) {
            tooltip.classList.add('hidden');
        } else {
            tooltip.classList.remove('hidden');
            let x = (vec.x *  .5 + .5) * window.innerWidth;
            let y = (vec.y * -.5 + .5) * window.innerHeight;
            tooltip.style.transform = `translate(${x + 20}px, ${y - 20}px)`;
        }
    }

    updateBottomHUD();
    controls.update();
    renderer.render(scene, camera);
}
