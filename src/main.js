import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import gsap from 'gsap'
import Stats from 'three/examples/jsm/libs/stats.module.js'

const stats = new Stats()

document.body.appendChild(stats.dom)

// --- 1. ESCENA Y CARGADORES ---
const scene = new THREE.Scene()
scene.background = new THREE.Color('#86c7b9')

const textureLoader = new THREE.TextureLoader()
const gltfLoader = new GLTFLoader()

// --- 2. ILUMINACIÓN HDR GLOBAL ---
new RGBELoader().load(
  '/textures/museum_env.hdr',
  (environmentMap) => {
    environmentMap.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = environmentMap
    scene.environmentIntensity = 0.8
  },
  undefined,
  () => console.log('Modo de luz por defecto activado')
)

// --- 3. SUELO Y PEDESTAL (MATERIALES: Standard, Phong, Toon, Basic) ---
const marbleTexture = textureLoader.load('/textures/marble.jpg')
marbleTexture.wrapS = marbleTexture.wrapT = THREE.RepeatWrapping
marbleTexture.repeat.set(4, 4)

// 1. MeshStandardMaterial (Suelo)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.01, metalness: 0.1 })
)
floor.rotation.x = -Math.PI * 0.5
floor.position.y = -1.5
floor.receiveShadow = true
scene.add(floor)

// 2. MeshBasicMaterial (Cuadros de las paredes)
const createFrame = (x, rotY) => {
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 3),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  )
  frame.position.set(x, 3, 0)
  frame.rotation.y = rotY
  scene.add(frame)
}
createFrame(-9.95, Math.PI / 2)
createFrame(9.95, -Math.PI / 2)

// Pedestal
const woodMaterial = new THREE.MeshStandardMaterial({ color: '#2b1a0e', roughness: 0.4 })
const pedestalBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), woodMaterial)
pedestalBase.position.set(0, -0.95, 0)

const pedestalTopMat = new THREE.MeshStandardMaterial({ map: marbleTexture, roughness: 0.1, metalness: 0.1 })
const pedestalTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), pedestalTopMat)
pedestalTop.position.set(0, -0.35, 0)

// 3. MeshPhongMaterial (Placa dorada)
const plaqueMat = new THREE.MeshPhongMaterial({ color: '#d4af37', shininess: 100, specular: '#ffffff' })
const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), plaqueMat)
plaque.position.set(0, -0.8, 0.66)

scene.add(pedestalBase, pedestalTop, plaque)

// --- 4. PAREDES Y TECHO ---
const wallGroup = new THREE.Group()
const wallMat = new THREE.MeshStandardMaterial({ color: '#42577e', roughness: 0.85, metalness: 0.1 })

const wallConfigs = [
  { pos: [0, 3.5, -4.5], rot: [0, 0, 0] },
  { pos: [-10, 3.5, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [10, 3.5, 0], rot: [0, -Math.PI / 2, 0] }
]

wallConfigs.forEach(({ pos, rot }) => {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), wallMat)
  wall.position.set(...pos)
  wall.rotation.set(...rot)
  wall.receiveShadow = true
  wallGroup.add(wall)
})

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 10),
  new THREE.MeshStandardMaterial({ color: '#f5f5f5' })
)
ceiling.rotation.x = Math.PI / 2
ceiling.position.y = 9
scene.add(ceiling)

// 4. MeshToonMaterial (Marcos decorativos de pared)
const toonMaterial = new THREE.MeshToonMaterial({ color: '#1a233a' })

const createWallPanel = (width, height, x, y) => {
  const panelGroup = new THREE.Group()
  const depth = 0.05, thickness = 0.12

  const topBar = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), toonMaterial)
  topBar.position.set(0, height / 2, depth / 2)
  const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), toonMaterial)
  bottomBar.position.set(0, -height / 2, depth / 2)
  const leftBar = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, depth), toonMaterial)
  leftBar.position.set(-width / 2, 0, depth / 2)
  const rightBar = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, depth), toonMaterial)
  rightBar.position.set(width / 2, 0, depth / 2)

  panelGroup.add(topBar, bottomBar, leftBar, rightBar)
  panelGroup.position.set(x, y, -4.48)
  return panelGroup
}

wallGroup.add(
  createWallPanel(3.5, 5.5, -5.5, 2.5),
  createWallPanel(4.5, 5.5, 0, 2.5),
  createWallPanel(3.5, 5.5, 5.5, 2.5)
)
scene.add(wallGroup)


// --- 5. ESFERA Y MATERIAL 5: MeshMatcapMaterial ---

