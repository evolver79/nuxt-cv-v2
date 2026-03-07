<script setup lang="ts">
const props = defineProps<{ active: boolean }>()
const emit = defineEmits<{ close: [] }>()

const container = ref<HTMLElement>()
const loading = ref(false)
const loadPercent = ref(0)

const c64Colors = ['#000', '#fff', '#880000', '#aaffee', '#cc44cc', '#00cc55', '#0000aa', '#eeee77', '#dd8855', '#664400', '#ff7777', '#333', '#777', '#aaff66', '#0088ff', '#bbb']

async function startDemo() {
  const el = container.value
  if (!el) return

  loading.value = true
  loadPercent.value = 0

  let current = 0
  const loadInterval = setInterval(() => {
    const jump = Math.random() * 8 + 1
    current = Math.min(current + jump, 88)
    loadPercent.value = Math.floor(current)
  }, 100)

  const audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') await audioCtx.resume()

  const THREE = await import('three')

  clearInterval(loadInterval)
  while (current < 100) {
    current = Math.min(current + 6, 100)
    loadPercent.value = Math.floor(current)
    await new Promise((r) => setTimeout(r, 25))
  }
  await new Promise((r) => setTimeout(r, 300))
  loading.value = false

  // ============================================================
  // RENDERER
  // ============================================================
  const LO_BASE = 320
  const aspect = window.innerWidth / window.innerHeight
  let LO_W = aspect >= 1 ? Math.round(LO_BASE * aspect) : LO_BASE
  let LO_H = aspect >= 1 ? LO_BASE : Math.round(LO_BASE / aspect)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100)
  camera.position.z = window.innerWidth < 768 ? 10 : 8

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
  renderer.setSize(LO_W, LO_H)
  renderer.setPixelRatio(1)
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = false
  el.prepend(renderer.domElement)
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated'

  // ============================================================
  // BLOB BACKGROUND (fragment shader)
  // ============================================================
  const blobScene = new THREE.Scene()
  const blobCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
  const blobMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(LO_W, LO_H) },
      uIntensity: { value: 0.0 },
      uBump: { value: 0.0 },
      uSaturation: { value: 0.0 },
      uHueShift: { value: 0.0 },
      uChroma: { value: 0.0 },
    },
    vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uIntensity;
      uniform float uBump;
      uniform float uSaturation;
      uniform float uHueShift;
      uniform float uChroma;

      vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
      float snoise(vec2 v){
        const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
        vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
        vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
        vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
        vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
        vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
        m=m*m;m=m*m;
        vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 a0=x-floor(x+0.5);
        m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
        vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
        return 130.0*dot(m,g);
      }
      float fbm(vec2 p,float t){
        float f=0.0;
        f+=0.5*snoise(p+vec2(0.0,t*0.4));
        f+=0.25*snoise(p*2.0+vec2(0.0,t*0.6));
        f+=0.125*snoise(p*4.0+vec2(0.0,t*0.8));
        f+=0.0625*snoise(p*8.0+vec2(0.0,t*1.2));
        return f;
      }

      // Classic demoscene tunnel
      vec3 tunnel(vec2 uv, float t) {
        vec2 p = uv - 0.5;
        p.x *= uResolution.x / uResolution.y;

        // Polar coordinates
        float angle = atan(p.y, p.x);
        float radius = length(p);

        // Tunnel mapping — inverse radius for depth
        float depth = 0.5 / (radius + 0.001);

        // Sine distortion for organic twisting
        float twist = sin(depth * 0.3 + t * 2.0) * 0.5;
        float warp = sin(angle * 3.0 + t * 1.5) * 0.1 * (1.0 + uBump * 0.5);
        angle += twist + warp;

        // Texture coordinates scrolling through tunnel
        float tx = angle / 3.14159;
        float ty = depth + t * 3.0;

        // Concentric ring pattern
        float rings = sin(ty * 8.0) * 0.5 + 0.5;
        rings *= sin(tx * 6.0 + ty * 2.0) * 0.5 + 0.5;

        // Color bands — shifting hues, saturation driven by uniform
        float hue = fract(tx * 0.5 + ty * 0.1 + t * 0.1 + uHueShift);
        float sat = uSaturation * (0.7 + rings * 0.3);
        float val = rings * (0.2 + uSaturation * 0.3) + 0.05 + uSaturation * 0.05;

        // HSV to RGB
        vec3 c = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        vec3 col = val * mix(vec3(1.0), c, sat);

        // Glow in center (where torus sits)
        float centerGlow = exp(-radius * 3.0) * 0.3;
        col += vec3(0.0, 0.15, 0.25) * centerGlow;

        // Depth fog — darker at edges
        col *= smoothstep(0.0, 0.15, radius);
        // Beat pulse — flash the rings
        col *= 1.0 + uBump * 0.4;

        return col;
      }

      vec3 getScene(vec2 uv) {
        float t = uTime * 0.5;
        // Flame
        vec2 q = vec2(fbm(uv * 2.0, t), fbm(uv * 2.0 + vec2(5.2, 1.3), t));
        vec2 r = vec2(fbm(uv * 2.0 + 4.0 * q + vec2(1.7, 9.2), t), fbm(uv * 2.0 + 4.0 * q + vec2(8.3, 2.8), t));
        float f = fbm(uv * 2.0 + 4.0 * r, t);
        f += (1.0 - uv.y) * 0.6;

        vec3 flame = vec3(0.01, 0.01, 0.02);
        float smoke = smoothstep(0.2, 0.8, f);
        flame = mix(flame, mix(vec3(0.06, 0.06, 0.08), vec3(0.04, 0.02, 0.12), uSaturation), smoke * 0.6);
        float hot = smoothstep(0.6, 1.2, f);
        flame = mix(flame, mix(vec3(0.12, 0.12, 0.14), vec3(0.0, 0.15, 0.25), uSaturation), hot * 0.5);
        float tips = smoothstep(0.9, 1.4, f);
        flame = mix(flame, mix(vec3(0.18, 0.18, 0.2), vec3(0.0, 0.3, 0.4), uSaturation), tips * 0.4);
        float ember = smoothstep(1.1, 1.6, f);
        flame += mix(vec3(0.1, 0.08, 0.12), vec3(0.15, 0.06, 0.3), uSaturation) * ember * 0.3;
        vec2 vc = uv - 0.5;
        flame *= 1.0 - dot(vc, vc) * 0.8;

        // Tunnel
        vec3 tun = tunnel(uv, uTime);
        return mix(flame, tun, uIntensity);
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / uResolution;

        // Chromatic aberration — offset R and B channels from center
        vec2 dir = uv - 0.5;
        float chromaAmt = uChroma * (0.004 + length(dir) * 0.012);
        vec2 uvR = uv + dir * chromaAmt;
        vec2 uvB = uv - dir * chromaAmt;

        vec3 col;
        col.r = getScene(uvR).r;
        col.g = getScene(uv).g;
        col.b = getScene(uvB).b;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthWrite: false,
  })
  blobScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blobMaterial))

  // ============================================================
  // 3D MODELS — cycle through geometries on every 4th beat
  // ============================================================
  const geometries = [
    { hi: new THREE.TorusGeometry(1.2, 0.5, 64, 128), lo: new THREE.TorusGeometry(1.2, 0.5, 24, 48) },
    { hi: new THREE.IcosahedronGeometry(1.3, 1), lo: new THREE.IcosahedronGeometry(1.3, 0) },
    { hi: new THREE.TorusKnotGeometry(0.9, 0.35, 128, 32), lo: new THREE.TorusKnotGeometry(0.9, 0.35, 48, 12) },
    { hi: new THREE.OctahedronGeometry(1.3, 2), lo: new THREE.OctahedronGeometry(1.3, 1) },
    { hi: new THREE.DodecahedronGeometry(1.2, 1), lo: new THREE.DodecahedronGeometry(1.2, 0) },
  ]
  let geoIdx = 0

  const torusMat = new THREE.MeshPhongMaterial({ color: 0x667788, specular: 0x556677, shininess: 120, emissive: 0x080810, transparent: true, opacity: 1.0 })
  const torus = new THREE.Mesh(geometries[0].hi, torusMat)
  scene.add(torus)

  const wireframes: THREE.Mesh[] = []
  const wireMats: THREE.MeshBasicMaterial[] = []
  const lags = [0.3, 0.6, 0.9, 1.2]
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x556677, wireframe: true, transparent: true, opacity: 0.08 - i * 0.01 })
    const wf = new THREE.Mesh(geometries[0].lo, mat)
    scene.add(wf)
    wireframes.push(wf)
    wireMats.push(mat)
  }

  function swapGeometry() {
    geoIdx = (geoIdx + 1) % geometries.length
    torus.geometry = geometries[geoIdx].hi
    wireframes.forEach((wf) => { wf.geometry = geometries[geoIdx].lo })
  }

  // ============================================================
  // WIREFRAME CITY (phase 5)
  // ============================================================
  const cityGroup = new THREE.Group()
  cityGroup.visible = false
  scene.add(cityGroup)

  const cityBarMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true, transparent: true, opacity: 0.3 })
  const cityGridSize = 12
  const citySpacing = 1.2
  const cityBars: THREE.Mesh[] = []
  const cityBarGeo = new THREE.BoxGeometry(0.8, 1, 0.8)
  for (let x = 0; x < cityGridSize; x++) {
    for (let z = 0; z < cityGridSize; z++) {
      const bar = new THREE.Mesh(cityBarGeo, cityBarMat.clone())
      bar.position.x = (x - cityGridSize / 2) * citySpacing
      bar.position.z = (z - cityGridSize / 2) * citySpacing
      bar.position.y = 0
      cityGroup.add(bar)
      cityBars.push(bar)
    }
  }

  // Ground grid
  const gridHelper = new THREE.GridHelper(cityGridSize * citySpacing, cityGridSize, 0x004444, 0x003333)
  gridHelper.position.y = -0.5
  cityGroup.add(gridHelper)

  // ============================================================
  // LIGHTS
  // ============================================================
  const light1 = new THREE.PointLight(0x00ccff, 60, 20)
  light1.position.set(3, 2, 4)
  scene.add(light1)
  const light2 = new THREE.PointLight(0xff44cc, 50, 20)
  light2.position.set(-3, -1, 3)
  scene.add(light2)
  const light3 = new THREE.PointLight(0xffaa00, 30, 20)
  light3.position.set(0, 3, -2)
  scene.add(light3)
  scene.add(new THREE.AmbientLight(0x0c0818))

  // ============================================================
  // AUDIO ENGINE
  // ============================================================
  const masterGain = audioCtx.createGain()
  masterGain.gain.value = 0.4
  masterGain.connect(audioCtx.destination)

  // Drone pad (continuous)
  const padNotes = [55, 82.41, 110, 146.83]
  const padOscs: OscillatorNode[] = []
  const padGain = audioCtx.createGain()
  padGain.gain.value = 0.06
  const padFilter = audioCtx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 400
  padFilter.Q.value = 2
  padGain.connect(padFilter)
  padFilter.connect(masterGain)
  for (const freq of padNotes) {
    const osc = audioCtx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    osc.detune.value = (Math.random() - 0.5) * 12
    osc.connect(padGain)
    osc.start()
    padOscs.push(osc)
  }

  // Noise texture (continuous)
  const noiseLen = audioCtx.sampleRate * 2
  const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1
  const noiseNode = audioCtx.createBufferSource()
  noiseNode.buffer = noiseBuf
  noiseNode.loop = true
  const noiseFilter = audioCtx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 2000
  noiseFilter.Q.value = 0.5
  const noiseGain = audioCtx.createGain()
  noiseGain.gain.value = 0.008
  noiseNode.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(masterGain)
  noiseNode.start()

  // Rising sweep oscillator (buildup)
  const sweepOsc = audioCtx.createOscillator()
  const sweepGain = audioCtx.createGain()
  const sweepFilter = audioCtx.createBiquadFilter()
  sweepOsc.type = 'sawtooth'
  sweepOsc.frequency.value = 55
  sweepFilter.type = 'lowpass'
  sweepFilter.frequency.value = 200
  sweepFilter.Q.value = 8
  sweepGain.gain.value = 0
  sweepOsc.connect(sweepFilter)
  sweepFilter.connect(sweepGain)
  sweepGain.connect(masterGain)
  sweepOsc.start()

  // Sub pulse
  function playSubPulse(time: number, vol: number) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.connect(gain)
    gain.connect(masterGain)
    osc.frequency.setValueAtTime(60, time)
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.4)
    gain.gain.setValueAtTime(vol, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6)
    osc.start(time)
    osc.stop(time + 0.6)
  }

  // Resonant ping
  const pingNotes = [440, 523.25, 659.25, 880, 1046.5, 783.99]
  let pingIdx = 0
  function playPing(time: number, vol: number) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const flt = audioCtx.createBiquadFilter()
    osc.type = 'sine'
    flt.type = 'bandpass'
    flt.frequency.value = pingNotes[pingIdx++ % pingNotes.length]
    flt.Q.value = 15
    osc.frequency.value = flt.frequency.value
    osc.connect(flt)
    flt.connect(gain)
    gain.connect(masterGain)
    gain.gain.setValueAtTime(vol, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8)
    osc.start(time)
    osc.stop(time + 0.8)
  }

  // Kick (drop phase) — punchier
  function playKick(time: number) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(masterGain)
    osc.frequency.setValueAtTime(180, time)
    osc.frequency.exponentialRampToValueAtTime(28, time + 0.15)
    gain.gain.setValueAtTime(1.0, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35)
    osc.start(time)
    osc.stop(time + 0.35)
  }

  // Hihat (drop phase) — pre-created noise buffer
  const hihatSz = audioCtx.sampleRate * 0.05
  const hihatBuf = audioCtx.createBuffer(1, hihatSz, audioCtx.sampleRate)
  const hihatData = hihatBuf.getChannelData(0)
  for (let i = 0; i < hihatSz; i++) hihatData[i] = Math.random() * 2 - 1

  function playHihat(time: number, accent: boolean) {
    const src = audioCtx.createBufferSource()
    src.buffer = hihatBuf
    const flt = audioCtx.createBiquadFilter()
    flt.type = 'highpass'
    flt.frequency.value = 8000
    const gain = audioCtx.createGain()
    gain.gain.setValueAtTime(accent ? 0.25 : 0.1, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
    src.connect(flt)
    flt.connect(gain)
    gain.connect(masterGain)
    src.start(time)
    src.stop(time + 0.06)
  }

  // Acid bass (drop phase) — more resonance, wider range, funkier pattern
  const acidNotes = [55, 55, 82.41, 55, 73.42, 98, 61.74, 110]
  function playAcid(time: number, beatInBar: number) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const flt = audioCtx.createBiquadFilter()
    osc.type = 'sawtooth'
    flt.type = 'lowpass'
    // Accent every other beat with higher cutoff
    const accent = beatInBar % 2 === 0
    flt.frequency.setValueAtTime(accent ? 2000 : 1200, time)
    flt.frequency.exponentialRampToValueAtTime(150, time + 0.18)
    flt.Q.value = 18
    osc.frequency.value = acidNotes[beatInBar % acidNotes.length]
    // Slide on certain beats
    if (beatInBar === 2 || beatInBar === 6) {
      osc.frequency.setValueAtTime(acidNotes[beatInBar % acidNotes.length], time)
      osc.frequency.exponentialRampToValueAtTime(acidNotes[(beatInBar + 1) % acidNotes.length], time + 0.1)
    }
    osc.connect(flt)
    flt.connect(gain)
    gain.connect(masterGain)
    gain.gain.setValueAtTime(accent ? 0.18 : 0.12, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25)
    osc.start(time)
    osc.stop(time + 0.25)
  }

  // ============================================================
  // PHASE TIMING
  // ============================================================
  // Phase order: CITY → INTRO → BUILDUP → DROP → MELTDOWN → VOID (fade & close)
  const CITY_END = 15
  const INTRO_END = 30
  const BUILDUP_END = 45
  const DROP_END = 65
  const MELTDOWN_END = 80
  const bpm = 130
  const beatInterval = 60 / bpm
  let audioNextBeat = audioCtx.currentTime + 0.05
  let audioBeatCount = 0
  let audioStartTime = audioCtx.currentTime

  function getPhase(t: number): number {
    if (t < CITY_END) return 0    // city
    if (t < INTRO_END) return 1   // intro
    if (t < BUILDUP_END) return 2 // buildup
    if (t < DROP_END) return 3    // drop
    if (t < MELTDOWN_END) return 4 // meltdown
    return 5                       // void
  }

  function getPhaseProgress(t: number): number {
    if (t < CITY_END) return t / CITY_END
    if (t < INTRO_END) return (t - CITY_END) / (INTRO_END - CITY_END)
    if (t < BUILDUP_END) return (t - INTRO_END) / (BUILDUP_END - INTRO_END)
    if (t < DROP_END) return Math.min((t - BUILDUP_END) / 4, 1)
    if (t < MELTDOWN_END) return (t - DROP_END) / (MELTDOWN_END - DROP_END)
    return Math.min((t - MELTDOWN_END) / 4, 1)
  }

  function scheduleAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const now = audioCtx.currentTime
    const elapsed = now - audioStartTime
    const phase = getPhase(elapsed)
    const progress = getPhaseProgress(elapsed)

    // Pad filter & volume per phase (0=city, 1=intro, 2=buildup, 3=drop, 4=meltdown, 5=void)
    let padFreq = 400
    let padVol = 0.04
    if (phase === 0) { padFreq = 200 + progress * 200 + Math.sin(now * 0.1) * 50; padVol = 0.03 + progress * 0.03 }
    else if (phase === 1) { padFreq = 400 + progress * 200 + Math.sin(now * 0.15) * 100; padVol = 0.06 }
    else if (phase === 2) { padFreq = 600 + progress * 1400; padVol = 0.06 + progress * 0.06 }
    else if (phase === 3) { padFreq = 1200 + Math.sin(now * 0.2) * 400; padVol = 0.08 }
    else if (phase === 4) { padFreq = 800 + Math.sin(now * 0.8) * 600; padVol = 0.1 + progress * 0.04 }
    else { padFreq = 200 - progress * 100; padVol = 0.06 * (1 - progress * 0.8) }
    padFilter.frequency.setTargetAtTime(padFreq, now, 0.3)
    padGain.gain.setTargetAtTime(padVol, now, 0.3)

    // Noise per phase
    let noiseVol = 0.005
    let noiseSweep = 1500
    if (phase === 0) { noiseVol = 0.003 + progress * 0.005; noiseSweep = 1000 + progress * 1000 }
    else if (phase === 1) { noiseVol = 0.008; noiseSweep = 1500 + Math.sin(now * 0.2) * 1000 }
    else if (phase === 2) { noiseVol = 0.008 + progress * 0.025; noiseSweep = 2000 + progress * 6000 }
    else if (phase === 3) { noiseVol = 0.012; noiseSweep = 1500 + Math.sin(now * 0.2) * 1000 }
    else if (phase === 4) { noiseVol = 0.02 + progress * 0.03; noiseSweep = 3000 + Math.sin(now * 1.5) * 3000 }
    else { noiseVol = 0.015 * (1 - progress * 0.9); noiseSweep = 800 }
    noiseGain.gain.setTargetAtTime(noiseVol, now, 0.3)
    noiseFilter.frequency.setTargetAtTime(noiseSweep, now, 0.3)

    // Rising sweep: buildup + meltdown descending
    if (phase === 2) {
      sweepGain.gain.setTargetAtTime(0.04 + progress * 0.08, now, 0.2)
      sweepFilter.frequency.setTargetAtTime(200 + progress * 3000, now, 0.5)
      sweepOsc.frequency.setTargetAtTime(55 + progress * 165, now, 0.5)
    } else if (phase === 4) {
      sweepGain.gain.setTargetAtTime(0.06 + progress * 0.06, now, 0.2)
      sweepFilter.frequency.setTargetAtTime(3000 - progress * 2500, now, 0.5)
      sweepOsc.frequency.setTargetAtTime(220 - progress * 165, now, 0.5)
    } else {
      sweepGain.gain.setTargetAtTime(0, now, 0.3)
    }

    while (audioNextBeat < audioCtx.currentTime + 0.2) {
      const beatElapsed = audioNextBeat - audioStartTime
      const bp = getPhase(beatElapsed)
      const bpProgress = getPhaseProgress(beatElapsed)
      const beatInBar = audioBeatCount % 8

      if (bp === 0) {
        // CITY: building minimal techno
        if (progress > 0.3) playKick(audioNextBeat)
        if (progress > 0.5 && beatInBar % 2 === 0) playHihat(audioNextBeat, false)
        if (progress > 0.2 && (beatInBar === 0 || beatInBar === 3 || beatInBar === 6)) playPing(audioNextBeat, 0.03 + progress * 0.02)
        if (beatInBar % 4 === 0) playSubPulse(audioNextBeat, 0.2 + progress * 0.2)
      } else if (bp === 1) {
        // INTRO: sparse sub + pings
        if (beatInBar % 2 === 0) playSubPulse(audioNextBeat, 0.5)
        if (beatInBar === 0 || beatInBar === 5) playPing(audioNextBeat + Math.random() * 0.05, 0.06)
      } else if (bp === 2) {
        // BUILDUP
        playSubPulse(audioNextBeat, 0.6)
        if (beatInBar % 2 === 0) playPing(audioNextBeat, 0.08)
        if (bpProgress > 0.5 && beatInBar % 2 === 1) playSubPulse(audioNextBeat, 0.3)
      } else if (bp === 3) {
        // DROP: full beat
        playKick(audioNextBeat)
        playHihat(audioNextBeat, beatInBar % 2 === 1)
        playHihat(audioNextBeat + beatInterval * 0.5, false)
        playAcid(audioNextBeat, beatInBar)
        if (beatInBar === 0 || beatInBar === 4) playPing(audioNextBeat, 0.05)
      } else if (bp === 4) {
        // MELTDOWN: glitchy broken beat
        if (Math.random() > bpProgress * 0.4) playKick(audioNextBeat)
        if (Math.random() > 0.3) playHihat(audioNextBeat, Math.random() > 0.5)
        playAcid(audioNextBeat, Math.floor(Math.random() * 8))
        if (Math.random() > 0.6) playPing(audioNextBeat, 0.04 + Math.random() * 0.06)
      } else {
        // VOID: sparse, deep, fading
        if (beatInBar === 0) playSubPulse(audioNextBeat, 0.4 * (1 - bpProgress * 0.8))
        if (beatInBar === 4 && bpProgress < 0.7) playPing(audioNextBeat, 0.03)
      }

      audioNextBeat += beatInterval
      audioBeatCount++
    }
  }

  scheduleAudio()

  // ============================================================
  // HUD OVERLAY
  // ============================================================
  const hudCanvas = document.createElement('canvas')
  hudCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none'
  el.appendChild(hudCanvas)
  const hCtx = hudCanvas.getContext('2d')!
  hudCanvas.width = window.innerWidth
  hudCanvas.height = window.innerHeight

  // Pre-warm large font rasterization to avoid stall on first use
  // Must draw visible text at valid coordinates to force glyph rasterization
  hCtx.font = 'bold 48px "JetBrains Mono",monospace'
  hCtx.fillStyle = 'rgba(255,255,255,0.01)'
  hCtx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ ', 0, 50)
  hCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height)
  hCtx.font = '11px "JetBrains Mono",monospace'

  const onResize = () => {
    const a = window.innerWidth / window.innerHeight
    const w = a >= 1 ? Math.round(LO_BASE * a) : LO_BASE
    const h = a >= 1 ? LO_BASE : Math.round(LO_BASE / a)
    renderer.setSize(w, h)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = a
    camera.updateProjectionMatrix()
    blobMaterial.uniforms.uResolution.value.set(w, h)
    hudCanvas.width = window.innerWidth
    hudCanvas.height = window.innerHeight
  }
  window.addEventListener('resize', onResize)

  let beatCount = 0
  let glitchCount = 0
  let frameCount = 0
  let fps = 0
  let fpsAccum = 0
  let fpsTimer = 0
  const startTime = performance.now()

  let bump = 0
  let nextBeat = beatInterval
  let glitchIntensity = 0
  let glitchTimer = 0

  function triggerGlitch() {
    glitchIntensity = 0.6 + Math.random() * 0.6
    glitchTimer = 0.1 + Math.random() * 0.2
    glitchCount++
  }

  const phaseNames = ['CITY', 'INTRO', 'BUILDUP', 'DROP', 'MELTDOWN', 'VOID']

  function drawHud(w: number, h: number, t: number, phase: number, progress: number) {
    hCtx.clearRect(0, 0, w, h)

    // Glitch slices
    if (glitchTimer > 0) {
      const sliceCount = 3 + Math.floor(Math.random() * 8)
      for (let i = 0; i < sliceCount; i++) {
        const y = Math.floor(Math.random() * h)
        const sliceH = 2 + Math.floor(Math.random() * 20 * glitchIntensity)
        const offset = (Math.random() - 0.5) * 60 * glitchIntensity
        hCtx.fillStyle = `rgba(0,255,255,${0.08 * glitchIntensity})`
        hCtx.fillRect(offset, y, w, sliceH)
        hCtx.fillStyle = `rgba(255,68,204,${0.06 * glitchIntensity})`
        hCtx.fillRect(-offset, y, w, sliceH)
      }
    }

    // Scanlines
    hCtx.fillStyle = 'rgba(0,0,0,0.04)'
    for (let y = 0; y < h; y += 3) hCtx.fillRect(0, y, w, 1)

    const pad = 20
    const lineH = 16
    hCtx.font = '11px "JetBrains Mono",monospace'
    hCtx.textBaseline = 'top'

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)

    // HUD colors per phase
    const hudColors: Record<number, [string, string]> = {
      0: ['rgba(180,180,190,0.4)', 'rgba(160,160,170,0.35)'],
      1: ['rgba(100,200,220,0.5)', 'rgba(200,180,100,0.4)'],
      2: ['rgba(0,255,255,0.6)', 'rgba(255,170,0,0.5)'],
      3: ['rgba(255,50,50,0.6)', 'rgba(255,0,100,0.5)'],
      4: ['rgba(80,80,100,0.3)', 'rgba(60,60,80,0.25)'],
      5: ['rgba(0,255,200,0.5)', 'rgba(0,200,180,0.4)'],
    }
    const [hudLeft, hudRight] = hudColors[phase] || hudColors[0]

    // Left stats
    const statsLeft = [`FPS   ${fps}`, `TIME  ${elapsed}s`, `BPM   ${bpm}`, `BEAT  #${beatCount}`, `PHASE ${phaseNames[phase]}`]
    for (let i = 0; i < statsLeft.length; i++) {
      hCtx.fillStyle = hudLeft
      hCtx.fillText(statsLeft[i], pad, pad + i * lineH)
    }

    // Right stats
    const statsRight = [`WIRES  ${wireframes.length}`, `GLITCH #${glitchCount}`, `FRAMES ${frameCount}`]
    hCtx.textAlign = 'right'
    for (let i = 0; i < statsRight.length; i++) {
      hCtx.fillStyle = hudRight
      hCtx.fillText(statsRight[i], w - pad, 50 + i * lineH)
    }
    hCtx.textAlign = 'left'

    // Bottom stats
    hCtx.fillStyle = phase === 2 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'
    hCtx.fillText(`BUMP ${bump.toFixed(2)}`, pad, h - pad - lineH)

    hCtx.textAlign = 'right'
    hCtx.fillStyle = phase === 2 ? 'rgba(0,255,255,0.3)' : 'rgba(200,200,210,0.15)'
    hCtx.fillText('\u2591\u2592\u2593 DEMOSCENE GREETS \u2593\u2592\u2591', w - pad, h - pad)
    hCtx.textAlign = 'left'

    // Beat flash
    if (bump > 0.5) {
      const flashColor = phase === 4 ? `rgba(255,0,0,${bump * 0.1})` : phase === 5 ? `rgba(255,255,255,${bump * 0.02})` : `rgba(255,255,255,${bump * (phase === 3 ? 0.08 : 0.04)})`
      hCtx.fillStyle = flashColor
      hCtx.fillRect(0, 0, w, h)
    }

    // Meltdown: heavy scanline corruption
    if (phase === 4) {
      const corruptLines = Math.floor(progress * 15)
      for (let i = 0; i < corruptLines; i++) {
        const y = Math.floor(Math.random() * h)
        const sliceH = 1 + Math.floor(Math.random() * 6)
        hCtx.fillStyle = `rgba(255,0,0,${0.05 + Math.random() * 0.1})`
        hCtx.fillRect(0, y, w, sliceH)
      }
    }

    // Flash greets text on big beats (drop + meltdown)
    if ((phase === 3 || phase === 4) && bump > 0.7) {
      const greets = phase === 4
        ? ['SYSTEM OVERLOAD', 'FATAL ERROR', 'CORE MELTDOWN', 'NO ESCAPE', 'SIGNAL LOST']
        : ['RESPECT', 'KEEP CODING', 'LONG LIVE THE SCENE', 'NO SLEEP', 'GREETS TO ALL']
      const greet = greets[beatCount % greets.length]
      hCtx.font = '42px "JetBrains Mono",monospace'
      hCtx.textAlign = 'center'
      const col = phase === 4 ? `rgba(255,50,50,${(bump - 0.7) * 2.5})` : `rgba(255,255,255,${(bump - 0.7) * 2})`
      hCtx.fillStyle = col
      hCtx.fillText(greet, w / 2, h / 2 + h * 0.25)
      hCtx.font = '11px "JetBrains Mono",monospace'
      hCtx.textAlign = 'left'
    }

    // Void: single fading text
    if (phase === 5 && progress < 0.5) {
      hCtx.font = '32px "JetBrains Mono",monospace'
      hCtx.textAlign = 'center'
      hCtx.fillStyle = `rgba(255,255,255,${0.3 * (1 - progress * 2)})`
      hCtx.fillText('...', w / 2, h / 2)
      hCtx.font = '11px "JetBrains Mono",monospace'
      hCtx.textAlign = 'left'
    }


    // Buildup progress bar
    if (phase === 2) {
      const barW = w * 0.4
      const barH = 3
      const barX = (w - barW) / 2
      const barY = h - 20
      hCtx.fillStyle = 'rgba(255,255,255,0.1)'
      hCtx.fillRect(barX, barY, barW, barH)
      hCtx.fillStyle = phase === 1 ? 'rgba(150,180,200,0.3)' : 'rgba(0,255,255,0.4)'
      hCtx.fillRect(barX, barY, barW * progress, barH)
    }
  }

  // ============================================================
  // PHASE SKIP (arrow keys)
  // ============================================================
  const phaseStarts = [0, CITY_END, INTRO_END, BUILDUP_END, DROP_END, MELTDOWN_END]

  function skipPhase(dir: number) {
    const currentPhase = getPhase(t)
    const target = Math.max(0, Math.min(5, currentPhase + dir))
    t = phaseStarts[target] + 0.1
    // Resync audio — make audioStartTime so that elapsed matches t
    audioStartTime = audioCtx.currentTime - t
    audioNextBeat = audioCtx.currentTime + 0.05
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') skipPhase(1)
    else if (e.key === 'ArrowLeft') skipPhase(-1)
    else if (e.key === 'Escape') emit('close')
  }
  window.addEventListener('keydown', onKeydown)

  // ============================================================
  // ANIMATE
  // ============================================================
  let t = 0
  let animId = 0
  let lastTime = performance.now()
  const camBaseZ = window.innerWidth < 768 ? 10 : 8
  const VOID_FADE_DUR = 8 // void fades out over its duration
  let closingEmitted = false

  function frame(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now
    t += dt
    frameCount++

    fpsAccum++
    fpsTimer += dt
    if (fpsTimer >= 0.5) {
      fps = Math.round(fpsAccum / fpsTimer)
      fpsAccum = 0
      fpsTimer = 0
    }

    const phase = getPhase(t)
    const progress = getPhaseProgress(t)

    // Beat timing (0=city, 1=intro, 2=buildup, 3=drop, 4=meltdown, 5=void)
    nextBeat -= dt
    if (nextBeat <= 0) {
      bump = phase === 4 ? 1.0 + (1 - progress) * 0.3 : phase === 3 ? 1.2 : phase === 2 ? 0.5 + progress * 0.7 : phase === 5 ? 0.2 : phase === 0 ? 0.3 + progress * 0.3 : 0.4
      beatCount++
      nextBeat += beatInterval
      const glitchChance = phase === 4 ? 0.8 : phase === 3 ? 0.6 : phase === 2 ? 0.3 + progress * 0.4 : phase === 1 ? 0.2 : phase === 0 ? 0.1 : 0.05
      if (Math.random() < glitchChance) triggerGlitch()
      if (beatCount % 4 === 0 && phase >= 1 && phase <= 4) swapGeometry()
    }
    bump *= phase === 4 ? 0.82 : phase === 3 ? 0.85 : phase === 5 ? 0.95 : 0.9
    glitchTimer = Math.max(0, glitchTimer - dt)

    const hueBase = (t * 0.03) % 1

    // Saturation per phase
    let saturation = 0.5
    if (phase === 0) saturation = 0.3 + progress * 0.15
    else if (phase === 1) saturation = 0.45 + progress * 0.2
    else if (phase === 2) saturation = 0.65 + progress * 0.25
    else if (phase === 3) saturation = 0.9 + progress * 0.1
    else if (phase === 4) saturation = 1.0 - progress * 0.6
    else saturation = 0.1 + (1 - progress) * 0.3

    // Background shader
    blobMaterial.uniforms.uTime.value = t
    let bgIntensity = 0
    if (phase === 0) bgIntensity = 0.1 + progress * 0.05
    else if (phase === 1) bgIntensity = 0.15
    else if (phase === 2) bgIntensity = 0.15 + progress * 0.85
    else if (phase === 3) bgIntensity = 1
    else if (phase === 4) bgIntensity = 1 - progress * 0.3
    else bgIntensity = 0.3 * (1 - progress)
    blobMaterial.uniforms.uIntensity.value = bgIntensity
    blobMaterial.uniforms.uBump.value = bump
    blobMaterial.uniforms.uSaturation.value = saturation
    blobMaterial.uniforms.uHueShift.value = phase === 4 ? Math.sin(t * 0.5) * 0.5 : Math.sin(t * 0.08) * 0.15

    // Chromatic aberration
    let chromaBase = 0.2
    if (phase === 0) chromaBase = 0.1 + progress * 0.1
    else if (phase === 1) chromaBase = 0.3
    else if (phase === 2) chromaBase = 0.5 + progress * 0.5
    else if (phase === 3) chromaBase = 1.0
    else if (phase === 4) chromaBase = 1.5 + progress * 1.5
    else chromaBase = 0.5 * (1 - progress)
    blobMaterial.uniforms.uChroma.value = chromaBase + bump * (phase === 4 ? 2.0 : 1.2)

    // Show/hide objects per phase
    const showCity = phase === 0
    const showModel = phase >= 1 && phase <= 4
    torus.visible = showModel
    wireframes.forEach((wf) => { wf.visible = showModel })
    cityGroup.visible = showCity

    // Camera
    let targetZ = camBaseZ
    if (phase === 0) targetZ = camBaseZ - 1.0
    else if (phase === 2) targetZ = camBaseZ - progress * 2.0
    else if (phase === 3) targetZ = camBaseZ - 2.0 - Math.sin(t * 0.4) * 0.6
    else if (phase === 4) targetZ = camBaseZ - 1.0 + Math.sin(t * 0.8) * 1.5
    else if (phase === 5) targetZ = camBaseZ + 2.0 + progress * 4.0
    camera.position.z += (targetZ - camera.position.z) * 0.04

    // Rotation speed
    let rotSpeed = 1.2
    if (phase === 2) rotSpeed = 1.2 + progress * 1.2
    else if (phase === 3) rotSpeed = 2.4 + Math.sin(t * 0.7) * 0.6
    else if (phase === 4) rotSpeed = 3.0 + Math.sin(t * 2) * 1.5
    else if (phase === 5) rotSpeed = 0.3 * (1 - progress)
    const wobble = phase === 3 ? Math.sin(t * 1.3) * 0.4 : phase === 4 ? Math.sin(t * 2.5) * 0.8 : 0

    // Wireframe city animation (phase 0)
    if (showCity) {
      const cityT = t
      // Fade out in last 3 seconds of city phase
      const cityFade = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1
      for (let i = 0; i < cityBars.length; i++) {
        const x = i % cityGridSize
        const z = Math.floor(i / cityGridSize)
        const h = (Math.sin(x * 0.8 + cityT * 1.5) + Math.sin(z * 0.6 + cityT * 1.2) + Math.sin((x + z) * 0.5 + cityT * 0.8)) * 0.5
        const height = Math.abs(h) * (0.5 + progress * 1.5 + bump * 2.0) * cityFade
        cityBars[i].scale.y = Math.max(0.1, height)
        cityBars[i].position.y = height * 0.5 - 0.5

        const barMat = cityBars[i].material as THREE.MeshBasicMaterial
        const barHue = (0.45 + x * 0.01 + z * 0.01 + cityT * 0.02) % 1
        barMat.color.setHSL(barHue, 0.4 + progress * 0.3, (0.2 + progress * 0.2 + bump * 0.2) * cityFade)
        barMat.opacity = (0.1 + progress * 0.15 + bump * 0.15) * cityFade
      }

      const cityOrbit = cityT * 0.15
      camera.position.x = Math.sin(cityOrbit) * 8
      camera.position.z = Math.cos(cityOrbit) * 8
      camera.position.y = 3 + Math.sin(cityT * 0.3) * 1.5
      camera.lookAt(0, 0, 0)
    }

    // Reset camera orientation for non-city phases (city uses lookAt which overrides rotation)
    if (!showCity) {
      camera.rotation.x = 0
      camera.rotation.y = 0
    }

    // Main model (phases 1-4)
    if (showModel) {
      let baseScale = 1
      if (phase === 3) baseScale = 0.65
      else if (phase === 4) baseScale = 0.65 + progress * 0.5 * Math.sin(t * 3)
      else if (phase === 5) baseScale = (1 - progress) * 0.5
      const bumpScale = Math.max(0.01, baseScale + bump * 0.12)
      torus.scale.setScalar(bumpScale)
      torus.rotation.x = t * 0.8 * rotSpeed + wobble
      torus.rotation.y = t * 0.5 * rotSpeed
      torus.rotation.z = t * 0.3 * rotSpeed + wobble * 0.5

      torusMat.color.setHSL(hueBase + 0.6, saturation * 0.8, 0.35 + saturation * 0.2)
      torusMat.specular.setHSL(hueBase + 0.55, saturation, 0.4 + saturation * 0.2)
      const emBright = 0.06 + bump * (phase >= 3 ? 0.35 : 0.15)
      torusMat.emissive.setHSL(hueBase + 0.75, saturation * 0.8, emBright)

      if (phase === 4) {
        torusMat.opacity = Math.random() > progress * 0.3 ? 0.9 : 0.2
      } else if (phase === 3) {
        torusMat.opacity = 0.8 + Math.sin(t * 1.5) * 0.1 + bump * 0.1
      } else {
        torusMat.opacity = 1.0
      }

      const wireHues = [0.5, 0.83, 0.12, 0.4]
      for (let i = 0; i < wireframes.length; i++) {
        const lag = lags[i]
        const wf = wireframes[i]

        if (phase === 3) {
          const orbitR = (0.2 + i * 0.1) * 0.65
          const orbitSpeed = 1.2 + i * 0.4
          const orbitAngle = t * orbitSpeed + i * Math.PI * 0.5
          wf.position.x = Math.sin(orbitAngle) * orbitR
          wf.position.y = Math.cos(orbitAngle) * orbitR * 0.7
          wf.position.z = Math.sin(orbitAngle * 0.7 + t) * orbitR * 0.5
        } else if (phase === 4) {
          const scatter = progress * 2.0
          wf.position.x = Math.sin(t * (1 + i) + i) * scatter
          wf.position.y = Math.cos(t * (0.8 + i) + i * 2) * scatter
          wf.position.z = Math.sin(t * (0.5 + i * 0.3)) * scatter * 0.5
        } else if (phase === 2) {
          const drift = progress * 0.15 * (i + 1)
          wf.position.x = Math.sin(t + i * 2) * drift
          wf.position.y = Math.cos(t + i * 2) * drift * 0.5
          wf.position.z = 0
        } else {
          wf.position.set(0, 0, 0)
        }

        wf.rotation.x = (t - lag) * 0.8 * rotSpeed + wobble * (i % 2 ? 1 : -1)
        wf.rotation.y = (t - lag) * 0.5 * rotSpeed
        wf.rotation.z = (t - lag) * 0.3 * rotSpeed + wobble * 0.3
        wf.scale.setScalar(bumpScale * (1 + 0.04 * (i + 1)) + bump * 0.06)

        const wHue = (wireHues[i] + t * 0.02) % 1
        wireMats[i].color.setHSL(wHue, saturation, 0.35 + saturation * 0.35)
        const baseOp = phase === 3 ? 0.25 - i * 0.02 : phase === 4 ? 0.3 : phase === 2 ? 0.1 + progress * 0.1 : 0.08 - i * 0.01
        wireMats[i].opacity = baseOp + 0.06 * Math.sin(t * 2.0 + i * 1.2) + bump * 0.18
      }

      const glitchProb = phase === 4 ? 0.05 + progress * 0.05 : phase === 2 ? progress * 0.03 : phase === 3 ? 0.015 : 0
      if (Math.random() < glitchProb) {
        torus.visible = false
        wireframes.forEach((wf) => { wf.visible = false })
        setTimeout(() => {
          if (getPhase(t) >= 1 && getPhase(t) <= 4) {
            torus.visible = true
            wireframes.forEach((wf) => { wf.visible = true })
          }
        }, 30 + Math.random() * (phase === 4 ? 300 : 120))
      }
    }

    // Lights
    const lightBoost = 1 + bump * (phase === 3 ? 2.0 : phase === 4 ? 1.5 : phase === 0 ? 1.0 : 0.8)
    light1.intensity = (phase === 5 ? 20 * (1 - progress) : 70) * lightBoost
    light2.intensity = (phase === 5 ? 15 * (1 - progress) : 60) * lightBoost
    light3.intensity = (phase === 5 ? 10 * (1 - progress) : 40) * lightBoost
    const lightSat = Math.min(saturation * 1.1, 1)
    light1.color.setHSL((0.52 + Math.sin(t * 0.2) * 0.1 + hueBase) % 1, lightSat, 0.5)
    light2.color.setHSL((0.85 + Math.sin(t * 0.15) * 0.1 + hueBase) % 1, lightSat, 0.5)
    light3.color.setHSL((0.1 + Math.sin(t * 0.12) * 0.08 + hueBase) % 1, lightSat, 0.5)

    // Camera shake & roll (non-city phases)
    if (!showCity) {
      // Smoothly bring camera back from orbit position
      const shakeAmt = phase === 4 ? 0.4 + progress * 0.3 : phase === 3 ? 0.25 : phase === 2 ? 0.06 + progress * 0.1 : phase === 5 ? 0.02 * (1 - progress) : 0.04
      const shakeX = Math.sin(t * 30) * bump * shakeAmt
      const shakeY = Math.cos(t * 25) * bump * shakeAmt * 0.8
      camera.position.x += (shakeX - camera.position.x) * 0.1
      camera.position.y += (shakeY - camera.position.y) * 0.1
      const rollAmt = phase === 4 ? 0.3 + progress * 0.2 : phase === 3 ? 0.15 + bump * 0.08 : phase === 2 ? progress * 0.04 : 0
      camera.rotation.z = Math.sin(t * (phase === 4 ? 0.6 : 0.2)) * rollAmt
    }

    // Render
    renderer.clear(true, true, true)
    renderer.render(blobScene, blobCamera)
    renderer.clear(false, true, false)
    renderer.render(scene, camera)

    drawHud(hudCanvas.width, hudCanvas.height, t, phase, progress)
    scheduleAudio()

    // Void phase: fade to black then auto-close
    if (phase === 5) {
      const voidElapsed = t - MELTDOWN_END
      const fadeProgress = Math.min(voidElapsed / VOID_FADE_DUR, 1)
      hCtx.fillStyle = `rgba(0,0,0,${fadeProgress})`
      hCtx.fillRect(0, 0, hudCanvas.width, hudCanvas.height)
      masterGain.gain.setTargetAtTime(0.4 * (1 - fadeProgress), audioCtx.currentTime, 0.1)
      if (fadeProgress >= 1 && !closingEmitted) {
        closingEmitted = true
        setTimeout(() => emit('close'), 800)
      }
    }

    animId = requestAnimationFrame(frame)
  }

  animId = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(animId)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', onResize)
    renderer.dispose()
    renderer.domElement.remove()
    hudCanvas.remove()
    padOscs.forEach((o) => o.stop())
    noiseNode.stop()
    sweepOsc.stop()
    audioCtx.close()
  }
}

