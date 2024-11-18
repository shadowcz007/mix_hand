import {
  Scene,
  PerspectiveCamera,
  Color,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  SpotLight,
  Clock,
  AxesHelper,
  Object3D,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute
} from '../../public/js/lib/three.module.js'

import { OrbitControls } from '../../public/js/lib/OrbitControls.js'

// The ScenesManager class sets up and manages the 3D scene, camera, and renderer.
export class ScenesManager {
  static scene
  static camera
  static renderer
  static clock
  static controls

  static particleSystem // Add particleSystem

  // Set up the scene, camera, and renderer
  static setup () {
    ScenesManager.scene = new Scene()
    ScenesManager.scene.background = new Color(0xcccccc)

    ScenesManager.camera = new PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    )

    // Load camera position and rotation from local storage
    const cameraPosition = JSON.parse(localStorage.getItem('cameraPosition'))
    const cameraRotation = JSON.parse(localStorage.getItem('cameraRotation'))

    if (cameraPosition) {
      ScenesManager.camera.position.set(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z
      )
    } else {
      const isMobile = window.innerWidth < window.innerHeight
      ScenesManager.camera.position.set(0, 0, isMobile ? 4 : 2)
    }

    if (cameraRotation) {
      ScenesManager.camera.rotation.set(
        cameraRotation._x,
        cameraRotation._y,
        cameraRotation._z
      )
    }

    ScenesManager.clock = new Clock()

    ScenesManager.renderer = new WebGLRenderer({ antialias: true })
    ScenesManager.renderer.setSize(window.innerWidth, window.innerHeight)
    ScenesManager.renderer.setPixelRatio(window.devicePixelRatio)
    ScenesManager.renderer.shadowMap.enabled = true

    const ambLight = new AmbientLight(0xffffff, 1)
    ScenesManager.scene.add(ambLight)
    const dirLight = new DirectionalLight(0xffffff, 1)
    dirLight.position.set(-30, 30, 30)
    ScenesManager.scene.add(dirLight)

    const light = new SpotLight(0xffffff, 4.5)
    light.position.set(0, 10, 5)
    light.angle = Math.PI * 0.2
    light.decay = 0
    light.castShadow = true
    light.shadow.camera.near = 0.1
    light.shadow.camera.far = 500
    light.shadow.bias = -0.000222
    light.shadow.mapSize.width = 1024
    light.shadow.mapSize.height = 1024
    ScenesManager.scene.add(light)

    const axesHelper = new AxesHelper(5)
    ScenesManager.scene.add(axesHelper)

    ScenesManager.controls = new OrbitControls(
      ScenesManager.camera,
      ScenesManager.renderer.domElement
    )
    ScenesManager.controls.enableDamping = true
    ScenesManager.controls.dampingFactor = 0.25
    ScenesManager.controls.screenSpacePanning = false
    ScenesManager.controls.maxPolarAngle = Math.PI / 2

    ScenesManager.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(ScenesManager.renderer.domElement)

    // Instantiate HandControls
    const target = new Object3D()
    ScenesManager.scene.add(target)

    // Save camera position and rotation to local storage on change
    ScenesManager.controls.addEventListener(
      'change',
      ScenesManager.saveCameraState
    )

    // Create particle system
    const particles = new BufferGeometry()
    const particleCount = 100
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * 5
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * 5
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * 5
    }

    particles.setAttribute('position', new Float32BufferAttribute(positions, 3))

    const particleMaterial = new PointsMaterial({ color: 0xffffff })
    ScenesManager.particleSystem = new Points(particles, particleMaterial)
    ScenesManager.scene.add(ScenesManager.particleSystem)
    ScenesManager.particleSystem.visible = false // Initially hide the particle system
  }

  // Save camera position and rotation to local storage
  static saveCameraState () {
    const cameraPosition = {
      x: ScenesManager.camera.position.x,
      y: ScenesManager.camera.position.y,
      z: ScenesManager.camera.position.z
    }
    const cameraRotation = {
      _x: ScenesManager.camera.rotation.x,
      _y: ScenesManager.camera.rotation.y,
      _z: ScenesManager.camera.rotation.z
    }
    localStorage.setItem('cameraPosition', JSON.stringify(cameraPosition))
    localStorage.setItem('cameraRotation', JSON.stringify(cameraRotation))
  }

  // Render the scene
  static render (closedFist) {
    ScenesManager.controls.update()

    // Show or hide particle system based on  closedFist
    if (closedFist) {
      ScenesManager.particleSystem.visible = true
    } else {
      ScenesManager.particleSystem.visible = false
    }

    ScenesManager.renderer.render(ScenesManager.scene, ScenesManager.camera)
  }
}
