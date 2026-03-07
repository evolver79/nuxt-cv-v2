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
  camera.position.z = 6

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
  // TORUS + WIREFRAMES
  // ============================================================
  const torusMat = new THREE.MeshPhongMaterial({ color: 0x667788, specular: 0x556677, shininess: 120, emissive: 0x080810 })
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.5, 64, 128), torusMat)
  scene.add(torus)

  const wireframes: THREE.Mesh[] = []
  // Start mono, will colorize per phase
  const wireMats: THREE.MeshBasicMaterial[] = []
  const lags = [0.3, 0.6, 0.9, 1.2]
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x556677, wireframe: true, transparent: true, opacity: 0.08 - i * 0.01 })
    const wf = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.5, 24, 48), mat)
    scene.add(wf)
    wireframes.push(wf)
    wireMats.push(mat)
  }

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

  // Kick (drop phase)
  function playKick(time: number) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(masterGain)
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.12)
    gain.gain.setValueAtTime(0.9, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
    osc.start(time)
    osc.stop(time + 0.3)
  }

  // Hihat (drop phase)
  function playHihat(time: number, accent: boolean) {
    const sz = audioCtx.sampleRate * 0.05
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1
    const src = audioCtx.createBufferSource()
    src.buffer = buf
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

  // Acid bass (drop phase)
  const acidNotes = [55, 55, 82.41, 55, 73.42, 55, 61.74, 82.41]
  function playAcid(time: number, beatInBar: number) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const flt = audioCtx.createBiquadFilter()
    osc.type = 'sawtooth'
    flt.type = 'lowpass'
    flt.frequency.setValueAtTime(1200, time)
    flt.frequency.exponentialRampToValueAtTime(200, time + 0.15)
    flt.Q.value = 12
    osc.frequency.value = acidNotes[beatInBar % acidNotes.length]
    osc.connect(flt)
    flt.connect(gain)
    gain.connect(masterGain)
    gain.gain.setValueAtTime(0.12, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
    osc.start(time)
    osc.stop(time + 0.2)
  }

  // ============================================================
  // PHASE TIMING
  // ============================================================
  const INTRO_END = 15
  const BUILDUP_END = 30
  const bpm = 130
  const beatInterval = 60 / bpm
  let audioNextBeat = audioCtx.currentTime + 0.05
  let audioBeatCount = 0
  let audioStartTime = audioCtx.currentTime

  function getPhase(t: number): number {
    if (t < INTRO_END) return 0 // intro
    if (t < BUILDUP_END) return 1 // buildup
    return 2 // drop
  }

  function getPhaseProgress(t: number): number {
    if (t < INTRO_END) return t / INTRO_END
    if (t < BUILDUP_END) return (t - INTRO_END) / (BUILDUP_END - INTRO_END)
    return Math.min((t - BUILDUP_END) / 4, 1) // drop ramps in over 4s
  }

  function scheduleAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const now = audioCtx.currentTime
    const elapsed = now - audioStartTime
    const phase = getPhase(elapsed)
    const progress = getPhaseProgress(elapsed)

    // Pad filter: opens progressively across phases
    let padFreq = 400
    if (phase === 0) padFreq = 400 + progress * 200 + Math.sin(now * 0.15) * 100
    else if (phase === 1) padFreq = 600 + progress * 1400 // sweep up to 2000
    else padFreq = 1200 + Math.sin(now * 0.2) * 400
    padFilter.frequency.setTargetAtTime(padFreq, now, 0.3)

    // Pad volume: louder during buildup, slightly lower at drop
    const padVol = phase === 0 ? 0.06 : phase === 1 ? 0.06 + progress * 0.06 : 0.08
    padGain.gain.setTargetAtTime(padVol, now, 0.3)

    // Noise: rises during buildup
    const noiseVol = phase === 0 ? 0.008 : phase === 1 ? 0.008 + progress * 0.025 : 0.012
    noiseGain.gain.setTargetAtTime(noiseVol, now, 0.3)
    const noiseSweep = phase === 1 ? 2000 + progress * 6000 : 1500 + Math.sin(now * 0.2) * 1000
    noiseFilter.frequency.setTargetAtTime(noiseSweep, now, 0.3)

    // Rising sweep: only during buildup
    if (phase === 1) {
      sweepGain.gain.setTargetAtTime(0.04 + progress * 0.08, now, 0.2)
      sweepFilter.frequency.setTargetAtTime(200 + progress * 3000, now, 0.5)
      sweepOsc.frequency.setTargetAtTime(55 + progress * 165, now, 0.5)
    } else {
      sweepGain.gain.setTargetAtTime(0, now, 0.1)
    }

    while (audioNextBeat < audioCtx.currentTime + 0.2) {
      const beatElapsed = audioNextBeat - audioStartTime
      const bp = getPhase(beatElapsed)
      const beatInBar = audioBeatCount % 8

      if (bp === 0) {
        // INTRO: sparse sub + pings
        if (beatInBar % 2 === 0) playSubPulse(audioNextBeat, 0.5)
        if (beatInBar === 0 || beatInBar === 5) playPing(audioNextBeat + Math.random() * 0.05, 0.06)
      } else if (bp === 1) {
        // BUILDUP: sub gets faster, pings more frequent
        playSubPulse(audioNextBeat, 0.6)
        if (beatInBar % 2 === 0) playPing(audioNextBeat, 0.08)
        // Add offbeat sub for urgency in second half
        const bp2 = getPhaseProgress(beatElapsed)
        if (bp2 > 0.5 && beatInBar % 2 === 1) playSubPulse(audioNextBeat, 0.3)
      } else {
        // DROP: full beat
        playKick(audioNextBeat)
        playHihat(audioNextBeat, beatInBar % 2 === 1)
        playHihat(audioNextBeat + beatInterval * 0.5, false)
        playAcid(audioNextBeat, beatInBar)
        if (beatInBar === 0 || beatInBar === 4) playPing(audioNextBeat, 0.05)
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
    glitchIntensity = 0.5 + Math.random() * 0.5
    glitchTimer = 0.08 + Math.random() * 0.12
    glitchCount++
  }

  const phaseNames = ['INTRO', 'BUILDUP', 'DROP']

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

    // HUD colors per phase: mono → warm → neon
    const hudLeft = phase === 0 ? 'rgba(180,180,190,0.4)' : phase === 1 ? 'rgba(100,200,220,0.5)' : 'rgba(0,255,255,0.6)'
    const hudRight = phase === 0 ? 'rgba(160,160,170,0.35)' : phase === 1 ? 'rgba(200,180,100,0.4)' : 'rgba(255,170,0,0.5)'

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
      hCtx.fillStyle = `rgba(255,255,255,${bump * (phase === 2 ? 0.08 : 0.04)})`
      hCtx.fillRect(0, 0, w, h)
    }

    // Drop: flash greets text on big beats
    if (phase === 2 && bump > 0.7) {
      const greets = ['RESPECT', 'KEEP CODING', 'LONG LIVE THE SCENE', 'NO SLEEP', 'GREETS TO ALL']
      const greet = greets[beatCount % greets.length]
      hCtx.font = '28px "JetBrains Mono",monospace'
      hCtx.textAlign = 'center'
      hCtx.fillStyle = `rgba(255,255,255,${(bump - 0.7) * 2})`
      hCtx.fillText(greet, w / 2, h / 2 + h * 0.25)
      hCtx.font = '11px "JetBrains Mono",monospace'
      hCtx.textAlign = 'left'
    }

    // Buildup progress bar
    if (phase === 1) {
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
  const phaseStarts = [0, INTRO_END, BUILDUP_END]

  function skipPhase(dir: number) {
    const currentPhase = getPhase(t)
    const target = Math.max(0, Math.min(2, currentPhase + dir))
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
  const camBaseZ = 6

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

    // Beat timing — faster during buildup second half
    nextBeat -= dt
    if (nextBeat <= 0) {
      bump = phase === 2 ? 1 : phase === 1 ? 0.4 + progress * 0.6 : 0.3
      beatCount++
      nextBeat += beatInterval
      const glitchChance = phase === 0 ? 0.15 : phase === 1 ? 0.2 + progress * 0.3 : 0.45
      if (Math.random() < glitchChance) triggerGlitch()
    }
    bump *= phase === 2 ? 0.88 : 0.92
    glitchTimer = Math.max(0, glitchTimer - dt)

    // Color saturation: more color from the start
    const saturation = phase === 0 ? 0.3 + progress * 0.15 : phase === 1 ? 0.45 + progress * 0.3 : 0.75 + progress * 0.25

    // Blob background
    blobMaterial.uniforms.uTime.value = t
    blobMaterial.uniforms.uIntensity.value = phase === 0 ? 0 : phase === 1 ? progress * 0.5 : 1
    blobMaterial.uniforms.uBump.value = bump
    blobMaterial.uniforms.uSaturation.value = saturation
    blobMaterial.uniforms.uHueShift.value = 0
    // Chromatic aberration: subtle intro, stronger at drop, spikes on beats
    const chromaBase = phase === 0 ? 0.2 : phase === 1 ? 0.3 + progress * 0.4 : 0.7
    blobMaterial.uniforms.uChroma.value = chromaBase + bump * 0.8

    // Camera zoom: far in intro, zooms in during buildup, close at drop
    let targetZ = camBaseZ
    if (phase === 1) targetZ = camBaseZ - progress * 1.5
    else if (phase === 2) targetZ = camBaseZ - 1.5 - Math.sin(t * 0.3) * 0.3
    camera.position.z += (targetZ - camera.position.z) * 0.03

    // Rotation speed: increases across phases
    const rotSpeed = phase === 0 ? 1 : phase === 1 ? 1 + progress * 0.8 : 1.8 + Math.sin(t * 0.5) * 0.3

    // Torus — smaller at drop to sit inside the wormhole
    const baseScale = phase === 2 ? 0.6 + progress * 0 : 1
    const bumpScale = baseScale + bump * (phase === 2 ? 0.1 : 0.08)
    torus.scale.setScalar(bumpScale)
    torus.rotation.x = t * 0.8 * rotSpeed
    torus.rotation.y = t * 0.5 * rotSpeed
    torus.rotation.z = t * 0.3 * rotSpeed

    // Torus material
    torusMat.color.setHSL(0.6, saturation * 0.6, 0.35 + saturation * 0.15)
    torusMat.specular.setHSL(0.55, saturation * 0.8, 0.3 + saturation * 0.2)
    const emBright = 0.04 + bump * (phase === 2 ? 0.2 : 0.1)
    torusMat.emissive.setHSL(0.75, saturation * 0.6, emBright)

    // Wireframe colors — mono grey → neon
    const wireHues = [0.5, 0.83, 0.12, 0.4] // cyan, magenta, amber, mint
    for (let i = 0; i < wireframes.length; i++) {
      const lag = lags[i]
      const wf = wireframes[i]

      // Drop: wireframes orbit independently
      if (phase === 2) {
        const orbitR = 0.4 + i * 0.15
        const orbitSpeed = 0.8 + i * 0.3
        const orbitAngle = t * orbitSpeed + i * Math.PI * 0.5
        wf.position.x = Math.sin(orbitAngle) * orbitR
        wf.position.y = Math.cos(orbitAngle) * orbitR * 0.6
        wf.position.z = Math.sin(orbitAngle * 0.7) * orbitR * 0.3
      } else {
        wf.position.set(0, 0, 0)
      }

      wf.rotation.x = (t - lag) * 0.8 * rotSpeed
      wf.rotation.y = (t - lag) * 0.5 * rotSpeed
      wf.rotation.z = (t - lag) * 0.3 * rotSpeed
      wf.scale.setScalar(bumpScale + bump * 0.06 * (i + 1))

      // Color: grey at low sat, neon at high
      wireMats[i].color.setHSL(wireHues[i], saturation, 0.3 + saturation * 0.3)
      const baseOp = phase === 2 ? 0.2 - i * 0.02 : 0.08 - i * 0.01
      const phaseBoost = phase === 1 ? progress * 0.08 : 0
      wireMats[i].opacity = baseOp + phaseBoost + 0.04 * Math.sin(t * 1.5 + i * 0.8) + bump * 0.12
    }

    // Torus visibility glitch during buildup
    if (phase === 1 && Math.random() < progress * 0.02) {
      torus.visible = false
      wireframes.forEach((wf) => { wf.visible = false })
      setTimeout(() => {
        torus.visible = true
        wireframes.forEach((wf) => { wf.visible = true })
      }, 50 + Math.random() * 150)
    }

    // Lights — hue follows mouse, saturation per phase
    const lightBoost = 1 + bump * (phase === 2 ? 1.2 : 0.6)
    light1.intensity = 60 * lightBoost
    light2.intensity = 50 * lightBoost
    light3.intensity = 30 * lightBoost
    const lightSat = saturation * 0.9
    light1.color.setHSL(0.52 + Math.sin(t * 0.12) * 0.05, lightSat, 0.5)
    light2.color.setHSL(0.85 + Math.sin(t * 0.1) * 0.05, lightSat, 0.5)
    light3.color.setHSL(0.1 + Math.sin(t * 0.08) * 0.04, lightSat, 0.5)

    // Camera shake: stronger at drop
    const shakeAmt = phase === 2 ? 0.12 : phase === 1 ? 0.04 + progress * 0.06 : 0.03
    camera.position.x = Math.sin(t * 30) * bump * shakeAmt
    camera.position.y = Math.cos(t * 25) * bump * shakeAmt * 0.75
    // Slow barrel roll at drop
    camera.rotation.z = phase === 2 ? Math.sin(t * 0.15) * 0.08 : 0

    // Render
    renderer.clear(true, true, true)
    renderer.render(blobScene, blobCamera)
    renderer.clear(false, true, false)
    renderer.render(scene, camera)

    drawHud(hudCanvas.width, hudCanvas.height, t, phase, progress)
    scheduleAudio()

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
