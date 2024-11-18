import * as THREE from '../../public/js/lib/three.module.js'
import { GLTFLoader } from '../../public/js/lib/GLTFLoader.js'

function throttle(func, wait) {
  let lastTime = 0;
  return function(...args) {
      const now = new Date().getTime();
      if (now - lastTime >= wait) {
          lastTime = now;
          func.apply(this, args);
      }
  };
}

// HandControls 类继承自 THREE.EventDispatcher，用于在 3D 场景中处理手部控制。
export class HandControls extends THREE.EventDispatcher {
  constructor (
    target,
    objects,
    renderer,
    camera,
    scene,
    isDraggable = false,
    modelPath = null
  ) {
    super()
    this.target = target // 用作光标的 Object3D
    this.objects = objects // 可拖动对象的数组
    this.isDraggable = isDraggable // 布尔值，确定元素在命中后是否可拖动
    this.renderer = renderer
    this.camera = camera
    this.scene = scene

    this.viewProjectionMatrix = new THREE.Matrix4()
    this.objectBox3 = new THREE.Box3()
    this.targetBox3 = new THREE.Box3()
    this.depthPointA = new THREE.Vector3()
    this.depthPointB = new THREE.Vector3()
    this.refObjFrom = new THREE.Object3D()
    this.scene.add(this.refObjFrom)
    this.refObjTo = new THREE.Object3D()
    this.scene.add(this.refObjTo)

    this.objects.forEach(obj => (obj.userData.hasCollision = false))

    this.pointsDist = 0
    this.distanceToGrab = 0.25
    this.gestureCompute = {
      depthFrom: new THREE.Vector3(),
      depthTo: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      rotation: new THREE.Quaternion()
    }

    // 创建一个用于调试手掌的平面
    this.createPalmPlane()

    if (modelPath) {
      this.loadModel(modelPath)
    }
  }

  createPalmPlane () {
    if (!this.palmPlane) {
      // 创建一个平面
      const planeGeometry = new THREE.PlaneGeometry(5, 5)
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide
      })
      this.palmPlane = new THREE.Mesh(planeGeometry, planeMaterial)

      // 将平面添加到场景
      this.scene.add(this.palmPlane)
    }
  }

  // 加载 3D 模型作为光标
  loadModel (modelPath) {
    const loader = new GLTFLoader()
    loader.load(modelPath, gltf => {
      this.target = gltf.scene
      this.scene.add(this.target)
    })
  }

  // 显示或隐藏 3D 地标
  show3DLandmark (value) {
    if (!this.handsObj) {
      this.handsObj = new THREE.Object3D()
      this.scene.add(this.handsObj)
      this.handsObjMats = []
      this.createHand()
    }

    for (const sphereMat of this.handsObjMats) {
      sphereMat.opacity = value ? 1 : 0
    }
  }

  // 从极坐标转换为笛卡尔坐标 - 来自 THREE.js CSSRenderer 的函数
  to2D (object) {
    if (!this.renderer) {
      console.error('必须使用有效的渲染器。')
      return
    }
    const rect = this.renderer.domElement.getBoundingClientRect()
    const width = rect.width,
      height = rect.height
    const widthHalf = width / 2,
      heightHalf = height / 2
    const vector = new THREE.Vector3()
    vector.setFromMatrixPosition(object.matrixWorld)
    vector.applyMatrix4(this.viewProjectionMatrix)

    return {
      x: vector.x * widthHalf + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    }
  }

  // 创建手部地标

  createHand () {
    const sphereGeo = new THREE.SphereGeometry(0.025, 8, 4)
    for (let i = 0; i < 21; i++) {
      let r = [0, 10, 9, 12].includes(i)
        ? [255, 0, 0]
        : [Math.random(), Math.random(), Math.random()]
      if (i == 0) {
        r = [0, 255, 0]
        // 0 绿色，手掌根部
      }
      if (i == 12) {
        r = [0, 0, 255] //中指指尖
      }

      const color = new THREE.Color(...r) // 生成随机颜色
      const sphereMat = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 1
      })
      this.handsObjMats.push(sphereMat)
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
      sphereMesh.renderOrder = 2
      this.handsObj.add(sphereMesh)
    }
  }

  // 根据检测到的手部位置更新手部地标
  update (landmarks) {
    if (landmarks && landmarks.multiHandLandmarks.length === 1) {
      const getPosition = landmark => {
        const position = new THREE.Vector3(
          -landmark.x + 0.5,
          -landmark.y + 0.5,
          -landmark.z
        )
        position.multiplyScalar(4)
        return position
      }

      if (this.handsObj) {
        // 更新单个检测到的手部对象的位置
        for (let l = 0; l < 21; l++) {
          const pos = getPosition(landmarks.multiHandLandmarks[0][l])
          this.handsObj.children[l].position.copy(pos)
        }

        // 更新用于调试的手掌平面
        // this.palmPlane.position.copy(this.gestureCompute.from)
        // this.palmPlane.quaternion.copy(this.gestureCompute.rotation)
      }
      
      function isPinching (thumbTip, indexTip, threshold = 0.5) {
        // 计算欧几里得距离
        const distance = thumbTip.distanceTo(indexTip)

        // 如果距离小于阈值，返回 true
        return distance < threshold
      }

      // 假设你有拇指和食指的指尖位置

      const thumbTip = getPosition(landmarks.multiHandLandmarks[0][4]) // 编号 4 拇指指尖
      const indexTip = getPosition(landmarks.multiHandLandmarks[0][8]) // 编号 8 食指指尖

      if (isPinching(thumbTip, indexTip)) {
        console.log('Pinching!')
        this.closedFist = true
      } else {
        console.log('Not pinching.')
        this.closedFist = false
      }

      if (this.closedFist) {
        this.target.position.set(thumbTip.x, thumbTip.y, -thumbTip.z)
      }

      if (!this.closedFist) {
        this.dispatchEvent({
          type: 'closed_fist'
        })

        this.dispatchEvent({
          type: 'drag_end',
          object: this.selected,
          callback: () => {
            this.selected = null
          }
        })
      } else {
        this.selected = null
        this.dispatchEvent({
          type: 'opened_fist'
        })
      }
    }
  }

  // 动画手部控制
  animate () {
    if (!this.target) return

    this.targetBox3.setFromObject(this.target)
    this.objects.forEach(obj => {
      this.objectBox3.setFromObject(obj)
      const targetCollision = this.targetBox3.intersectsBox(this.objectBox3)
      if (targetCollision) {
        obj.userData.hasCollision = true
        if (this.closedFist && !this.selected && this.isDraggable) {
          this.selected = obj
          this.dispatchEvent({
            type: 'drag_start',
            object: obj
          })
        }
        this.dispatchEvent({
          type: 'collision',
          state: 'on',
          object: obj
        })
        obj.material.opacity = 0.4
      } else {
        obj.material.opacity = 1
        if (!this.selected) {
          this.dispatchEvent({
            type: 'collision',
            state: 'off',
            object: null
          })
        }
      }
    })
    // 如果 closedFist 为 true，则对象将跟随目标（光标）
    if (this.selected && this.closedFist && this.isDraggable) {
      this.selected.position.lerp(this.target.position, 0.3)
      this.selected.quaternion.slerp(this.gestureCompute.rotation, 0.3)
    }
  }
}
