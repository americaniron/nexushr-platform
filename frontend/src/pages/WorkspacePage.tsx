import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { AI_EMPLOYEES } from '../data/employees';
import { KANBAN_DATA } from '../data/constants';
import type { ChatMessage } from '../data/types';
import { generateResponse, generateResponseFromNLU, getThinkingMessage, getResponseDelay, detectIntent, updateMemory, runLocalNLU } from '../lib/ai-brain';
import type { NLUResult } from '../lib/ai-brain';
import { saveChatHistory, loadChatHistory, trackTask, loadMemory, saveMemory, exportChatHistory } from '../lib/storage';
import { isWorkerConnected, WorkerNLU } from '../lib/worker-api';
import { runInputGuardrails, runOutputGuardrails } from '../lib/guardrails';
import {
  AvatarController, VISEME_SHAPES, EXPRESSIONS,
  CAMERA_PRESETS, LOD_CONFIGS, detectLOD, detectRenderBackend,
  lerpSmooth, type CameraPreset, type LODLevel, type RenderBackend,
  type Expression, type Gesture, type MouthShape, type FacialExpression,
  type GestureKeyframe,
} from '../lib/avatar-engine';

// WebGL / WebGPU support check
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch { return false; }
}

// Static 2D avatar fallback
function Avatar2D({ emp }: { emp: typeof AI_EMPLOYEES[0] }) {
  return (
    <div className="w-full flex items-center justify-center" style={{ height: 380, borderRadius: 16, background: '#FBCC00' }}>
      <div className="text-center">
        <img src={emp.avatar} alt={emp.name} className="w-32 h-32 mx-auto rounded-full border-4 border-white shadow-lg" style={{ background: '#fff' }} />
        <p className="mt-4 font-bold text-lg text-gray-900">{emp.name}</p>
        <p className="text-sm text-gray-700">{emp.role}</p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <div className="w-2 h-2 rounded-full bg-green-600" style={{ animation: 'pulse-glow 2s infinite' }} />
          <span className="text-xs font-medium text-green-800">Active</span>
        </div>
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const { employeeId } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const empId = employeeId || auth.hiredEmployees?.[0] || 'atlas';
  const emp = AI_EMPLOYEES.find(e => e.id === empId) || AI_EMPLOYEES[0];
  const isMarketer = emp.jobType === 'marketing-manager';
  const isCoder = emp.jobType === 'software-engineer';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const typingRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasWebGL = useRef(isWebGLAvailable());
  const avatarCtrl = useRef<AvatarController>(new AvatarController());
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('default');
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadChatHistory(empId);
    if (saved && saved.length > 0) return saved;
    return [{ id: '0', from: 'ai', text: emp.personality.greeting, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingMsg, setThinkingMsg] = useState('');
  const [wsTab, setWsTab] = useState('chat');
  const [kanban] = useState(isMarketer ? KANBAN_DATA.marketer : KANBAN_DATA.coder);
  const [showMemory, setShowMemory] = useState(false);
  const memory = loadMemory(empId);

  useEffect(() => { saveChatHistory(empId, messages); }, [messages, empId]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { if (wsTab === 'chat') inputRef.current?.focus(); }, [wsTab]);

  // Enhanced Three.js 3D avatar with expression system, lip sync, gestures, camera controls, LOD
  useEffect(() => {
    if (!canvasRef.current || !hasWebGL.current) return;
    let disposed = false;
    const ctrl = avatarCtrl.current;
    const lod = ctrl.lodConfig;
    const seg = lod.geometrySegments;

    import('three').then((THREE) => {
      if (disposed || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xFBCC00);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      cam.position.set(0, 0.4, 3);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: lod.enableAntiAlias });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lod.pixelRatio));
      if (lod.enableShadows) { renderer.shadowMap.enabled = true; }

      const c = emp.avatarColors;
      const avatarGroup = new THREE.Group();
      scene.add(avatarGroup);

      // ── HEAD ──
      const headMat = new THREE.MeshPhongMaterial({ color: c.head, shininess: 80 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, seg, seg), headMat);
      head.position.y = 0.65; avatarGroup.add(head);

      const face = new THREE.Mesh(new THREE.SphereGeometry(0.38, seg, seg), new THREE.MeshPhongMaterial({ color: c.head + 0x111111, shininess: 60 }));
      face.position.set(0, 0.65, 0.06); face.scale.set(0.95, 0.88, 0.4); avatarGroup.add(face);

      // ── EYES ──
      const eyeMat = new THREE.MeshPhongMaterial({ color: c.eyes, emissive: c.eyes, emissiveIntensity: 0.8 });
      const eyeGeo = new THREE.SphereGeometry(0.055, seg / 2, seg / 2);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.12, 0.7, 0.34); avatarGroup.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.12, 0.7, 0.34); avatarGroup.add(rightEye);

      // ── EYELIDS (for squint/wide-eye expressions) ──
      const eyelidMat = new THREE.MeshPhongMaterial({ color: c.head, shininess: 60 });
      const eyelidGeo = new THREE.BoxGeometry(0.075, 0.015, 0.035);
      const leftLid = new THREE.Mesh(eyelidGeo, eyelidMat); leftLid.position.set(-0.12, 0.735, 0.355); avatarGroup.add(leftLid);
      const rightLid = new THREE.Mesh(eyelidGeo, eyelidMat); rightLid.position.set(0.12, 0.735, 0.355); avatarGroup.add(rightLid);
      leftLid.visible = false; rightLid.visible = false; // only visible during blinks/expressions

      // ── PUPILS ──
      const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
      const pupilGeo = new THREE.SphereGeometry(0.025, seg / 3, seg / 3);
      const leftPupil = new THREE.Mesh(pupilGeo, pupilMat); leftPupil.position.set(-0.12, 0.7, 0.39); avatarGroup.add(leftPupil);
      const rightPupil = new THREE.Mesh(pupilGeo, pupilMat); rightPupil.position.set(0.12, 0.7, 0.39); avatarGroup.add(rightPupil);

      // ── EYEBROWS ──
      const browMat = new THREE.MeshPhongMaterial({ color: c.eyes });
      const browGeo = new THREE.BoxGeometry(0.08, 0.012, 0.02);
      const leftBrow = new THREE.Mesh(browGeo, browMat); leftBrow.position.set(-0.12, 0.78, 0.34); leftBrow.rotation.z = 0.1; avatarGroup.add(leftBrow);
      const rightBrow = new THREE.Mesh(browGeo, browMat); rightBrow.position.set(0.12, 0.78, 0.34); rightBrow.rotation.z = -0.1; avatarGroup.add(rightBrow);

      // ── CHEEKS (for puff/smile) ──
      const cheekMat = new THREE.MeshPhongMaterial({ color: c.head + 0x221111, transparent: true, opacity: 0 });
      const cheekGeo = new THREE.SphereGeometry(0.06, seg / 3, seg / 3);
      const leftCheek = new THREE.Mesh(cheekGeo, cheekMat); leftCheek.position.set(-0.2, 0.6, 0.28); avatarGroup.add(leftCheek);
      const rightCheek = new THREE.Mesh(cheekGeo, cheekMat); rightCheek.position.set(0.2, 0.6, 0.28); avatarGroup.add(rightCheek);

      // ── MOUTH (enhanced for viseme lip sync) ──
      const mouthMat = new THREE.MeshPhongMaterial({ color: c.eyes, emissive: c.eyes, emissiveIntensity: 0.3 });
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), mouthMat);
      mouth.position.set(0, 0.56, 0.36); avatarGroup.add(mouth);

      // Inner mouth (visible when mouth opens for visemes)
      const innerMouthMat = new THREE.MeshPhongMaterial({ color: 0x330000 });
      const innerMouth = new THREE.Mesh(new THREE.SphereGeometry(0.04, seg / 3, seg / 3), innerMouthMat);
      innerMouth.position.set(0, 0.555, 0.34); innerMouth.scale.set(1, 0.3, 0.5); innerMouth.visible = false;
      avatarGroup.add(innerMouth);

      // ── NECK & BODY ──
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15, seg / 2), new THREE.MeshPhongMaterial({ color: c.head, shininess: 60 }));
      neck.position.y = 0.2; avatarGroup.add(neck);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.75, seg), new THREE.MeshPhongMaterial({ color: c.body, shininess: 60 }));
      body.position.y = -0.25; avatarGroup.add(body);

      // ── SHOULDERS ──
      const shoulderMat = new THREE.MeshPhongMaterial({ color: c.head, shininess: 60 });
      const shoulderGeo = new THREE.SphereGeometry(0.1, seg / 2, seg / 2);
      const ls = new THREE.Mesh(shoulderGeo, shoulderMat); ls.position.set(-0.38, 0.08, 0); avatarGroup.add(ls);
      const rs = new THREE.Mesh(shoulderGeo, shoulderMat); rs.position.set(0.38, 0.08, 0); avatarGroup.add(rs);

      // ── ARMS (LOD-dependent) ──
      let leftArm: THREE.Mesh | null = null, rightArm: THREE.Mesh | null = null;
      let leftHand: THREE.Mesh | null = null, rightHand: THREE.Mesh | null = null;

      if (lod.enableArms) {
        const armMat = new THREE.MeshPhongMaterial({ color: c.body, shininess: 60 });
        const armGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, seg / 3);
        leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.44, -0.1, 0); leftArm.rotation.z = 0.15;
        avatarGroup.add(leftArm);
        rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.44, -0.1, 0); rightArm.rotation.z = -0.15;
        avatarGroup.add(rightArm);

        if (lod.enableHands) {
          const handMat = new THREE.MeshPhongMaterial({ color: c.head, shininess: 60 });
          const handGeo = new THREE.SphereGeometry(0.05, seg / 3, seg / 3);
          leftHand = new THREE.Mesh(handGeo, handMat);
          leftHand.position.set(-0.47, -0.32, 0);
          avatarGroup.add(leftHand);
          rightHand = new THREE.Mesh(handGeo, handMat);
          rightHand.position.set(0.47, -0.32, 0);
          avatarGroup.add(rightHand);
        }
      }

      // ── COLLAR ──
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 24), new THREE.MeshPhongMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 0.2 }));
      collar.position.y = 0.12; collar.rotation.x = Math.PI / 2; avatarGroup.add(collar);

      // ── LIGHTING ──
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2); keyLight.position.set(2, 3, 4); scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.4); fillLight.position.set(-2, 1, 2); scene.add(fillLight);
      const rimLight = new THREE.DirectionalLight(c.eyes, 0.3); rimLight.position.set(0, 2, -3); scene.add(rimLight);
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));

      // ── MOUSE TRACKING ──
      let mouseX = 0, mouseY = 0;
      const onMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      canvas.addEventListener('mousemove', onMouseMove);

      // ── ZOOM/PAN via mouse wheel + drag ──
      let zoomOffset = 0;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        zoomOffset = Math.max(-1.5, Math.min(3, zoomOffset + e.deltaY * 0.003));
      };
      canvas.addEventListener('wheel', onWheel, { passive: false });

      // ── ANIMATION LOOP ──
      let frame = 0, blinkTimer = 0, nextBlink = 180 + Math.random() * 120;
      const targetFPS = lod.animationFPS;
      let lastFrameTime = 0;
      const frameInterval = 1000 / targetFPS;

      const animate = (timestamp: number) => {
        if (disposed) return;
        animFrameRef.current = requestAnimationFrame(animate);

        // LOD frame rate limiting
        if (timestamp - lastFrameTime < frameInterval) return;
        lastFrameTime = timestamp;

        frame++;

        // Get avatar controller state
        const state = ctrl.update();
        const expr = state.expression;
        const gesture = state.gestureFrame;
        const camState = state.camera;
        const vis = state.viseme;

        // ── CAMERA UPDATE ──
        cam.position.set(
          camState.position[0],
          camState.position[1],
          camState.position[2] + zoomOffset
        );
        cam.lookAt(camState.lookAt[0], camState.lookAt[1], camState.lookAt[2]);
        cam.fov = camState.fov;
        cam.updateProjectionMatrix();

        // ── EXPRESSION: HEAD ──
        const baseHeadY = 0.65;
        const gestHeadRotX = gesture.headRotX || 0;
        const gestHeadRotY = gesture.headRotY || 0;
        const gestHeadRotZ = gesture.headRotZ || 0;
        const gestHeadPosY = gesture.headPosY || 0;

        head.rotation.x = expr.headTiltX + gestHeadRotX + Math.sin(frame * 0.012) * 0.02;
        head.rotation.y = Math.sin(frame * 0.008) * 0.08 + gestHeadRotY;
        head.rotation.z = expr.headTiltZ + gestHeadRotZ;
        head.position.y = baseHeadY + gestHeadPosY + Math.sin(frame * 0.012) * 0.015;

        face.rotation.x = head.rotation.x; face.rotation.y = head.rotation.y; face.rotation.z = head.rotation.z;
        face.position.y = head.position.y;

        // ── EXPRESSION: EYES ──
        const eyeScale = expr.eyeScaleY;
        leftEye.scale.y = eyeScale; rightEye.scale.y = eyeScale;
        leftPupil.scale.setScalar(expr.pupilScale);
        rightPupil.scale.setScalar(expr.pupilScale);
        eyeMat.emissiveIntensity = expr.eyeEmissive + Math.sin(frame * 0.04) * 0.15;

        // Pupil tracking (mouse gaze)
        const px = mouseX * 0.025, py = mouseY * 0.015;
        leftPupil.position.x = -0.12 + px; leftPupil.position.y = 0.7 + py;
        rightPupil.position.x = 0.12 + px; rightPupil.position.y = 0.7 + py;

        // ── BLINKING ──
        blinkTimer++;
        if (blinkTimer >= nextBlink) {
          leftEye.scale.y = 0.1; rightEye.scale.y = 0.1;
          leftPupil.visible = false; rightPupil.visible = false;
          leftLid.visible = true; rightLid.visible = true;
          if (blinkTimer >= nextBlink + 8) {
            blinkTimer = 0; nextBlink = 180 + Math.random() * 120;
            leftEye.scale.y = eyeScale; rightEye.scale.y = eyeScale;
            leftPupil.visible = true; rightPupil.visible = true;
            leftLid.visible = false; rightLid.visible = false;
          }
        }

        // ── EXPRESSION: EYEBROWS ──
        leftBrow.position.y = 0.78 + expr.leftBrowY + Math.sin(frame * 0.01) * 0.003;
        rightBrow.position.y = 0.78 + expr.rightBrowY + Math.sin(frame * 0.01) * 0.003;
        leftBrow.rotation.z = expr.leftBrowRot;
        rightBrow.rotation.z = expr.rightBrowRot;

        // ── EXPRESSION: CHEEKS ──
        const cheekVis = expr.cheekPuff;
        cheekMat.opacity = cheekVis * 0.4;
        leftCheek.scale.setScalar(1 + cheekVis * 0.3);
        rightCheek.scale.setScalar(1 + cheekVis * 0.3);

        // ── MOUTH: VISEME LIP SYNC + EXPRESSION ──
        if (vis.weight > 0.05 && state.isSpeaking) {
          // Lip sync active — use viseme shapes
          const shape = VISEME_SHAPES[vis.viseme] || VISEME_SHAPES.rest;
          mouth.scale.x = lerpSmooth(mouth.scale.x, shape.scaleX * 1.0, 0.25);
          mouth.scale.y = lerpSmooth(mouth.scale.y, shape.scaleY * vis.weight, 0.25);
          mouth.position.y = 0.56 + (shape.positionY || 0);
          // Show inner mouth when open
          innerMouth.visible = shape.scaleY > 1.5;
          innerMouth.scale.y = shape.scaleY * 0.2 * vis.weight;
        } else if (typingRef.current) {
          // AI typing — gentle animation
          mouth.scale.y = 1 + Math.sin(frame * 0.3) * 1.2;
          mouth.scale.x = 1 + Math.sin(frame * 0.15) * 0.2;
          innerMouth.visible = Math.sin(frame * 0.3) > 0.3;
          innerMouth.scale.y = 0.15;
        } else {
          // Resting expression mouth
          mouth.scale.x = lerpSmooth(mouth.scale.x, expr.mouthScaleX, 0.1);
          mouth.scale.y = lerpSmooth(mouth.scale.y, expr.mouthScaleY, 0.1);
          mouth.position.y = 0.56 + expr.mouthPosY;
          innerMouth.visible = false;
        }

        // ── GESTURE: BODY ──
        const gestBodyRotX = gesture.bodyRotX || 0;
        const gestBodyPosY = gesture.bodyPosY || 0;
        body.rotation.x = gestBodyRotX;
        body.position.y = -0.25 + gestBodyPosY;
        body.scale.x = 1 + Math.sin(frame * 0.015) * 0.008;
        body.scale.z = 1 + Math.sin(frame * 0.015) * 0.008;

        // ── GESTURE: SHOULDERS ──
        const gestLS = gesture.leftShoulderY || 0;
        const gestRS = gesture.rightShoulderY || 0;
        ls.position.y = 0.08 + gestLS + Math.sin(frame * 0.015) * 0.003;
        rs.position.y = 0.08 + gestRS + Math.sin(frame * 0.015 + 1) * 0.003;

        // ── GESTURE: ARMS ──
        if (leftArm && rightArm) {
          const gestLAZ = gesture.leftArmRotZ || 0;
          const gestRAZ = gesture.rightArmRotZ || 0;
          leftArm.rotation.z = 0.15 + gestLAZ;
          rightArm.rotation.z = -0.15 + gestRAZ;
          leftArm.position.y = -0.1 + gestLS;
          rightArm.position.y = -0.1 + gestRS;

          if (leftHand && rightHand) {
            const gestLHZ = gesture.leftHandRotZ || 0;
            const gestRHZ = gesture.rightHandRotZ || 0;
            leftHand.position.y = -0.32 + gestLS;
            rightHand.position.y = -0.32 + gestRS;
            leftHand.rotation.z = gestLHZ;
            rightHand.rotation.z = gestRHZ;
            // Move hands with arm rotation
            leftHand.position.x = -0.47 + Math.sin(gestLAZ) * 0.15;
            leftHand.position.z = -Math.sin(gestLAZ) * 0.1;
            rightHand.position.x = 0.47 - Math.sin(gestRAZ) * 0.15;
            rightHand.position.z = Math.sin(gestRAZ) * 0.1;
          }
        }

        renderer.render(scene, cam);
      };
      animFrameRef.current = requestAnimationFrame(animate);

      (canvas as any).__cleanup = () => {
        disposed = true;
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('wheel', onWheel);
        cancelAnimationFrame(animFrameRef.current);
        renderer.dispose();
        ctrl.destroy();
      };
    }).catch(() => { hasWebGL.current = false; });

    return () => {
      const c = canvasRef.current as any;
      if (c?.__cleanup) c.__cleanup();
    };
  }, [empId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ── INPUT GUARDRAILS — injection detection, PII redaction, content safety ──
    const inputGuard = runInputGuardrails(input);
    if (inputGuard.blocked) {
      const blockMsg: ChatMessage = {
        id: Date.now().toString(), from: 'ai', ts,
        text: `⚠️ ${inputGuard.blockReason || 'Your message was blocked for safety reasons. Please rephrase your request.'}`,
      };
      setMessages(p => [...p, blockMsg]);
      notify.warn('Message blocked by safety guardrails');
      return;
    }

    // Use sanitized message (PII redacted, injection patterns filtered)
    const safeInput = inputGuard.sanitizedMessage;

    const intent = detectIntent(safeInput, emp.jobType);
    const userMsg: ChatMessage = { id: Date.now().toString(), from: 'user', text: input, ts, intent };
    setMessages(p => [...p, userMsg]);
    const userInput = safeInput;
    setInput('');
    setIsTyping(true);
    typingRef.current = true;
    setThinkingMsg(getThinkingMessage(emp));

    // Avatar reacts to user intent while thinking
    avatarCtrl.current.setExpression('thinking');
    avatarCtrl.current.triggerGesture('think');

    // Build history for NLU
    const history = messages.slice(-20).map(m => ({ from: m.from, text: m.text }));

    try {
      let aiResponse: string;

      if (isWorkerConnected()) {
        // ── Worker NLU Pipeline (LLM-powered intent, sentiment, RAG, state machine) ──
        const nluRes = await WorkerNLU.analyze(empId, userInput, history);
        if (nluRes.success && nluRes.data) {
          // Use Worker to generate response with full NLU context
          const genRes = await WorkerNLU.generate(empId, userInput, history, nluRes.data);
          if (genRes.success && genRes.data?.response) {
            aiResponse = genRes.data.response;
          } else {
            // Worker NLU succeeded but generation failed — use local generation with NLU result
            aiResponse = generateResponseFromNLU(emp, nluRes.data as NLUResult);
          }
        } else {
          // Worker NLU failed — full local fallback
          aiResponse = generateResponse(emp, userInput, messages);
        }
      } else {
        // ── Local NLU Pipeline (enhanced weighted scoring, state machine, tone validation) ──
        aiResponse = generateResponse(emp, userInput, messages);
      }

      // ── OUTPUT GUARDRAILS — PII redaction on AI response, hallucination detection ──
      const outputGuard = runOutputGuardrails(aiResponse);
      aiResponse = outputGuard.cleanedResponse;

      // Surface hallucination/PII warnings as subtle notifications
      if (outputGuard.warnings.length > 0) {
        outputGuard.warnings.forEach(w => notify.info(`Guardrail: ${w}`));
      }

      setThinkingMsg('');
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), from: 'ai', text: aiResponse, ts,
        sentiment: intent,
      };
      setMessages(p => [...p, aiMsg]);
      setIsTyping(false);
      typingRef.current = false;

      // ── AVATAR REACTION — expression + gesture mapped to sentiment/intent ──
      avatarCtrl.current.reactToMessage(intent, intent);

      // ── TTS LIP SYNC — speak the response if voice is enabled ──
      if (voiceEnabled && aiResponse.length < 500) {
        try {
          if (isWorkerConnected()) {
            const res = await fetch('/api/voice/tts', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: aiResponse.slice(0, 300), employeeId: empId }),
            });
            const data = await res.json();
            if (data.success) {
              await avatarCtrl.current.speak(aiResponse, data.data);
            }
          } else {
            // Local Web Speech API + local visemes
            await avatarCtrl.current.speak(aiResponse);
          }
        } catch {
          // TTS failed silently — avatar just won't speak
        }
      }

      const mem = loadMemory(empId);
      const updated = updateMemory(mem, empId, 'current_user', userInput, aiResponse);
      saveMemory(empId, updated);

      trackTask();
      auth.trackUsage();
    } catch (err) {
      // Error fallback — use local generation
      setThinkingMsg('');
      let fallbackResponse = generateResponse(emp, userInput, messages);

      // Still run output guardrails on fallback responses
      const fallbackGuard = runOutputGuardrails(fallbackResponse);
      fallbackResponse = fallbackGuard.cleanedResponse;

      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), from: 'ai', text: fallbackResponse, ts };
      setMessages(p => [...p, aiMsg]);
      setIsTyping(false);
      typingRef.current = false;

      const mem = loadMemory(empId);
      const updated = updateMemory(mem, empId, 'current_user', userInput, fallbackResponse);
      saveMemory(empId, updated);

      trackTask();
      auth.trackUsage();
    }
  }, [input, emp, empId, messages, auth, voiceEnabled]);

  const handleExportChat = () => {
    const text = exportChatHistory(empId);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${emp.name}-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
    notify.addToast('success', 'Exported', 'Chat history downloaded.');
  };

  const handleClearChat = () => {
    if (confirm(`Clear all chat history with ${emp.name}?`)) {
      setMessages([{ id: '0', from: 'ai', text: emp.personality.greeting, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      notify.addToast('success', 'Cleared', 'Chat history cleared.');
    }
  };

  const priorityColor = (p: string) => p === 'high' ? 'bg-red-100 text-red-700' : p === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
  const conversionEvent = auth.getTrialConversionEvent();

  return (
    <div className="bg-gray-50 min-h-screen pt-4 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {conversionEvent && conversionEvent.urgency !== 'low' && (
          <div className={`mb-4 rounded-xl px-4 py-3 flex items-center justify-between ${conversionEvent.urgency === 'high' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className="text-sm font-medium">{conversionEvent.message}</p>
            <button onClick={() => navigate('/pricing')} className="btn-gold text-xs px-4 py-1.5 whitespace-nowrap ml-4">{conversionEvent.ctaText}</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-black bg-transparent border-none cursor-pointer text-sm" aria-label="Back to dashboard">← Back</button>
            <div className="avatar-frame-sm" style={{ width: 40, height: 40 }}><img src={emp.avatar} alt={emp.name} /></div>
            <div><p className="font-bold">{emp.name}</p><p className="text-xs text-gray-500">{emp.role}</p></div>
            <div className="flex items-center gap-1 ml-2"><div className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse-glow 2s infinite' }} /><span className="text-xs text-green-600">Online</span></div>
          </div>
          <div className="flex items-center gap-2">
            {memory && memory.totalMessages > 0 && (
              <button onClick={() => setShowMemory(!showMemory)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border-none cursor-pointer transition-all" aria-label="View conversation memory">
                🧠 {memory.totalMessages} msgs
              </button>
            )}
            <button onClick={handleExportChat} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 border-none cursor-pointer transition-all" aria-label="Export chat">📥 Export</button>
            <button onClick={handleClearChat} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 border-none cursor-pointer transition-all" aria-label="Clear chat">🗑️ Clear</button>
            <div className="flex items-end gap-0.5 h-6" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="w-1 bg-yellow-400 rounded-full" style={{ height: `${20 + Math.random() * 80}%`, animation: `eq-bar ${0.4 + Math.random() * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          </div>
        </div>

        {showMemory && memory && (
          <div className="mb-4 card bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-blue-800">🧠 Conversation Memory</h4>
              <button onClick={() => setShowMemory(false)} className="text-xs text-blue-400 hover:text-blue-600 bg-transparent border-none cursor-pointer">Close</button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div><span className="text-blue-500">Messages:</span> <span className="font-medium">{memory.totalMessages}</span></div>
              <div><span className="text-blue-500">Last Active:</span> <span className="font-medium">{new Date(memory.lastInteraction).toLocaleDateString()}</span></div>
              <div className="col-span-2"><span className="text-blue-500">Topics:</span> <span className="font-medium">{memory.topics.slice(-5).join(', ') || 'None yet'}</span></div>
            </div>
            {memory.summary && <p className="text-xs text-blue-600 mt-2 italic">{memory.summary}</p>}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card p-0 overflow-hidden relative">
            {hasWebGL.current ? (
              <canvas ref={canvasRef} className="w-full" style={{ height: 380, borderRadius: 16 }} aria-label={`3D avatar of ${emp.name}`} />
            ) : (
              <Avatar2D emp={emp} />
            )}
            {/* Avatar Controls Overlay */}
            {hasWebGL.current && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                {/* Camera Presets */}
                <div className="flex gap-1">
                  {(['default', 'closeup', 'wide', 'dramatic'] as CameraPreset[]).map(preset => (
                    <button key={preset} onClick={() => { setCameraPreset(preset); avatarCtrl.current.setCamera(preset); }}
                      className={`px-2 py-1 text-[10px] rounded border-none cursor-pointer transition-all ${cameraPreset === preset ? 'bg-yellow-400 text-black font-bold' : 'bg-black/40 text-white/80 hover:bg-black/60'}`}
                      title={`${preset} camera`}>
                      {preset === 'default' ? '👤' : preset === 'closeup' ? '🔍' : preset === 'wide' ? '🖼️' : '🎬'}
                    </button>
                  ))}
                </div>
                {/* Voice Toggle + Expression Test */}
                <div className="flex gap-1 items-center">
                  <button onClick={() => setVoiceEnabled(v => !v)}
                    className={`px-2 py-1 text-[10px] rounded border-none cursor-pointer transition-all ${voiceEnabled ? 'bg-green-500 text-white' : 'bg-black/40 text-white/80 hover:bg-black/60'}`}
                    title={voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}>
                    {voiceEnabled ? '🔊' : '🔇'}
                  </button>
                  <span className="text-[9px] text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
                    LOD: {avatarCtrl.current.getState().lodLevel}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 card p-0 flex flex-col" style={{ height: 480 }}>
            <div className="flex border-b border-gray-200" role="tablist" aria-label="Workspace tabs">
              {['chat', 'tasks', 'code'].map(t => (
                <button key={t} onClick={() => setWsTab(t)} role="tab" aria-selected={wsTab === t}
                  className={`px-5 py-3 text-sm font-semibold border-none cursor-pointer transition-all capitalize ${wsTab === t ? 'border-b-2 border-yellow-400 text-black bg-white' : 'text-gray-400 bg-transparent hover:text-gray-600'}`}>
                  {t === 'code' ? (isCoder ? 'Code Preview' : 'Analytics') : t}
                </button>
              ))}
            </div>
            {wsTab === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0" role="tabpanel">
                <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite" aria-label="Chat messages">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.from === 'user' ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-800'}`}>
                        <p>{m.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-[10px] ${m.from === 'user' ? 'text-yellow-700' : 'text-gray-400'}`}>{m.ts}</p>
                          {m.intent && m.from === 'user' && (
                            <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{m.intent}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div aria-label={`${emp.name} is thinking`}>
                      {thinkingMsg && <p className="text-xs text-gray-400 mb-1 italic">{thinkingMsg}</p>}
                      <div className="flex gap-1 px-4 py-2">
                        <span className="w-2 h-2 bg-gray-300 rounded-full" style={{ animation: 'typing-dots 1s infinite' }} />
                        <span className="w-2 h-2 bg-gray-300 rounded-full" style={{ animation: 'typing-dots 1s infinite 0.2s' }} />
                        <span className="w-2 h-2 bg-gray-300 rounded-full" style={{ animation: 'typing-dots 1s infinite 0.4s' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-gray-200 flex gap-2">
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Message ${emp.name}...`} aria-label={`Message ${emp.name}`} disabled={isTyping}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white disabled:opacity-50" />
                  <button onClick={sendMessage} disabled={isTyping || !input.trim()} className="btn-gold px-5 py-2 text-sm disabled:opacity-50" aria-label="Send message">Send</button>
                </div>
              </div>
            )}
            {wsTab === 'tasks' && (
              <div className="flex-1 overflow-y-auto p-4" role="tabpanel">
                <div className="grid grid-cols-3 gap-3">
                  {[{ title: 'To Do', items: kanban.todo }, { title: 'In Progress', items: kanban.inProgress }, { title: 'Done', items: kanban.done }].map(col => (
                    <div key={col.title}>
                      <h4 className="font-bold text-sm mb-2 flex items-center gap-2">{col.title}<span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{col.items.length}</span></h4>
                      <div className="space-y-2">
                        {col.items.map((task: any) => (
                          <div key={task.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all">
                            <p className="text-sm font-medium mb-1.5">{task.title}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColor(task.priority)}`}>{task.priority}</span>
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{task.tag}</span>
                            </div>
                            {task.progress !== undefined && (
                              <div className="mt-2 bg-gray-200 rounded-full h-1.5" role="progressbar" aria-valuenow={task.progress} aria-valuemin={0} aria-valuemax={100}>
                                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${task.progress}%` }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {wsTab === 'code' && (
              <div className="flex-1 overflow-y-auto p-4" role="tabpanel">
                {isCoder ? (
                  <div className="bg-gray-900 rounded-xl p-4 text-green-400 mono text-xs leading-relaxed">
                    <p className="text-gray-500">// auth-middleware.ts — Refactored by {emp.name}</p>
                    <p><span className="text-purple-400">import</span> {'{'} jwt, JwtPayload {'}'} <span className="text-purple-400">from</span> <span className="text-yellow-300">'jsonwebtoken'</span>;</p>
                    <p><span className="text-purple-400">import</span> {'{'} RateLimiter {'}'} <span className="text-purple-400">from</span> <span className="text-yellow-300">'./rate-limiter'</span>;</p>
                    <p>&nbsp;</p>
                    <p><span className="text-purple-400">const</span> <span className="text-blue-300">verifyToken</span> = <span className="text-purple-400">async</span> (token: <span className="text-blue-300">string</span>): <span className="text-blue-300">Promise</span>&lt;JwtPayload&gt; =&gt; {'{'}</p>
                    <p>  <span className="text-purple-400">const</span> decoded = jwt.verify(token, process.env.JWT_SECRET!);</p>
                    <p>  <span className="text-purple-400">if</span> (!decoded.sub) <span className="text-purple-400">throw new</span> <span className="text-blue-300">AuthError</span>(<span className="text-yellow-300">'Invalid token'</span>);</p>
                    <p>  <span className="text-purple-400">return</span> decoded <span className="text-purple-400">as</span> JwtPayload;</p>
                    <p>{'}'};</p>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-bold mb-3">Campaign Performance</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ metric: 'Conversion Rate', value: '3.2%', delta: '+0.9%' }, { metric: 'Click-Through Rate', value: '4.7%', delta: '+1.2%' }, { metric: 'Cost per Lead', value: '$12.40', delta: '-$3.20' }, { metric: 'ROAS', value: '4.2x', delta: '+0.8x' }].map((m, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500">{m.metric}</p>
                          <p className="text-xl font-bold">{m.value}</p>
                          <p className="text-xs font-semibold text-green-600">{m.delta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
