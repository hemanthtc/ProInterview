"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking" | "interrupted" | "error";

export interface RealisticHumanRendererProps {
    state?: AvatarState;
    currentViseme?: string;
    visemeIntensity?: number;
    audioEnergy?: number;
    modelUrl?: string;
    transcoderPath?: string;
    className?: string;
}

export const RealisticHumanRenderer: React.FC<RealisticHumanRendererProps> = ({
    state = "idle",
    currentViseme = "sil",
    visemeIntensity = 0,
    audioEnergy = 0,
    modelUrl = "/models/facecap.glb",
    transcoderPath = "/libs/basis/",
    className = "w-full h-full",
}) => {
    const mountRef = useRef<HTMLDivElement>(null);

    // Live mutable animation references for 60fps render loop
    const animRefs = useRef({
        state,
        currentViseme,
        visemeIntensity,
        audioEnergy,
        mouseX: 0,
        mouseY: 0,
        targetGazeX: 0,
        targetGazeY: 0,
        currentGazeX: 0,
        currentGazeY: 0,
        blinkProgress: 0,
        isBlinking: false,
        nextBlinkTime: 2.0,
        breathTime: 0,
        headPitch: 0,
        headYaw: 0,
        headRoll: 0,
        weights: {
            jawOpen: 0,
            mouthFunnel: 0,
            mouthPucker: 0,
            mouthClose: 0,
            mouthSmile_L: 0,
            mouthSmile_R: 0,
            mouthUpperUp_L: 0,
            mouthUpperUp_R: 0,
            mouthLowerDown_L: 0,
            mouthLowerDown_R: 0,
            browInnerUp: 0,
            browDown_L: 0,
            browDown_R: 0,
        } as Record<string, number>,
    });

    // Keep ref synchronized with incoming props
    useEffect(() => {
        animRefs.current.state = state;
        animRefs.current.currentViseme = currentViseme;
        animRefs.current.visemeIntensity = visemeIntensity;
        animRefs.current.audioEnergy = audioEnergy;
    }, [state, currentViseme, visemeIntensity, audioEnergy]);

    // Subtle interactive mouse gaze tracking
    useEffect(() => {
        if (typeof window === "undefined") return;
        const onMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            animRefs.current.mouseX = x;
            animRefs.current.mouseY = y;
            animRefs.current.targetGazeX = x * 0.12;
            animRefs.current.targetGazeY = y * 0.08;
        };
        window.addEventListener("mousemove", onMouseMove);
        return () => window.removeEventListener("mousemove", onMouseMove);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const container = mountRef.current;
        if (!container) return;

        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        // 1. Scene & Portrait Camera Setup
        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 20);
        camera.position.set(0, 0.12, 3.35);

        // 2. High-Performance WebGL Renderer with ACES Tone Mapping
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 3. PBR Environment Reflections (RoomEnvironment)
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;

        // 4. Portrait Studio Lights (Key, Fill, Rim)
        const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.6);
        keyLight.position.set(1.4, 1.6, 2.2);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xa5b4fc, 1.2);
        fillLight.position.set(-1.8, 0.6, 1.4);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
        rimLight.position.set(0, 2.2, -1.8);
        scene.add(rimLight);

        const ambientLight = new THREE.AmbientLight(0x334155, 0.6);
        scene.add(ambientLight);

        // 5. Interactive Orbit Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(0, 0.10, -0.15);
        controls.enablePan = false;
        controls.minDistance = 2.0;
        controls.maxDistance = 4.2;
        controls.minAzimuthAngle = -Math.PI / 4;
        controls.maxAzimuthAngle = Math.PI / 4;
        controls.minPolarAngle = Math.PI / 3;
        controls.maxPolarAngle = (2 * Math.PI) / 3;

        // 6. 3D Model Hierarchy & ARKit Morph Target Setup
        const modelGroup = new THREE.Group();
        scene.add(modelGroup);

        let morphMesh: THREE.Mesh | null = null;
        let morphDict: Record<string, number> = {};

        // Texture Loader for Diffuse Maps
        const textureLoader = new THREE.TextureLoader();

        // 1. Head Diffuse Texture (Naturally arched dark espresso eyebrows, Cupid's bow lips, cheek warmth, and eyelid contours)
        const faceTexture = textureLoader.load(
            "/models/facecap_diffuse.jpeg",
            (tex) => {
                tex.generateMipmaps = true;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.needsUpdate = true;
            },
            undefined,
            () => {
                // Fallback to PNG if JPEG is unavailable
                textureLoader.load("/models/facecap_diffuse.png", (fallbackTex) => {
                    fallbackTex.flipY = false;
                    fallbackTex.colorSpace = THREE.SRGBColorSpace;
                    fallbackTex.wrapS = THREE.ClampToEdgeWrapping;
                    fallbackTex.wrapT = THREE.ClampToEdgeWrapping;
                    fallbackTex.repeat.set(0.000238723238, 0.000239208952);
                    fallbackTex.offset.set(0.00724834995, 0.0100790262);
                    skinMat.map = fallbackTex;
                    skinMat.needsUpdate = true;
                });
            }
        );
        faceTexture.flipY = false;
        faceTexture.colorSpace = THREE.SRGBColorSpace;
        faceTexture.wrapS = THREE.ClampToEdgeWrapping;
        faceTexture.wrapT = THREE.ClampToEdgeWrapping;
        faceTexture.repeat.set(0.000238723238, 0.000239208952);
        faceTexture.offset.set(0.00724834995, 0.0100790262);

        // Lifelike human complexion with diffuse map preserving eyebrows and facial contours
        const skinMat = new THREE.MeshStandardMaterial({
            map: faceTexture,
            color: 0xffffff,
            roughness: 0.58,
            metalness: 0.01,
            envMapIntensity: 0.90,
        });

        // 2. Eye texture — loaded but UV transform will be read from GLB's original eye material
        const eyeTextureUrl = "/models/eye_diffuse.jpeg";
        const eyeTextureFallbackUrl = "/models/eye_diffuse.png";

        const eyeMatProps = {
            color: new THREE.Color(0xfbf9f6),  // Warm natural cornea/sclera tone
            roughness: 0.22,                   // Organic wet tissue smoothness
            metalness: 0.0,
            envMapIntensity: 0.28,             // Subtle, warm ambient reflection (eliminates light-blue glare)
            clearcoat: 0.35,                   // Natural wet tear-film specular highlight
            clearcoatRoughness: 0.14,          // Soft natural corneal glint
        };

        // 3. Bright clean dental enamel pearl white
        const teethMat = new THREE.MeshStandardMaterial({
            color: 0xfcfbfa,
            roughness: 0.15,
            metalness: 0.0,
            envMapIntensity: 1.0,
        });

        let ktx2Loader: KTX2Loader | null = null;
        const loader = new GLTFLoader();
        try {
            ktx2Loader = new KTX2Loader()
                .setTranscoderPath(transcoderPath)
                .detectSupport(renderer);
            loader.setKTX2Loader(ktx2Loader);
        } catch (err) {
            console.warn("KTX2Loader initialization skipped:", err);
        }
        loader.setMeshoptDecoder(MeshoptDecoder);
        loader.load(
            modelUrl,
            (gltf) => {
                const root = gltf.scene;

                root.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        const parentName = (child.parent?.name || "").toLowerCase();
                        const childName = (child.name || "").toLowerCase();
                        const allNames = `${childName} ${parentName}`;

                        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                            morphMesh = mesh;
                            morphDict = mesh.morphTargetDictionary;
                            mesh.material = skinMat;
                        } else if (allNames.includes("eye")) {
                            // Read UV transform from the GLB's original eye material
                            const origMat = mesh.material as THREE.MeshStandardMaterial;
                            const origMap = origMat?.map;

                            // Clone the eye texture with the CORRECT UV transform from the GLB
                            const eyeTex = textureLoader.load(
                                eyeTextureUrl,
                                (tex) => {
                                    tex.generateMipmaps = true;
                                    tex.minFilter = THREE.LinearMipmapLinearFilter;
                                    tex.magFilter = THREE.LinearFilter;
                                    tex.needsUpdate = true;
                                },
                                undefined,
                                () => {
                                    // Fallback to PNG
                                    textureLoader.load(eyeTextureFallbackUrl, (fbTex) => {
                                        fbTex.flipY = false;
                                        fbTex.colorSpace = THREE.SRGBColorSpace;
                                        if (origMap) {
                                            fbTex.wrapS = origMap.wrapS;
                                            fbTex.wrapT = origMap.wrapT;
                                            fbTex.repeat.copy(origMap.repeat);
                                            fbTex.offset.copy(origMap.offset);
                                        }
                                        (mesh.material as THREE.MeshPhysicalMaterial).map = fbTex;
                                        (mesh.material as THREE.MeshPhysicalMaterial).needsUpdate = true;
                                    });
                                }
                            );
                            eyeTex.flipY = false;
                            eyeTex.colorSpace = THREE.SRGBColorSpace;

                            // Preserve the original UV wrapS/wrapT/repeat/offset from the GLB
                            if (origMap) {
                                eyeTex.wrapS = origMap.wrapS;
                                eyeTex.wrapT = origMap.wrapT;
                                eyeTex.repeat.copy(origMap.repeat);
                                eyeTex.offset.copy(origMap.offset);
                                console.log(`[Avatar] Eye mesh "${child.name}" UV transform — repeat:`, origMap.repeat, "offset:", origMap.offset);
                            } else {
                                // Fallback: use the face UV transform
                                eyeTex.wrapS = THREE.ClampToEdgeWrapping;
                                eyeTex.wrapT = THREE.ClampToEdgeWrapping;
                                eyeTex.repeat.set(0.000238723238, 0.000239208952);
                                eyeTex.offset.set(0.00724834995, 0.0100790262);
                            }

                            mesh.material = new THREE.MeshPhysicalMaterial({
                                map: eyeTex,
                                ...eyeMatProps,
                            });
                        } else if (allNames.includes("teeth")) {
                            mesh.material = teethMat;
                        }
                    }
                });

                modelGroup.add(root);
            },

            undefined,
            (err) => {
                console.warn(`Could not load avatar model from ${modelUrl}:`, err);
            }
        );

        // Robust ARKit morph resolver
        const setMorph = (targetName: string, value: number) => {
            if (!morphMesh || !morphMesh.morphTargetInfluences) return;

            let idx = morphDict[targetName];
            if (idx === undefined) {
                idx = morphDict[`blendShape1.${targetName}`];
            }
            if (idx === undefined) {
                const lower = targetName.toLowerCase();
                const found = Object.keys(morphDict).find(
                    (k) => k.toLowerCase() === lower || k.toLowerCase().endsWith(`.${lower}`)
                );
                if (found) idx = morphDict[found];
            }

            if (idx !== undefined) {
                morphMesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, value));
            }
        };

        // 7. 60 FPS Render & Animation Loop
        let animationFrameId: number;
        let lastTime = performance.now();
        const startTime = performance.now();

        const renderLoop = () => {
            animationFrameId = requestAnimationFrame(renderLoop);
            const now = performance.now();
            const delta = Math.min(0.1, (now - lastTime) / 1000);
            lastTime = now;
            const time = (now - startTime) / 1000;
            const r = animRefs.current;


            // 7.1 Subtle Breathing & Micro-gestures
            r.breathTime += delta;
            const breath = Math.sin(r.breathTime * 1.3) * 0.005;
            modelGroup.position.y = breath;

            // 7.2 Head Gestures by Conversational State
            if (r.state === "thinking") {
                r.targetGazeX = -0.32;
                r.targetGazeY = 0.38;
                r.headPitch = THREE.MathUtils.lerp(r.headPitch, 0.06, 0.05);
                r.headRoll = THREE.MathUtils.lerp(r.headRoll, 0.04, 0.05);
            } else if (r.state === "listening") {
                r.headPitch = THREE.MathUtils.lerp(r.headPitch, -0.05, 0.06);
                r.headRoll = THREE.MathUtils.lerp(r.headRoll, -0.02, 0.05);
            } else {
                r.headPitch = THREE.MathUtils.lerp(
                    r.headPitch,
                    Math.sin(time * 0.6) * 0.02 + r.mouseY * 0.06,
                    0.05
                );
                r.headYaw = THREE.MathUtils.lerp(
                    r.headYaw,
                    Math.cos(time * 0.5) * 0.025 + r.mouseX * 0.08,
                    0.05
                );
                r.headRoll = THREE.MathUtils.lerp(r.headRoll, Math.sin(time * 0.4) * 0.012, 0.04);
            }

            modelGroup.rotation.x = r.headPitch;
            modelGroup.rotation.y = r.headYaw;
            modelGroup.rotation.z = r.headRoll;

            // 7.3 Eye Gaze Tracking
            r.currentGazeX = THREE.MathUtils.lerp(r.currentGazeX, r.targetGazeX, 0.08);
            r.currentGazeY = THREE.MathUtils.lerp(r.currentGazeY, r.targetGazeY, 0.08);

            const gazeXClamped = Math.max(-0.22, Math.min(0.22, r.currentGazeX));
            const gazeYClamped = Math.max(-0.16, Math.min(0.16, r.currentGazeY));

            if (gazeXClamped > 0) {
                setMorph("eyeLookOut_R", gazeXClamped);
                setMorph("eyeLookIn_L", gazeXClamped);
                setMorph("eyeLookIn_R", 0);
                setMorph("eyeLookOut_L", 0);
            } else {
                setMorph("eyeLookIn_R", -gazeXClamped);
                setMorph("eyeLookOut_L", -gazeXClamped);
                setMorph("eyeLookOut_R", 0);
                setMorph("eyeLookIn_L", 0);
            }

            if (gazeYClamped > 0) {
                setMorph("eyeLookUp_L", gazeYClamped);
                setMorph("eyeLookUp_R", gazeYClamped);
                setMorph("eyeLookDown_L", 0);
                setMorph("eyeLookDown_R", 0);
            } else {
                setMorph("eyeLookDown_L", -gazeYClamped);
                setMorph("eyeLookDown_R", -gazeYClamped);
                setMorph("eyeLookUp_L", 0);
                setMorph("eyeLookUp_R", 0);
            }

            // 7.4 Natural Eyelid Blinking with anatomical resting drape
            if (time > r.nextBlinkTime) {
                r.isBlinking = true;
                r.blinkProgress = 0;
                r.nextBlinkTime = time + 2.5 + Math.random() * 3.5;
            }

            if (r.isBlinking) {
                r.blinkProgress += delta * 12.0;
                if (r.blinkProgress >= Math.PI) {
                    r.isBlinking = false;
                    r.blinkProgress = 0;
                }
            }

            const restingBlink = 0.07;
            const blinkValue = r.isBlinking
                ? restingBlink + (1.0 - restingBlink) * Math.sin(r.blinkProgress)
                : restingBlink;
            setMorph("eyeBlink_L", blinkValue);
            setMorph("eyeBlink_R", blinkValue);

            // 7.5 Conversational Brows
            if (r.state === "thinking") {
                r.weights.browDown_L = THREE.MathUtils.lerp(r.weights.browDown_L, 0.35, 0.08);
                r.weights.browDown_R = THREE.MathUtils.lerp(r.weights.browDown_R, 0.35, 0.08);
                r.weights.browInnerUp = THREE.MathUtils.lerp(r.weights.browInnerUp, 0.0, 0.08);
            } else if (r.state === "listening") {
                r.weights.browInnerUp = THREE.MathUtils.lerp(r.weights.browInnerUp, 0.32, 0.08);
                r.weights.browDown_L = THREE.MathUtils.lerp(r.weights.browDown_L, 0.0, 0.08);
                r.weights.browDown_R = THREE.MathUtils.lerp(r.weights.browDown_R, 0.0, 0.08);
            } else {
                r.weights.browInnerUp = THREE.MathUtils.lerp(r.weights.browInnerUp, 0.0, 0.08);
                r.weights.browDown_L = THREE.MathUtils.lerp(r.weights.browDown_L, 0.0, 0.08);
                r.weights.browDown_R = THREE.MathUtils.lerp(r.weights.browDown_R, 0.0, 0.08);
            }

            setMorph("browInnerUp", r.weights.browInnerUp);
            setMorph("browDown_L", r.weights.browDown_L);
            setMorph("browDown_R", r.weights.browDown_R);

            // 7.6 Calibrated ARKit Lip-Sync (With Lower-Lip Overlap Protection Clamp)
            let targetJawOpen = 0;
            let targetPucker = 0;
            let targetSmile = 0;
            let targetFunnel = 0;
            let targetClose = 0;
            let targetUpperUp = 0;
            let targetLowerDown = 0;

            const isSpeakingState = r.state === "speaking";
            const intensity = isSpeakingState ? Math.max(0.35, r.visemeIntensity) : 0;
            const energyMod = isSpeakingState && r.audioEnergy > 0 ? 0.7 + r.audioEnergy * 0.6 : 1.0;

            if (isSpeakingState && r.currentViseme !== "sil") {
                switch (r.currentViseme) {
                    case "aa":
                        targetJawOpen = 0.52 * intensity * energyMod;
                        targetLowerDown = 0.18 * intensity;
                        targetUpperUp = 0.08 * intensity;
                        targetFunnel = 0.15 * intensity;
                        break;
                    case "ee":
                        targetJawOpen = 0.18 * intensity * energyMod;
                        targetSmile = 0.35 * intensity;
                        targetUpperUp = 0.12 * intensity;
                        break;
                    case "oo":
                        targetJawOpen = 0.22 * intensity * energyMod;
                        targetPucker = 0.52 * intensity;
                        targetFunnel = 0.28 * intensity;
                        break;
                    case "oh":
                        targetJawOpen = 0.44 * intensity * energyMod;
                        targetFunnel = 0.45 * intensity;
                        targetPucker = 0.18 * intensity;
                        break;
                    case "ch":
                        targetJawOpen = 0.16 * intensity * energyMod;
                        targetUpperUp = 0.15 * intensity;
                        targetSmile = 0.15 * intensity;
                        break;
                    case "fv":
                        targetJawOpen = 0.12 * intensity;
                        targetLowerDown = 0.12 * intensity;
                        break;
                    case "mbp":
                        targetJawOpen = 0.0;
                        targetClose = 0.0; // Resting mouth is already closed naturally; prevents lip overlap
                        targetPucker = 0.08 * intensity;
                        break;
                    default:
                        targetJawOpen = 0.28 * intensity * energyMod;
                        break;
                }
            }

            // Spring-damper interpolation
            const mouthDamp = 0.32;
            r.weights.jawOpen = THREE.MathUtils.lerp(r.weights.jawOpen, targetJawOpen, mouthDamp);
            r.weights.mouthPucker = THREE.MathUtils.lerp(r.weights.mouthPucker, targetPucker, mouthDamp);
            r.weights.mouthSmile_L = THREE.MathUtils.lerp(r.weights.mouthSmile_L, targetSmile, mouthDamp);
            r.weights.mouthSmile_R = THREE.MathUtils.lerp(r.weights.mouthSmile_R, targetSmile, mouthDamp);
            r.weights.mouthFunnel = THREE.MathUtils.lerp(r.weights.mouthFunnel, targetFunnel, mouthDamp);
            r.weights.mouthClose = THREE.MathUtils.lerp(r.weights.mouthClose, targetClose, mouthDamp);
            r.weights.mouthUpperUp_L = THREE.MathUtils.lerp(r.weights.mouthUpperUp_L, targetUpperUp, mouthDamp);
            r.weights.mouthUpperUp_R = THREE.MathUtils.lerp(r.weights.mouthUpperUp_R, targetUpperUp, mouthDamp);
            r.weights.mouthLowerDown_L = THREE.MathUtils.lerp(r.weights.mouthLowerDown_L, targetLowerDown, mouthDamp);
            r.weights.mouthLowerDown_R = THREE.MathUtils.lerp(r.weights.mouthLowerDown_R, targetLowerDown, mouthDamp);

            // Anatomical lip collision protection:
            // Prevents mouthClose from pulling lower lip above the resting plane or upper lip
            const maxSafeMouthClose = Math.max(0, (r.weights.jawOpen - 0.2) * 0.4);
            const safeClose = Math.min(r.weights.mouthClose, maxSafeMouthClose);

            // Apply morph targets to the 3D head mesh
            setMorph("jawOpen", r.weights.jawOpen);
            setMorph("mouthPucker", r.weights.mouthPucker);
            setMorph("mouthSmile_L", r.weights.mouthSmile_L);
            setMorph("mouthSmile_R", r.weights.mouthSmile_R);
            setMorph("mouthFunnel", r.weights.mouthFunnel);
            setMorph("mouthClose", safeClose);
            setMorph("mouthUpperUp_L", r.weights.mouthUpperUp_L);
            setMorph("mouthUpperUp_R", r.weights.mouthUpperUp_R);
            setMorph("mouthLowerDown_L", r.weights.mouthLowerDown_L);
            setMorph("mouthLowerDown_R", r.weights.mouthLowerDown_R);

            // Update interactive orbit controls
            controls.update();

            // Render Frame
            renderer.render(scene, camera);
        };

        renderLoop();

        // 8. Resize Listener & Resource Cleanup
        const onResize = () => {
            if (!container) return;
            const w = container.clientWidth || 400;
            const h = container.clientHeight || 400;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            cancelAnimationFrame(animationFrameId);
            controls.dispose();
            ktx2Loader?.dispose();
            faceTexture.dispose();
            // Dispose all dynamically-created eye materials & textures
            modelGroup.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    if (mat?.map) mat.map.dispose();
                    mat?.dispose();
                }
            });
            skinMat.dispose();
            teethMat.dispose();
            pmremGenerator.dispose();
            roomEnv.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [modelUrl, transcoderPath]);

    return (
        <div className={`relative flex items-center justify-center overflow-hidden select-none ${className}`}>
            <div
                ref={mountRef}
                className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
            />

            {/* State Badge Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-lg shadow-black/40 pointer-events-none">
                <span
                    className={`w-2 h-2 rounded-full ${
                        state === "speaking"
                            ? "bg-cyan-400 animate-pulse ring-4 ring-cyan-500/20"
                            : state === "listening"
                            ? "bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20"
                            : state === "thinking"
                            ? "bg-amber-400 animate-spin"
                            : "bg-slate-400"
                    }`}
                />
                <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-200">
                    {state === "speaking"
                        ? "AI • Speaking"
                        : state === "listening"
                        ? "AI • Listening"
                        : state === "thinking"
                        ? "AI • Thinking"
                        : "AI • Ready"}
                </span>
            </div>

            <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-800 text-[9px] text-slate-400 backdrop-blur-sm pointer-events-none">
                Drag to rotate
            </div>
        </div>
    );
};

export default RealisticHumanRenderer;
