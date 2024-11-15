import React, { useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import * as THREE from '../public/js/lib/three.module.js';
import { ScenesManager } from '../src/js/ScenesManager';
import { HandControls } from '../src/js/HandControls';
import { MediaPipeHands } from '../src/js/MediaPipeHands';

const Home = () => {
  useEffect(() => {
    const enableWebcamButton = document.getElementById("webcamButton");
    const videoElement = document.getElementById("inputVideo");

    const handleWebcamButtonClick = async (e) => {
      e.preventDefault();
      enableWebcamButton.remove();

      const mediaPipeHands = new MediaPipeHands(videoElement, (landmarks) => {
        handControls.update(landmarks);
      });
      mediaPipeHands.start();
    };

    enableWebcamButton.addEventListener("click", handleWebcamButtonClick);

    ScenesManager.setup();

    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 32, 16),
      new THREE.MeshNormalMaterial({ depthTest: false, depthWrite: false })
    );
    ScenesManager.scene.add(cursor);

    const objects = [];
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const object = new THREE.Mesh(
      geometry,
      new THREE.MeshNormalMaterial({ transparent: true })
    );
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshNormalMaterial({ transparent: true });
      const _object = object.clone();
      _object.material = mat;

      _object.position.x = Math.random() * 2 - 1;
      _object.position.y = Math.random() * 0.5 - 0.25;
      _object.position.z = Math.random() * 2 - 1;

      _object.rotation.x = Math.random() * 2 * Math.PI;
      _object.rotation.y = Math.random() * 2 * Math.PI;
      _object.rotation.z = Math.random() * 2 * Math.PI;

      _object.castShadow = true;
      _object.receiveShadow = true;

      ScenesManager.scene.add(_object);
      objects.push(_object);
    }

    const handControls = new HandControls(
      cursor,
      objects,
      ScenesManager.renderer,
      ScenesManager.camera,
      ScenesManager.scene,
      true
    );

    // Function to create text sprite
    const createTextSprite = (text) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '24px Arial';
      context.fillStyle = 'rgba(255, 255, 255, 1.0)';
      context.fillText(text, 0, 24);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.5, 0.25, 1.0);
      return sprite;
    };

    // Create and add text sprites for each object
    const textSprites = objects.map((obj) => {
      const textSprite = createTextSprite(`(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
      textSprite.position.copy(obj.position);
      ScenesManager.scene.add(textSprite);
      return textSprite;
    });

    // Update text sprites positions and text
    const updateTextSprites = () => {
      textSprites.forEach((sprite, index) => {
        const obj = objects[index];
        sprite.position.copy(obj.position);
        const canvas = sprite.material.map.image;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillText(`(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`, 0, 24);
        sprite.material.map.needsUpdate = true;
      });
    };

    ScenesManager.renderer.setAnimationLoop(() => {
      handControls.animate();
      updateTextSprites();
      ScenesManager.render();
    });

    return () => {
      enableWebcamButton.removeEventListener("click", handleWebcamButtonClick);
    };
  }, []);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Webcam 3D HandControls - Mediapipe + Three.js</title>
      </Head>
      <div id="app"></div>
      <video id="inputVideo" playsInline autoPlay muted></video>
      <button id="webcamButton">CLICK TO ENABLE WEBCAM</button>
      <Script src="/js/lib/camera_utils.js" strategy="beforeInteractive" />
      <Script src="/js/lib/hands.js" strategy="beforeInteractive" />
      <Script type="module" src="/js/lib/three.module.js" strategy="beforeInteractive" />
      <Script type="module" src="/js/lib/tweakpane.min.js" strategy="beforeInteractive" />
    </>
  );
};

export default Home;
