import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {advance, beam, initialState, length, start} from './model.js';
import './style.css';

const stage = document.querySelector('#stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#15202a');
scene.fog = new THREE.Fog('#15202a', 33, 86);
const camera = new THREE.PerspectiveCamera(42, 16 / 9, .1, 160);
camera.position.set(14, 10, 18);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.setAttribute('aria-label', '虚拟输送线三维视图');
stage.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);
controls.maxPolarAngle = Math.PI * .46;
controls.minDistance = 14;
controls.maxDistance = 52;

const sky = new THREE.HemisphereLight(0xd3e9f5, 0x453423, 2);
scene.add(sky);
const key = new THREE.DirectionalLight(0xfdf4df, 2.3);
key.position.set(6, 16, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, {left:-16, right:16, top:16, bottom:-16});
scene.add(key);

function box(w,h,d,x,y,z,color, metalness=0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color, metalness, roughness: .63}));
  mesh.position.set(x,y,z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

box(64, .2, 45, 0,-.26,0, '#273743');
const grid = new THREE.GridHelper(60, 30, '#465a6c', '#354655');
grid.position.y = -.14;
scene.add(grid);
const roller = new THREE.MeshStandardMaterial({color:'#a9c4c9', metalness: .53, roughness: .38});
for (let x=-9.7; x<=9.7; x+=.53) {
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,2.68,12), roller);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(x, 1.35, 0);
  roll.castShadow = true;
  scene.add(roll);
}
const zones = [
  {id:'feed', name:'进料端', text:'箱体进入输送区，状态由仿真计时器推进。', x:-7, color:'#2bb8a6'},
  {id:'sensor', name:'S1 光电', text:'箱体越过光束时产生一次检测事件。堵料时光束持续遮挡。', x:beam-9, color:'#f7a64f'},
  {id:'exit', name:'出料端', text:'箱体离开输送区，演示周期结束。', x:8, color:'#73a9f7'},
];
for (const zone of zones) {
  const marker = box(2.2,.12,3.6,zone.x,.04,0,zone.color);
  marker.userData.zone = zone;
}
for (const lane of [-1.49,1.49]) {
  box(20,.34,.19,0,1.29,lane,'#2b6881', .4);
  for (const x of [-8,-4,0,4,8]) {
    box(.17,1.2,.21,x,.6,lane,'#7995a3', .5);
    box(.54,.1,.52,x,.08,lane,'#627d89');
  }
}
const sensor = box(.42,.58,.34,beam-9,1.85,-1.63,'#f28c2a');
sensor.userData.zone = zones[1];
box(.42,.58,.34,beam-9,1.85,1.63,'#f28c2a').userData.zone=zones[1];
const light = box(.19,.22,2.9,beam-9,1.84,0,'#3dd5a1');
light.material.transparent = true;
light.material.opacity = .23;
const cargo = box(1.25,.88,1.25,-9,1.98,0,'#e6bc79');
const sealing = box(.15,.018,1.24,-9,2.428,0,'#f9d59d');
let state = initialState();
const status = document.querySelector('#status');
const events = document.querySelector('#events');
const selected = document.querySelector('#selected');
const speedInput = document.querySelector('#speed');
let prevEvents;
function setZone(zone) {
  selected.querySelector('h2').textContent = zone.name;
  selected.querySelector('p').textContent = zone.text;
  for (const button of document.querySelectorAll('[data-zone]')) {
    button.setAttribute('aria-pressed', String(button.dataset.zone === zone.id));
  }
}
for (const zone of zones) {
  document.querySelector('[data-zone='+zone.id+']').onclick = () => setZone(zone);
}
setZone(zones[0]);
const raycaster = new THREE.Raycaster();
const press = new THREE.Vector2();
renderer.domElement.addEventListener('click', event => {
  const rect = renderer.domElement.getBoundingClientRect();
  press.set((event.clientX-rect.left)/rect.width*2-1, 1-(event.clientY-rect.top)/rect.height*2);
  raycaster.setFromCamera(press,camera);
  const hit = raycaster.intersectObjects(scene.children).find(entry=>entry.object.userData.zone);
  if (hit) setZone(hit.object.userData.zone);
});
document.querySelector('#normal').onclick=()=>{state=start('normal');};
document.querySelector('#jam').onclick=()=>{state=start('jam');};
document.querySelector('#reset').onclick=()=>{state=initialState();};
function fit() {
  const {clientWidth: w, clientHeight: h} = stage;
  if (w === 0 || h === 0) return;
  renderer.setSize(w,h);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(fit).observe(stage);
let last = performance.now();
renderer.setAnimationLoop(now => {
  const elapsed = Math.max(0, Math.min(1, (now-last)/1000));
  const steps = Math.max(1, Math.ceil(elapsed/.05));
  for (let step = 0; step < steps; step++) {
    state = advance(state, elapsed/steps, +speedInput.value);
  }
  last=now;
  const onBeam = state.detected && state.x < beam+1.1;
  light.material.color.set(onBeam ? '#ff744f' : '#3dd5a1');
  light.visible = !onBeam;
  sensor.material.emissive.set(onBeam ? '#990a02' : '#000000');
  cargo.position.x=sealing.position.x=state.x-9;
  const message = {idle:'待启动',normal:'正常进料',jam:'堵料演练',complete:'出料完成',alarm:'报警停机'}[state.mode];
  status.textContent=message;
  status.dataset.mode=state.mode;
  if (prevEvents !== state.events.join('|')) {
    prevEvents = state.events.join('|');
    events.replaceChildren(...state.events.map(value => {
      const li=document.createElement('li');
      li.textContent=value;
      return li;
    }));
  }
  controls.update();
  renderer.render(scene,camera);
});