const matcapMaterial = new THREE.MeshMatcapMaterial()
textureLoader.load(
'/textures/matcaps/gold.png',
(texture) => {
texture.colorSpace = THREE.SRGBColorSpace
matcapMaterial.matcap = texture
matcapMaterial.needsUpdate = true
}
)
const matcapSphere = new THREE.Mesh(
new THREE.SphereGeometry(1, 64, 64),
matcapMaterial
)
 
matcapSphere.position.set(-5, 1, 2)
 
scene.add(matcapSphere)

// --- 6. ESFERAS FLOTANTES (GENERADAS DESDE ARRAY DE OBJETOS) ---
const floatAnimations = []
const spheresData = [
  { color: '#d32f2f', radius: 0.4, pos: [-4.5, -1.1, 1.8] },
  { color: '#1976d2', radius: 0.8, pos: [3.6, -0.7, 0.2] },
  { color: '#fbc02d', radius: 0.35, pos: [4.8, -1.15, 1.8] },
  { color: '#9e9e9e', radius: 1.1, pos: [4.2, 0.8, -2.5] },
  { color: '#388e3c', radius: 1.3, pos: [-3.8, -0.2, -0.5] }
]

const spheres = spheresData.map((data, index) => {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius, 64, 64),
    new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.2, metalness: 0.2 })
  )
  sphere.position.set(...data.pos)
  sphere.castShadow = sphere.receiveShadow = true
  scene.add(sphere)

  const floatAnim = gsap.to(sphere.position, {
    y: sphere.position.y + 0.35,
    duration: 2 + index * 0.3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })
  floatAnimations.push(floatAnim)

  return sphere
})

const triggerSphereBounce = (sphere, index) => {
  floatAnimations[index].pause()
  const originalY = sphere.position.y

  gsap.to(sphere.position, {
    y: originalY + 0.8,
    duration: 0.4,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
    onComplete: () => floatAnimations[index].resume()
  })

  gsap.to(sphere.scale, {
    x: 1.25, y: 0.8, z: 1.25,
    duration: 0.15,
    yoyo: true,
    repeat: 1,
    ease: 'power1.out'
  })
}



// --- 7. CAJAS DE MADERA ---

const crateMaterial = new THREE.MeshStandardMaterial({ color: '#b88100', roughness: 0.7, metalness: 0.05 })
textureLoader.load('/textures/wood.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace
  crateMaterial.map = texture
  crateMaterial.needsUpdate = true
})

const cratesGroup = new THREE.Group()
const crateConfigs = [
  [1.2, 0.8, 0.9, -3.2, -1.1, -2.0, 0.2],
  [1.0, 0.7, 0.8, -3.1, -0.35, -2.1, -0.1],
  [0.8, 0.6, 0.7, -3.3, 0.3, -2.0, 0.3],
  [1.3, 0.9, 1.0, -2.8, -1.05, 1.5, -0.4],
  [0.9, 0.7, 0.8, -2.7, -0.25, 1.4, 0.1],
  [1.1, 0.8, 1.1, 3.0, -1.1, -2.2, -0.2],
  [0.8, 0.6, 0.8, 3.1, -0.4, -2.1, 0.2],
  [1.4, 0.7, 0.9, 2.7, -1.15, 1.2, 0.5],
  [1.0, 0.8, 0.7, 2.8, -0.4, 1.1, -0.1]
]

crateConfigs.forEach(([w, h, d, x, y, z, rotY]) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), crateMaterial)
  mesh.position.set(x, y, z)
  mesh.rotation.y = rotY || 0
  mesh.castShadow = mesh.receiveShadow = true
  cratesGroup.add(mesh)
})
scene.add(cratesGroup)

// --- 8. CARGA DEL MODELO Y VITRINA ---
let miguelModel = null
let glassCase = null
const miguelGroup = new THREE.Group()
scene.add(miguelGroup)

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.05,
  ior: 1.5, transmission: 0.95, thickness: 0.1, specularIntensity: 1.0
})

gltfLoader.load(
  '/models/miguel.glb',
  (gltf) => {
    miguelModel = gltf.scene
    const box = new THREE.Box3().setFromObject(miguelModel)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    const targetHeight = 1.5
    const scale = targetHeight / size.y
    miguelModel.scale.setScalar(scale)

    const scaledSize = size.clone().multiplyScalar(scale)
    miguelModel.position.set(-center.x * scale, -box.min.y * scale - 0.3, -center.z * scale)

    miguelModel.traverse((child) => {
      if (child.isMesh) child.castShadow = child.receiveShadow = true
    })

    miguelGroup.add(miguelModel)

    const padding = 0.2
    const caseWidth = Math.max(scaledSize.x, scaledSize.z) + padding * 2
    const caseHeight = scaledSize.y + padding

    glassCase = new THREE.Mesh(new THREE.BoxGeometry(caseWidth, caseHeight, caseWidth), glassMaterial)
    glassCase.position.set(0, -0.3 + caseHeight / 2, 0)
    scene.add(glassCase)
  },
  undefined,
  (error) => console.error('Error cargando modelo:', error)
)

