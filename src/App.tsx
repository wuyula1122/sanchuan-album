import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- 1. 粒子系统 (保持不变) ---
const FoliageShader = {
  uniforms: { uTime: { value: 0 }, uProgress: { value: 0 } },
  vertexShader: `
    uniform float uTime; uniform float uProgress;
    attribute vec3 chaosPosition; attribute vec3 targetPosition; attribute float aWeight;
    varying vec3 vColor;
    void main() {
      float t = clamp(uProgress * aWeight, 0.0, 1.0);
      vec3 pos = mix(targetPosition, chaosPosition, t);
      pos.x += sin(uTime * 0.4 + pos.y) * uProgress * 1.5;
      vColor = mix(vec3(0.01, 0.2, 0.1), vec3(0.83, 0.68, 0.21), t);
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = (35.0 / -mvPosition.z) * (1.0 - uProgress * 0.4); 
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      float dist = distance(gl_PointCoord, vec2(0.5));
      if (dist > 0.5) discard;
      gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.2, 0.5, dist));
    }
  `
};

const TreeParticles = ({ progress }: { progress: number }) => {
  const meshRef = useRef<THREE.Points>(null!);
  const count = 45000;
  const [tP, cP, w] = useMemo(() => {
    const t = new Float32Array(count * 3), c = new Float32Array(count * 3), weights = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const h = Math.random() * 12, r = 4 * (1 - h / 12) * (0.8 + Math.random() * 0.4), angle = Math.random() * Math.PI * 2;
      t.set([Math.cos(angle) * r, h - 5, Math.sin(angle) * r], i * 3);
      const d = 12 + Math.random() * 8, theta = Math.random() * Math.PI * 2, phi = Math.acos(Math.random() * 2 - 1);
      c.set([d * Math.sin(phi) * Math.cos(theta), d * Math.sin(phi) * Math.sin(theta), d * Math.cos(phi)], i * 3);
      weights[i] = 0.5 + Math.random() * 1.5;
    }
    return [t, c, weights];
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
      meshRef.current.material.uniforms.uProgress.value = THREE.MathUtils.lerp(meshRef.current.material.uniforms.uProgress.value, progress, 0.05);
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={tP} itemSize={3} />
        <bufferAttribute attach="attributes-targetPosition" count={count} array={tP} itemSize={3} />
        <bufferAttribute attach="attributes-chaosPosition" count={count} array={cP} itemSize={3} />
        <bufferAttribute attach="attributes-aWeight" count={count} array={w} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial args={[FoliageShader]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// --- 2. 主应用 ---
export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState('');
  const [isExploded, setIsExploded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isImageReady, setIsImageReady] = useState(false);
  const [showQuote, setShowQuote] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const photoFiles = useMemo(() => [
    "风挽青丝.jpg", "故宫落雪.jpg", "红柱花影.jpg", "湖畔听风.jpg", "花前饮夏.jpg",
    "琴边花事.jpg", "青山望水.jpg", "青山遇寺.jpg", "书间寻梦.jpg", "树影揽光.jpg",
    "圆窗窥景.jpg", "未完待续.jpg"
  ], []);

  const getDisplayName = (filename: string) => filename.split('.').slice(0, -1).join('.');

  // 循环显示的竖排金句逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const runCycle = () => {
      if (unlocked && !isExploded) {
        setShowQuote(true);
        timer = setTimeout(() => {
          setShowQuote(false);
          timer = setTimeout(runCycle, 5000);
        }, 6000);
      }
    };
    if (unlocked && !isExploded) runCycle();
    else setShowQuote(false);
    return () => clearTimeout(timer);
  }, [unlocked, isExploded]);

  // 预加载与轮播逻辑
  useEffect(() => {
    if (isExploded && unlocked) {
      stopAutoPlay();
      autoPlayTimerRef.current = setTimeout(() => {
        setIsImageReady(false);
        setPhotoIndex((prev) => (prev + 1) % photoFiles.length);
      }, 5000);
    }
    return () => stopAutoPlay();
  }, [isExploded, photoIndex, unlocked, photoFiles.length]);

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
  };

  const handleUnlock = () => {
    if (pass.toLowerCase() === 'merrychristmas') {
      setUnlocked(true);
      setTimeout(() => {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(e => console.log(e));
      }, 100);
    }
  };

  if (!unlocked) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#05100d', color: '#d4af37', fontFamily: 'serif' }}>
        <h1 style={{ letterSpacing: '8px', fontSize: '2.2rem' }}>CHRISTMAS GIFTS</h1>
        <input 
          type="password" 
          placeholder="PASSCODE"
          onChange={e => setPass(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleUnlock()} 
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #d4af37', color: '#d4af37', textAlign: 'center', padding: '10px', outline: 'none', marginTop: '20px', letterSpacing: '5px' }} 
        />
        <button onClick={handleUnlock} style={{ marginTop: '30px', background: '#d4af37', color: '#05100d', border: 'none', padding: '10px 30px', cursor: 'pointer', fontWeight: 'bold' }}>UNLOCK</button>
      </div>
    );
  }

  return (
    <div 
      style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}
      onDoubleClick={() => setIsExploded(!isExploded)}
    >
      <audio ref={audioRef} src="/audio/sky_castle.mp3" loop />

      {/* --- 修改点：文字居中在圣诞树中 --- */}
      <div style={{ 
        position: 'absolute', 
        top: '45%', // 稍微偏上一点，视觉中心更稳
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        zIndex: 5, // 放在 Canvas 粒子之上，但层级不宜过高以免突兀
        pointerEvents: 'none',
        opacity: showQuote ? 1 : 0,
        transition: 'opacity 3s ease-in-out',
        writingMode: 'vertical-rl',
        display: 'flex', 
        gap: '30px', // 缩小列间距，聚拢在中心
        alignItems: 'center'
      }}>
        <p style={{ 
          color: '#d4af37', fontSize: '1.6rem', letterSpacing: '10px', 
          fontFamily: '"Noto Serif JP", serif', 
          textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 10px rgba(212,175,55,0.4)',
          margin: 0
        }}>
          一切需要时间沉淀的美好
        </p>
        <p style={{ 
          color: '#d4af37', fontSize: '1.6rem', letterSpacing: '10px', 
          fontFamily: '"Noto Serif JP", serif', 
          textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 10px rgba(212,175,55,0.4)',
          margin: 0, 
          marginTop: '60px' // 保持错落感
        }}>
          都值得我们耐着性子去等待
        </p>
      </div>

      <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 100, color: '#d4af37', pointerEvents: 'none', fontFamily: 'serif' }}>
        <h2 style={{ margin: 0, letterSpacing: '6px', fontSize: '1.6rem', fontWeight: 'lighter' }}>三川故里の物語</h2>
        <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '10px', letterSpacing: '1px' }}>双击屏幕试一下呢？</p>
      </div>

      {isExploded && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50, width: '90%', maxWidth: '550px', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => { setIsImageReady(false); setPhotoIndex((p) => (p - 1 + photoFiles.length) % photoFiles.length); }} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '3rem', cursor: 'pointer', padding: '15px' }}>‹</button>
            <div style={{ position: 'relative' }}>
              <img 
                key={photoFiles[photoIndex]}
                src={`/memories/${photoFiles[photoIndex]}`} 
                onLoad={() => setIsImageReady(true)}
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '12px', border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 0 50px rgba(212,175,55,0.2)', backgroundColor: '#050505', opacity: isImageReady ? 1 : 0, transition: 'opacity 0.6s ease' }} 
                alt="Moment" 
              />
              <div style={{ marginTop: '25px', opacity: isImageReady ? 1 : 0, transition: 'opacity 0.6s ease' }}>
                <p style={{ color: '#d4af37', fontSize: '1.5rem', letterSpacing: '5px', margin: '0', fontFamily: 'serif' }}>{getDisplayName(photoFiles[photoIndex])}</p>
                <div style={{ width: '30px', height: '1px', background: '#d4af37', margin: '15px auto', opacity: 0.4 }}></div>
                <p style={{ color: '#d4af37', opacity: 0.4, fontSize: '0.7rem', letterSpacing: '2px' }}>{photoIndex + 1} / {photoFiles.length}</p>
              </div>
            </div>
            <button onClick={() => { setIsImageReady(false); setPhotoIndex((p) => (p + 1) % photoFiles.length); }} style={{ background: 'none', border: 'none', color: '#d4af37', fontSize: '3rem', cursor: 'pointer', padding: '15px' }}>›</button>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [0, 2, 20], fov: 45 }}>
        <Environment preset="night" />
        <TreeParticles progress={isExploded ? 1 : 0} />
        <EffectComposer>
          <Bloom intensity={1.8} luminanceThreshold={0.6} mipmapBlur />
          <Vignette darkness={1.3} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}