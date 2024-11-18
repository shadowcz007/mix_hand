import * as THREE from '../../public/js/lib/three.module.js'
import { GLTFLoader } from '../../public/js/lib/GLTFLoader.js'

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

    if (modelPath) {
      this.loadModel(modelPath)
    }

    this.pinchingTimeout = null;
    this.pinchingStartTime = null;
    this.previousThumbTipPosition = null; // 用于存储上一个拇指尖的位置
    this.thumbTipDirectionStartTime = null; // 用于存储拇指尖移动方向的开始时间
    this.currentDirection = null; // 用于存储当前的移动方向
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
      }
      
      // 检查是否在捏合
      this.checkPinching(getPosition(landmarks.multiHandLandmarks[0][4]), getPosition(landmarks.multiHandLandmarks[0][8]));

      // 检查拇指尖的移动方向
      this.checkThumbTipDirection(getPosition(landmarks.multiHandLandmarks[0][4]));
    }
  }

  // 检查拇指尖的移动方向
  checkThumbTipDirection (thumbTip) {
    if (this.previousThumbTipPosition) {
      const deltaX = thumbTip.x - this.previousThumbTipPosition.x;
      const deltaY = thumbTip.y - this.previousThumbTipPosition.y;
      let newDirection = null;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          newDirection = 'right';
        } else {
          newDirection = 'left';
        }
      } else {
        if (deltaY > 0) {
          newDirection = 'up';
        } else {
          newDirection = 'down';
        }
      }

      if (newDirection !== this.currentDirection) {
        this.currentDirection = newDirection;
        this.thumbTipDirectionStartTime = Date.now();
      } else if (Date.now() - this.thumbTipDirectionStartTime > 200) {
        switch (this.currentDirection) {
          case 'right':
            console.log(10);
            this.target.rotation.y -= Math.PI / 8; // 向右旋转
            break;
          case 'left':
            console.log(-10);
            this.target.rotation.y += Math.PI / 8; // 向左旋转
            break;
          case 'up':
            console.log(20);
            this.target.rotation.x -= Math.PI / 8; // 向上旋转
            break;
          case 'down':
            console.log(-20);
            this.target.rotation.x += Math.PI / 8; // 向下旋转
            break;
        }
      }
    }
    this.previousThumbTipPosition = thumbTip.clone();
  }

  // 检查是否在捏合
  checkPinching (thumbTip, indexTip, threshold = 0.5) {
    // 计算欧几里得距离
    const distance = thumbTip.distanceTo(indexTip)

    // 如果距离小于阈值，返回 true
    if (distance < threshold) {
      console.log('Pinching!')
      if (!this.pinchingStartTime) {
        this.pinchingStartTime = Date.now();
      }

      if (Date.now() - this.pinchingStartTime >= 200) {
        this.closedFist = true;
      }

      if (this.pinchingTimeout) {
        clearTimeout(this.pinchingTimeout);
        this.pinchingTimeout = null;
      }
    } else {
      console.log('Not pinching.')
      this.pinchingStartTime = null;
      if (!this.pinchingTimeout) {
        this.pinchingTimeout = setTimeout(() => {
          this.closedFist = false;
          this.pinchingTimeout = null;
        }, 2000);
      }
    }

    if (this.closedFist) {
      this.smoothTransitionToPosition(this.target.position, thumbTip);
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

  // 平滑过渡到目标位置
  smoothTransitionToPosition(currentPosition, targetPosition, duration = 0.3) {
    currentPosition.lerp(targetPosition, duration);
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
