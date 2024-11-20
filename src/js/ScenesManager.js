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
  Float32BufferAttribute,
  Vector2
} from 'three'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

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
    dirLight.castShadow = true // Enable shadow casting for directional light
    dirLight.name = 'dirLight'
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
    light.name = 'spotLight' // Add name to the light for easy reference
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
    target.castShadow = true // Enable shadow casting for the target object
    target.receiveShadow = true // Enable shadow receiving for the target object
    ScenesManager.scene.add(target)

    // Save camera position and rotation to local storage on change
    ScenesManager.controls.addEventListener(
      'change',
      ScenesManager.saveCameraState
    )

    // Create particle system
    // 改进粒子系统
    const particles = new BufferGeometry()
    const particleCount = 1000 // 增加粒子数量
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3) // 添加颜色数组

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10

      // 添加随机颜色
      colors[i * 3] = Math.random()
      colors[i * 3 + 1] = Math.random()
      colors[i * 3 + 2] = Math.random()
    }

    particles.setAttribute('position', new Float32BufferAttribute(positions, 3))
    particles.setAttribute('color', new Float32BufferAttribute(colors, 3))

    const particleMaterial = new PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    })

    ScenesManager.particleSystem = new Points(particles, particleMaterial)
    ScenesManager.scene.add(ScenesManager.particleSystem)
    ScenesManager.particleSystem.visible = false // Initially hide the particle system

    // Call setupPostProcessing to initialize composer
    ScenesManager.setupPostProcessing()
  }
  // 添加动画更新方法
  static animateParticles () {
    const time = Date.now() * 0.001
    const positions =
      ScenesManager.particleSystem.geometry.attributes.position.array

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time + positions[i]) * 0.01
      positions[i] += Math.cos(time + positions[i + 2]) * 0.01
    }

    ScenesManager.particleSystem.geometry.attributes.position.needsUpdate = true
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

  static setupPostProcessing () {
    const renderPass = new RenderPass(ScenesManager.scene, ScenesManager.camera)

    const bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      1.5, // 强度
      0.4, // 半径
      0.85 // 阈值
    )

    ScenesManager.composer = new EffectComposer(ScenesManager.renderer)
    ScenesManager.composer.addPass(renderPass)
    ScenesManager.composer.addPass(bloomPass)
  }
  // Render the scene
  static render (particleVisible) {
    ScenesManager.controls.update()

    // Show or hide particle system based on  particleVisible
    if (particleVisible) {
      ScenesManager.particleSystem.visible = true
      ScenesManager.animateParticles() // 添加粒子动画
    } else {
      ScenesManager.particleSystem.visible = false
    }

    ScenesManager.composer.render()
  }

  // Method to enable/disable shadows
  static setShadowEnabled (enabled) {
    ScenesManager.renderer.shadowMap.enabled = enabled
    ScenesManager.scene.traverse(object => {
      if (object.isMesh) {
        object.castShadow = enabled
        object.receiveShadow = enabled
      }
    })
  }
}