// --- 9. ILUMINACIÓN AMBIENTAL Y FOCAL ---
const gallerySpotlight = new THREE.SpotLight('#ffe8d6', 160, 12, Math.PI / 4, 0.3, 2)
gallerySpotlight.position.set(0, 4.5, 1.5)
gallerySpotlight.castShadow = true
gallerySpotlight.shadow.mapSize.set(2048, 2048)
gallerySpotlight.shadow.bias = -0.0001
gallerySpotlight.target.position.set(0, -0.3, 0)

const wallSpotlight = new THREE.SpotLight('#8ab4f8', 60, 15, Math.PI / 3, 0.8, 1.5)
wallSpotlight.position.set(0, 6, 2)
wallSpotlight.target = wallGroup.children[0]

scene.add(gallerySpotlight.target, gallerySpotlight, wallSpotlight, new THREE.AmbientLight('#ffffff', 0.7))

// --- 10. CONFIGURACIÓN DEL RENDERIZADOR Y CÁMARA ---
const sizes = { width: window.innerWidth, height: window.innerHeight }
const camera = new THREE.PerspectiveCamera(55, sizes.width / sizes.height, 0.1, 300)
camera.position.set(0, 0.8, 5.5)
scene.add(camera)
const canvas = document.querySelector('canvas.webgl') || document.createElement('canvas')
if (!document.body.contains(canvas)) {
  canvas.className = 'webgl'
  document.body.appendChild(canvas)
}

const controls = new OrbitControls(camera, canvas)
Object.assign(controls, {
  enableDamping: true,
  maxPolarAngle: Math.PI / 2 - 0.01,
  minDistance: 3,
  maxDistance: 10,
  maxAzimuthAngle: Math.PI / 4,
  minAzimuthAngle: -Math.PI / 4,
  enablePan: false
})

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1

// --- 11. EVENTOS (CLICK, MOUSEMOVE CON HOVER Y KEYDOWN) ---
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredObject = null
let isLightOn = true

// Hover Detection (Raycaster + Normalización)
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / sizes.width) * 2 - 1
  mouse.y = -(event.clientY / sizes.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(spheres)

  if (intersects.length > 0) {
    const object = intersects[0].object
    if (hoveredObject !== object) {
      if (hoveredObject) hoveredObject.scale.set(1, 1, 1)
      hoveredObject = object
      document.body.style.cursor = 'pointer'
      gsap.to(object.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.2 })
    }
  } else {
    if (hoveredObject) {
      gsap.to(hoveredObject.scale, { x: 1, y: 1, z: 1, duration: 0.2 })
      hoveredObject = null
      document.body.style.cursor = 'default'
    }
  }
})

// Evento de Click
window.addEventListener('click', () => {
  raycaster.setFromCamera(mouse, camera)

  const targets = [...spheres]
  if (glassCase) targets.push(glassCase)
  if (miguelModel) targets.push(miguelModel)

  const intersects = raycaster.intersectObjects(targets, true)

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object
    const sphereIndex = spheres.indexOf(clickedObject)

    if (sphereIndex !== -1) {
      triggerSphereBounce(clickedObject, sphereIndex)
    } else {
      isLightOn = !isLightOn
      gallerySpotlight.intensity = isLightOn ? 160 : 0
    }
  }
})

// Evento de Teclado (Tecla Space cambia el ambiente)
let isAlternativeBg = false
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    isAlternativeBg = !isAlternativeBg
    scene.background = new THREE.Color(isAlternativeBg ? '#2c3e50' : '#86c7b9')
  }
})

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// --- 12. BUCLE DE ANIMACIÓN CON MATH.SIN() Y ROTACIÓN LINEAL ---
const clock = new THREE.Clock()

const tick = () => {
  controls.update()
  const elapsedTime = clock.getElapsedTime()

  // 1. Animación Lineal
  if (miguelModel) {
    miguelGroup.rotation.y = elapsedTime * 0.25
  }
matcapSphere.rotation.y += 0.01
  // 2. Animación Oscilatoria con Math.sin() sobre la luz focal Z
  gallerySpotlight.position.z = 1.5 + Math.sin(elapsedTime * 2) * 0.3

stats.update()


  renderer.render(scene, camera)
  window.requestAnimationFrame(tick)
}

tick()