import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import * as THREE from 'three'
import { Pane } from '../public/js/lib/tweakpane.min.js'
import { ScenesManager } from '../src/js/ScenesManager'
import { HandControls } from '../src/js/HandControls'
import { MediaPipeHands } from '../src/js/MediaPipeHands'

const Home = () => {
  const [webcamEnabled, setWebcamEnabled] = useState(false)
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const [paneVisible, setPaneVisible] = useState(true) // State for pane visibility
  const handControlsRef = useRef(null)
  const canvasRef = useRef(null)
  const paneRef = useRef(null) // Ref for the pane

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enableWebcamButton = document.getElementById('webcamButton')
      const videoElement = document.getElementById('inputVideo')
      const screenPoint = document.getElementById('screenPoint')
      const showPane = document.getElementById('showPane')

      showPane.style = `position:fixed;top:0;right:0;z-index:99`

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Set canvas dimensions
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      let mediaPipeHands

      const handleWebcamButtonClick = async e => {
        e.preventDefault()
        enableWebcamButton.remove()
        setWebcamEnabled(true)

        mediaPipeHands = new MediaPipeHands(videoElement, landmarks => {
          handControlsRef.current.update(landmarks)
        })
      }

      enableWebcamButton.addEventListener('click', handleWebcamButtonClick)

      ScenesManager.setup()

      const cursorMat = new THREE.MeshNormalMaterial({
        depthTest: false,
        depthWrite: false
      })
      const cursor = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 32, 16),
        cursorMat
      )
      ScenesManager.scene.add(cursor)

      const objects = []
      const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15)
      const object = new THREE.Mesh(
        geometry,
        new THREE.MeshNormalMaterial({ transparent: true })
      )

      const modelPath =
        '/objects/ferrari_550_barchetta_2000_azzurro_hyperion.glb'
      handControlsRef.current = new HandControls(
        cursor,
        objects,
        ScenesManager.renderer,
        ScenesManager.camera,
        ScenesManager.scene,
        true,
        modelPath
      )

      const PARAMS = {
        showLandmark: false,
        webcamEnabled,
        radius: 200,
        handLandmarkX: 0.5,
        handLandmarkY: 0.5,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        resetPositionAndRotation: () => {
          handControlsRef.current.resetPositionAndRotation()
        }
      }

      // Draw the circular area
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2

      const drawCircle = radius => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      drawCircle(PARAMS.radius)

      //每一帧动画的数据
      ScenesManager.renderer.setAnimationLoop(() => {
        const PinchingStatus = handControlsRef.current.animate()
        ScenesManager.render(PinchingStatus)
        const { position } = handControlsRef.current.getScreenPoint()
        // console.log('screenPoint2D:', handControlsRef.current.getScreenPoint())
        if (position && position.x) {
          screenPoint.style.left = position.x + 'px'
          screenPoint.style.top = position.y + 'px'

          // Check if the position is within the circle
          const dx = position.x - centerX
          const dy = position.y - centerY
          if (dx * dx + dy * dy <= PARAMS.radius * PARAMS.radius) {
            // console.log('Hit the target!')
            handControlsRef.current.hitTheTarget = true
          } else {
            handControlsRef.current.hitTheTarget = false
            handControlsRef.current.PinchingStatus = false
            handControlsRef.current.toInit= true
          }

          // Determine the direction of screenPoint
          const direction = checkScreenDirection(position, centerX, centerY, 50) // Added threshold of 50
          // console.log('Direction:', direction)
          screenPoint.innerText = direction
          // 检查拇指尖的移动方向
          handControlsRef.current.checkDirection(direction)
        }
      })

      const paneContainer = document.getElementById('pane-container')
      const pane = new Pane({ container: paneContainer })
      paneRef.current = pane // Assign pane to ref

      pane.addBinding(PARAMS, 'showLandmark').on('change', ev => {
        handControlsRef.current.show3DLandmark(ev.value)
      })

      pane.addBinding(PARAMS, 'webcamEnabled').on('change', ev => {
        setWebcamEnabled(ev.value)
        if (ev.value) {
          if (mediaPipeHands) {
            mediaPipeHands.start()
          } else {
            enableWebcamButton.click()
          }
        } else {
          if (mediaPipeHands) {
            mediaPipeHands.stop()
          }
          videoElement.pause()
          videoElement.srcObject = null
        }
      })

      pane
        .addBinding(PARAMS, 'radius', {
          min: 10,
          max: Math.min(centerX, centerY)
        })
        .on('change', ev => {
          drawCircle(ev.value)
        })

      pane
        .addBinding(PARAMS, 'handLandmarkX', {
          min: 0,
          max: Math.min(centerX, centerY)
        })
        .on('change', ev => {
          handControlsRef.current.handLandmarkX = ev.value
        })

      pane
        .addBinding(PARAMS, 'handLandmarkY', {
          min: 0,
          max: Math.min(centerX, centerY)
        })
        .on('change', ev => {
          handControlsRef.current.handLandmarkY = ev.value
        })

      pane
        .addBinding(PARAMS, 'rotationX', { min: -Math.PI, max: Math.PI })
        .on('change', ev => {
          setRotation(prev => ({ ...prev, x: ev.value }))
        })
      pane
        .addBinding(PARAMS, 'rotationY', { min: -Math.PI, max: Math.PI })
        .on('change', ev => {
          setRotation(prev => ({ ...prev, y: ev.value }))
        })
      pane
        .addBinding(PARAMS, 'rotationZ', { min: -Math.PI, max: Math.PI })
        .on('change', ev => {
          setRotation(prev => ({ ...prev, z: ev.value }))
        })

      pane
        .addBinding(PARAMS, 'positionX', { min: -5, max: 5 })
        .on('change', ev => {
          setPosition(prev => ({ ...prev, x: ev.value }))
        })
      pane
        .addBinding(PARAMS, 'positionY', { min: -5, max: 5 })
        .on('change', ev => {
          setPosition(prev => ({ ...prev, y: ev.value }))
        })
      pane
        .addBinding(PARAMS, 'positionZ', { min: -5, max: 5 })
        .on('change', ev => {
          setPosition(prev => ({ ...prev, z: ev.value }))
        })

      pane
        .addButton({ title: 'Reset Position and Rotation' })
        .on('click', () => {
          PARAMS.resetPositionAndRotation()
        })

      handControlsRef.current.addEventListener('drag_start', event => {
        event.object.material.opacity = 0.4
      })
      handControlsRef.current.addEventListener('drag_end', event => {
        if (event.object) event.object.material.opacity = 1
        event.callback()
      })
      handControlsRef.current.addEventListener('collision', event => {
        if (event.state === 'on') {
          cursorMat.opacity = 0.4
        } else {
          cursorMat.opacity = 1
        }
      })

      return () => {
        enableWebcamButton.removeEventListener('click', handleWebcamButtonClick)
      }
    }
  }, [])

  useEffect(() => {
    if (handControlsRef.current) {
      handControlsRef.current.target.rotation.set(
        rotation.x,
        rotation.y,
        rotation.z
      )
      handControlsRef.current.target.position.set(
        position.x,
        position.y,
        position.z
      )
    }
  }, [rotation, position])

  // Toggle pane visibility
  const togglePaneVisibility = () => {
    if (paneRef.current) {
      paneRef.current.hidden = !paneRef.current.hidden
      setPaneVisible(!paneVisible)
    }
  }

  // Function to check the direction of screenPoint relative to centerX and centerY with a threshold
  const checkScreenDirection = (screenPoint, centerX, centerY, threshold) => {
    const { x, y } = screenPoint
    const dx = x - centerX
    const dy = y - centerY

    if (Math.sqrt(dx * dx + dy * dy) < threshold) {
      return 'center'
    }
    if (y < centerY && Math.abs(y - centerY) > Math.abs(x - centerX)) {
      return 'up'
    } else if (y > centerY && Math.abs(y - centerY) > Math.abs(x - centerX)) {
      return 'down'
    } else if (x < centerX && Math.abs(x - centerX) > Math.abs(y - centerY)) {
      return 'left'
    } else if (x > centerX && Math.abs(x - centerX) > Math.abs(y - centerY)) {
      return 'right'
    } else {
      return 'center'
    }
  }

  return (
    <>
      <Head>
        <meta charSet='utf-8' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, shrink-to-fit=no'
        />
        <title>Webcam 3D HandControls - Mediapipe + Three.js</title>
      </Head>
      <div id='app'></div>
      <video id='inputVideo' playsInline autoPlay muted></video>
      <button id='webcamButton'>CLICK TO ENABLE WEBCAM</button>
      <button onClick={togglePaneVisibility} id='showPane'>
        {paneVisible ? 'Hide Pane' : 'Show Pane'}
      </button>
      <div id='pane-container'></div>
      <div id='screenPoint' className="glowing-dot">
        POINT
      </div>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none' }}
      ></canvas>
      <Script src='/js/lib/camera_utils.js' strategy='beforeInteractive' />
      <Script src='/js/lib/hands.js' strategy='beforeInteractive' />
      <Script
        type='module'
        src='/js/lib/tweakpane.min.js'
        strategy='beforeInteractive'
      />
    </>
  )
}

export default Home
