import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import * as THREE from '../public/js/lib/three.module.js'
import { Pane } from '../public/js/lib/tweakpane.min.js'
import { ScenesManager } from '../src/js/ScenesManager'
import { HandControls } from '../src/js/HandControls'
import { MediaPipeHands } from '../src/js/MediaPipeHands'

const Home = () => {
  const [webcamEnabled, setWebcamEnabled] = useState(false)
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const handControlsRef = useRef(null)

  useEffect(() => {
    const enableWebcamButton = document.getElementById('webcamButton')
    const videoElement = document.getElementById('inputVideo')
    const screenPoint = document.getElementById('screenPoint')

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
    // for (let i = 0; i < 5; i++) {
    //   const mat = new THREE.MeshNormalMaterial({ transparent: true })
    //   const _object = object.clone()
    //   _object.material = mat

    //   _object.position.x = Math.random() * 2 - 1
    //   _object.position.y = Math.random() * 0.5 - 0.25
    //   _object.position.z = Math.random() * 2 - 1

    //   _object.rotation.x = Math.random() * 2 * Math.PI
    //   _object.rotation.y = Math.random() * 2 * Math.PI
    //   _object.rotation.z = Math.random() * 2 * Math.PI

    //   _object.castShadow = true
    //   _object.receiveShadow = true

    //   ScenesManager.scene.add(_object)
    //   objects.push(_object)
    // }

    const modelPath = '/objects/ferrari_550_barchetta_2000_azzurro_hyperion.glb'
    handControlsRef.current = new HandControls(
      cursor,
      objects,
      ScenesManager.renderer,
      ScenesManager.camera,
      ScenesManager.scene,
      true,
      modelPath
    )

    //每一帧动画的数据
    ScenesManager.renderer.setAnimationLoop(() => {
      const closedFist = handControlsRef.current.animate()
      ScenesManager.render(closedFist)
      const { position } = handControlsRef.current.getScreenPoint()
      console.log('screenPoint2D:', handControlsRef.current.getScreenPoint())
      if (position && position.x) {
        screenPoint.style.left = position.x + 'px'
        screenPoint.style.top = position.y + 'px'
      }
    })

    const paneContainer = document.getElementById('pane-container')
    const pane = new Pane({ container: paneContainer })
    const PARAMS = {
      showLandmark: false,
      webcamEnabled,
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

    pane.addButton({ title: 'Reset Position and Rotation' }).on('click', () => {
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
  }, [])

  useEffect(() => {
    // console.log('###change', position, rotation, handControlsRef.current)
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
      <div id='pane-container'></div>
      <div id='screenPoint' style={{ position: 'fixed' }}>
        POINT
      </div>
      <Script src='/js/lib/camera_utils.js' strategy='beforeInteractive' />
      <Script src='/js/lib/hands.js' strategy='beforeInteractive' />
      <Script
        type='module'
        src='/js/lib/three.module.js'
        strategy='beforeInteractive'
      />
      <Script
        type='module'
        src='/js/lib/tweakpane.min.js'
        strategy='beforeInteractive'
      />
    </>
  )
}

export default Home
