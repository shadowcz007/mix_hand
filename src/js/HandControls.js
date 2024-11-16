import * as THREE from '../../public/js/lib/three.module.js'
import { GLTFLoader } from '../../public/js/lib/GLTFLoader.js'

// The HandControls class extends THREE.EventDispatcher to handle hand controls in a 3D scene.
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
    this.target = target // An Object3D to be used as cursor
    this.objects = objects // An array of draggable objects
    this.isDraggable = isDraggable // A boolean to determine if the element must be draggable after hit
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

    // Create a plane for debugging the palm
    this.palmPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.2),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        wireframe: true
      })
    )
    this.scene.add(this.palmPlane)

    if (modelPath) {
      this.loadModel(modelPath)
    }
  }

  // Load 3D model as cursor
  loadModel (modelPath) {
    const loader = new GLTFLoader()
    loader.load(modelPath, gltf => {
      this.target = gltf.scene
      this.scene.add(this.target)
    })
  }

  // Show or hide 3D landmarks
  show3DLandmark (value) {
    if (!this.handsObj) {
      this.handsObj = new THREE.Object3D()
      this.scene.add(this.handsObj)

      this.createHand()
    }

    this.sphereMat.opacity = value ? 1 : 0
  }

  // Conversion from Polar to Cartesian - Function from THREE.js CSSRenderer
  to2D (object) {
    if (!this.renderer) {
      console.error('A valid renderer must be used.')
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

  // Create hand landmarks
  createHand () {
    this.sphereMat = new THREE.MeshNormalMaterial({
      transparent: true,
      opacity: this.showLandmark ? 1 : 0
    })
    const sphereGeo = new THREE.SphereGeometry(0.025, 8, 4)
    const sphereMesh = new THREE.Mesh(sphereGeo, this.sphereMat)
    for (let i = 0; i < 21; i++) {
      const sphereMeshClone = sphereMesh.clone()
      sphereMeshClone.renderOrder = 2
      this.handsObj.add(sphereMeshClone)
    }
  }

  // Update hand landmarks based on detected hand positions
  update (landmarks) {
    if (landmarks && landmarks.multiHandLandmarks.length === 1) {
      if (this.handsObj) {
        // Update the position of the objects for the single detected hand
        for (let l = 0; l < 21; l++) {
          this.handsObj.children[l].position.x =
            -landmarks.multiHandLandmarks[0][l].x + 0.5
          this.handsObj.children[l].position.y =
            -landmarks.multiHandLandmarks[0][l].y + 0.5
          this.handsObj.children[l].position.z =
            -landmarks.multiHandLandmarks[0][l].z
          this.handsObj.children[l].position.multiplyScalar(4)
        }
      }
      // Main points to control gestures
      this.gestureCompute.depthFrom
        .set(
          -landmarks.multiHandLandmarks[0][0].x + 0.5,
          -landmarks.multiHandLandmarks[0][0].y + 0.5,
          -landmarks.multiHandLandmarks[0][0].z
        )
        .multiplyScalar(4)
      this.gestureCompute.depthTo
        .set(
          -landmarks.multiHandLandmarks[0][10].x + 0.5,
          -landmarks.multiHandLandmarks[0][10].y + 0.5,
          -landmarks.multiHandLandmarks[0][10].z
        )
        .multiplyScalar(4)
      this.gestureCompute.from
        .set(
          -landmarks.multiHandLandmarks[0][9].x + 0.5,
          -landmarks.multiHandLandmarks[0][9].y + 0.5,
          -landmarks.multiHandLandmarks[0][9].z
        )
        .multiplyScalar(4)
      this.gestureCompute.to
        .set(
          -landmarks.multiHandLandmarks[0][12].x + 0.5,
          -landmarks.multiHandLandmarks[0][12].y + 0.5,
          -landmarks.multiHandLandmarks[0][12].z
        )
        .multiplyScalar(4)

      // Calculate rotation quaternion
      const handDirection = new THREE.Vector3().subVectors(
        this.gestureCompute.to,
        this.gestureCompute.from
      )
      const handUp = new THREE.Vector3(0, 1, 0)
      const handRight = new THREE.Vector3()
        .crossVectors(handUp, handDirection)
        .normalize()
      handUp.crossVectors(handDirection, handRight).normalize()
      const rotationMatrix = new THREE.Matrix4().makeBasis(
        handRight,
        handUp,
        handDirection.normalize()
      )
      this.gestureCompute.rotation.setFromRotationMatrix(rotationMatrix)

      // Update the palm plane for debugging
      this.palmPlane.position.copy(this.gestureCompute.from)
      this.palmPlane.quaternion.copy(this.gestureCompute.rotation)

      // Detect closed fist gesture based on distance between two points
      const pointsDist = this.gestureCompute.from.distanceTo(
        this.gestureCompute.to
      )
      this.closedFist = pointsDist < 0.35

      // Convert edge points from landmark to cartesian points for depth calculation
      this.refObjFrom.position.copy(this.gestureCompute.depthFrom)
      const depthA = this.to2D(this.refObjFrom)
      this.depthPointA.set(depthA.x, depthA.y)

      this.refObjTo.position.copy(this.gestureCompute.depthTo)
      const depthB = this.to2D(this.refObjTo)
      this.depthPointB.set(depthB.x, depthB.y)

      const depthDistance = this.depthPointA.distanceTo(this.depthPointB)
      this.depthZ = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(depthDistance, 0, 1000, -3, 5),
        -2,
        4
      )

      this.target.position.set(
        this.gestureCompute.from.x,
        this.gestureCompute.from.y,
        -this.depthZ
      )

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

  // Animate the hand controls
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
    // If closedFist is true, the object will follow the target (cursor)
    if (this.selected && this.closedFist && this.isDraggable) {
      this.selected.position.lerp(this.target.position, 0.3)
      this.selected.quaternion.slerp(this.gestureCompute.rotation, 0.3)
    }
  }
}