let cleanup: (() => void) | undefined

watch(
  () => props.active,
  (val) => {
    if (val) {
      nextTick(() => {
        startDemo().then((fn) => { cleanup = fn })
      })
    } else {
      cleanup?.()
      cleanup = undefined
      loading.value = false
    }
  },
)

onUnmounted(() => { cleanup?.() })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      ref="container"
      class="fixed inset-0 z-[9999]"
    >
      <div
        v-if="loading"
        class="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center"
      >
        <div class="absolute inset-0 flex flex-col">
          <div
            v-for="(c, i) in c64Colors"
            :key="i"
            class="flex-1 transition-all duration-300"
            :style="{
              background: c,
              opacity: loadPercent > (i / c64Colors.length) * 100 ? 1 : 0.1,
              transform: `scaleY(${loadPercent > (i / c64Colors.length) * 100 ? 1 : 0.3})`,
            }"
          />
        </div>
        <div
          class="absolute inset-0 pointer-events-none z-10"
          style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)"
        />
        <div class="relative z-20 text-center font-mono">
          <div class="text-white text-lg tracking-[0.3em] mb-4" style="text-shadow: 2px 2px 0 #000, -1px -1px 0 #000">LOADING</div>
          <div class="text-white text-3xl tracking-[0.1em] font-bold" style="text-shadow: 2px 2px 0 #000, -1px -1px 0 #000">{{ loadPercent }}%</div>
        </div>
      </div>

      <button
        v-if="!loading"
        class="absolute top-5 right-5 z-30 font-mono text-[0.6rem] text-white/30 tracking-[0.1em] uppercase hover:text-white/70 transition-colors duration-200 cursor-pointer"
        @click="emit('close')"
      >
        [ESC] CLOSE
      </button>
    </div>
  </Teleport>
</template>
