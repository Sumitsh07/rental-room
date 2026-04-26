// main.js
import { auth, db, storage } from './firebase-config.js';
import { 
  collection, addDoc, getDocs, onSnapshot, serverTimestamp, getCountFromServer,
  updateDoc, doc, arrayUnion, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let allRooms = [], filteredRooms = [], currentFilter = 'all';
let sampleAdded = false;
let map, markers = [], userMarker, userLat = null, userLng = null;
let currentUser = null, currentRole = null;

// ---------- LOAD STATS ----------
async function loadStats() {
  try {
    const usersSnap = await getCountFromServer(collection(db, "users"));
    const roomsSnap = await getCountFromServer(collection(db, "rooms"));
    document.getElementById('memberCount').textContent = usersSnap.data().count > 0 ? usersSnap.data().count + '+' : '10+';
    document.getElementById('roomCount').textContent = roomsSnap.data().count > 0 ? roomsSnap.data().count + '+' : '5+';
  } catch(e) {
    document.getElementById('memberCount').textContent = '10+';
    document.getElementById('roomCount').textContent = '5+';
  }
}
loadStats();

// ---------- AUTH & LOGOUT ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  currentUser = user;
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    currentRole = snap.data().role;
    const name = snap.data().name;
    document.getElementById('userInfo').innerHTML = 
      `<span style="color:white;font-size:13px">👤 ${name}</span>
       <button class="btn-post" onclick="window.doLogout()" style="margin-left:8px;background:rgba(255,255,255,0.2);color:white;">Logout</button>`;
    if (currentRole === 'malik') {
      document.getElementById('addRoomBtn').style.display = 'inline-block';
    } else {
      document.getElementById('addRoomBtn').style.display = 'none';
    }
  }
});

window.doLogout = async function() {
  await signOut(auth);
  window.location.href = 'login.html';
};

// ---------- MAP INIT ----------
window.addEventListener('DOMContentLoaded', () => {
  map = L.map('map').setView([25.5941, 85.1376], 8);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  onSnapshot(collection(db, "rooms"), (snapshot) => {
    allRooms = [];
    snapshot.forEach(doc => allRooms.push({ id: doc.id, ...doc.data() }));
    if (allRooms.length === 0 && !sampleAdded) { sampleAdded = true; addSampleData(); }
    else { filteredRooms = [...allRooms]; renderAll(); }
  });
});

// ---------- SAMPLE DATA ----------
async function addSampleData() {
  const samples = [
    // PATNA
    { title: "AIIMS Patna के पास Single Room", landmark: "AIIMS Gate से 200m", price: 5500, type: "single", tags: ["furnished","WiFi","AC"], lat: 25.5532, lng: 85.0612, status: "available", city: "Patna", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100001" },
    { title: "Rajendra Nagar Patna Flat", landmark: "Rajendra Nagar Main Road", price: 10000, type: "flat", tags: ["2BHK","parking","AC"], lat: 25.5838, lng: 85.1494, status: "available", city: "Patna", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100002" },
    // GAYA
    { title: "Gaya Junction के पास Double Room", landmark: "Gaya Railway Station से 400m", price: 4000, type: "double", tags: ["geyser","attached bath"], lat: 24.7973, lng: 84.9997, status: "available", city: "Gaya", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100003" },
    { title: "Bodh Gaya Tourist Area PG", landmark: "Mahabodhi Temple के पास", price: 5000, type: "pg", tags: ["WiFi","mess","student"], lat: 24.6961, lng: 84.9916, status: "available", city: "Gaya", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100004" },
    // MUZAFFARPUR
    { title: "Muzaffarpur City Center Room", landmark: "SKM Mall के पास", price: 3500, type: "single", tags: ["geyser","WiFi"], lat: 26.1197, lng: 85.3910, status: "available", city: "Muzaffarpur", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100005" },
    { title: "SKMCH Hospital के पास Flat", landmark: "SKMCH Gate 3 min walk", price: 7500, type: "flat", tags: ["furnished","parking","2BHK"], lat: 26.1250, lng: 85.3800, status: "available", city: "Muzaffarpur", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100006" },
    // BHAGALPUR
    { title: "Bhagalpur Station Road Room", landmark: "Bhagalpur Junction से 300m", price: 4000, type: "single", tags: ["WiFi","fan"], lat: 25.2428, lng: 86.9719, status: "available", city: "Bhagalpur", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100007" },
    { title: "TM Bhagalpur University PG", landmark: "TM Bhagalpur University Gate", price: 3500, type: "pg", tags: ["student","mess","WiFi"], lat: 25.2550, lng: 86.9800, status: "available", city: "Bhagalpur", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100008" },
    // DARBHANGA
    { title: "DMCH के पास Furnished Flat", landmark: "Darbhanga Medical College Gate", price: 6000, type: "flat", tags: ["2BHK","furnished","parking"], lat: 26.1522, lng: 85.8988, status: "available", city: "Darbhanga", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100009" },
    { title: "Laheriasarai Double Room", landmark: "Laheriasarai Bus Stand", price: 3800, type: "double", tags: ["geyser","fan"], lat: 26.1450, lng: 85.9050, status: "available", city: "Darbhanga", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100010" },
    // ARA
    { title: "Ara Court के पास Single Room", landmark: "Ara Court Road", price: 3000, type: "single", tags: ["fan","attached bath"], lat: 25.5569, lng: 84.6616, status: "available", city: "Ara", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100011" },
    { title: "Ara Station Road Flat", landmark: "Ara Railway Station से 500m", price: 6500, type: "flat", tags: ["2BHK","parking","terrace"], lat: 25.5600, lng: 84.6700, status: "available", city: "Ara", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100012" },
    // BEGUSARAI
    { title: "Begusarai BPCL Road Room", landmark: "BPCL Factory Road", price: 3200, type: "single", tags: ["fan","WiFi"], lat: 25.4182, lng: 86.1272, status: "available", city: "Begusarai", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100013" },
    { title: "Begusarai Bus Stand Flat", landmark: "Begusarai Bus Stand के पास", price: 6000, type: "flat", tags: ["2BHK","furnished"], lat: 25.4200, lng: 86.1300, status: "available", city: "Begusarai", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100014" },
    // PURNIA
    { title: "Purnia City Bus Stand Room", landmark: "Purnia City Bus Stand", price: 3500, type: "single", tags: ["fan","attached bath"], lat: 25.7771, lng: 87.4753, status: "available", city: "Purnia", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100015" },
    { title: "MBM College के पास PG", landmark: "MBM College Purnia", price: 4500, type: "pg", tags: ["student","mess","WiFi"], lat: 25.7800, lng: 87.4800, status: "available", city: "Purnia", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100016" },
    // NALANDA
    { title: "Biharsharif Market Double Room", landmark: "Biharsharif Bus Stand", price: 3000, type: "double", tags: ["fan","geyser"], lat: 25.1938, lng: 85.5235, status: "available", city: "Nalanda", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100017" },
    { title: "Nalanda University Area PG", landmark: "Nalanda University Gate", price: 5000, type: "pg", tags: ["student","WiFi","mess"], lat: 25.1350, lng: 85.4440, status: "available", city: "Nalanda", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100018" },
    // VAISHALI (HAJIPUR)
    { title: "Hajipur Bus Stand Flat", landmark: "Hajipur Bus Stand के पास", price: 7000, type: "flat", tags: ["2BHK","parking","furnished"], lat: 25.6877, lng: 85.2119, status: "available", city: "Vaishali", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100019" },
    { title: "Gandhi Setu के पास Single Room", landmark: "Gandhi Setu Hajipur End", price: 3500, type: "single", tags: ["fan","WiFi"], lat: 25.6950, lng: 85.2200, status: "available", city: "Vaishali", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100020" },
    // SARAN (CHHAPRA)
    { title: "Chhapra Court Road Room", landmark: "Chhapra Court के पास", price: 3000, type: "single", tags: ["fan","attached bath"], lat: 25.7814, lng: 84.7339, status: "available", city: "Saran", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100021" },
    { title: "Chhapra Station Flat", landmark: "Chhapra Railway Station 400m", price: 6000, type: "flat", tags: ["2BHK","parking"], lat: 25.7850, lng: 84.7400, status: "available", city: "Saran", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100022" },
    // SIWAN
    { title: "Siwan Market Area Room", landmark: "Siwan Bus Stand के पास", price: 2800, type: "single", tags: ["fan","WiFi"], lat: 26.2197, lng: 84.3574, status: "available", city: "Siwan", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100023" },
    { title: "Siwan College Road Double Room", landmark: "RNS College Siwan", price: 3500, type: "double", tags: ["student","geyser"], lat: 26.2250, lng: 84.3600, status: "available", city: "Siwan", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100024" },
    // GOPALGANJ
    { title: "Gopalganj Bus Stand Room", landmark: "Gopalganj Main Bus Stand", price: 2700, type: "single", tags: ["fan","attached bath"], lat: 26.4674, lng: 84.4385, status: "available", city: "Gopalganj", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100025" },
    { title: "Gopalganj Town Flat", landmark: "Gopalganj Sadar Hospital Road", price: 5500, type: "flat", tags: ["2BHK","terrace"], lat: 26.4700, lng: 84.4400, status: "available", city: "Gopalganj", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100026" },
    // EAST CHAMPARAN (MOTIHARI)
    { title: "Motihari Station Road Room", landmark: "Motihari Railway Station", price: 3000, type: "single", tags: ["fan","WiFi"], lat: 26.6505, lng: 84.9181, status: "available", city: "Motihari", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100027" },
    { title: "Motihari Court Area Double Room", landmark: "Motihari Court के पास", price: 4000, type: "double", tags: ["geyser","attached bath"], lat: 26.6550, lng: 84.9200, status: "available", city: "Motihari", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100028" },
    // WEST CHAMPARAN (BETTIAH)
    { title: "Bettiah Market Single Room", landmark: "Bettiah Bus Stand के पास", price: 2800, type: "single", tags: ["fan","attached bath"], lat: 27.0252, lng: 84.5085, status: "available", city: "Bettiah", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100029" },
    { title: "Bettiah Hospital Road Flat", landmark: "Sadar Hospital Bettiah", price: 5500, type: "flat", tags: ["2BHK","parking"], lat: 27.0280, lng: 84.5100, status: "available", city: "Bettiah", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100030" },
    // SITAMARHI
    { title: "Sitamarhi Janaki Mandir Room", landmark: "Janaki Mandir से 500m", price: 3000, type: "single", tags: ["fan","WiFi"], lat: 26.5921, lng: 85.4906, status: "available", city: "Sitamarhi", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100031" },
    { title: "Sitamarhi Bus Stand Flat", landmark: "Sitamarhi Main Bus Stand", price: 5000, type: "flat", tags: ["2BHK","terrace"], lat: 26.5960, lng: 85.4950, status: "available", city: "Sitamarhi", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100032" },
    // MADHUBANI
    { title: "Madhubani College Road PG", landmark: "RN College Madhubani Gate", price: 3500, type: "pg", tags: ["student","mess","WiFi"], lat: 26.3537, lng: 86.0720, status: "available", city: "Madhubani", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100033" },
    { title: "Madhubani Station Area Room", landmark: "Madhubani Railway Station", price: 2800, type: "single", tags: ["fan","attached bath"], lat: 26.3580, lng: 86.0780, status: "available", city: "Madhubani", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100034" },
    // SAMASTIPUR
    { title: "Samastipur Station Road Room", landmark: "Samastipur Junction 300m", price: 3200, type: "single", tags: ["fan","WiFi"], lat: 25.8583, lng: 85.7783, status: "available", city: "Samastipur", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100035" },
    { title: "Samastipur Market Flat", landmark: "Samastipur Main Market", price: 5800, type: "flat", tags: ["2BHK","parking","furnished"], lat: 25.8620, lng: 85.7820, status: "available", city: "Samastipur", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100036" },
    // MUNGER
    { title: "Munger Ganga Ghat Road Room", landmark: "Munger Ganga Ghat के पास", price: 3500, type: "single", tags: ["fan","attached bath"], lat: 25.3744, lng: 86.4736, status: "available", city: "Munger", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100037" },
    { title: "Munger Fort Area Flat", landmark: "Munger Fort Road", price: 6500, type: "flat", tags: ["2BHK","parking","terrace"], lat: 25.3780, lng: 86.4780, status: "available", city: "Munger", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100038" },
    // LAKHISARAI
    { title: "Lakhisarai Town Single Room", landmark: "Lakhisarai Bus Stand", price: 2500, type: "single", tags: ["fan","attached bath"], lat: 25.1620, lng: 86.0983, status: "available", city: "Lakhisarai", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100039" },
    { title: "Lakhisarai Station Road Double Room", landmark: "Lakhisarai Railway Station", price: 3500, type: "double", tags: ["fan","WiFi"], lat: 25.1650, lng: 86.1010, status: "available", city: "Lakhisarai", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100040" },
    // SHEIKHPURA
    { title: "Sheikhpura Market Room", landmark: "Sheikhpura Main Market", price: 2500, type: "single", tags: ["fan","attached bath"], lat: 25.1398, lng: 85.8465, status: "available", city: "Sheikhpura", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100041" },
    { title: "Sheikhpura Bus Stand Double Room", landmark: "Sheikhpura Bus Stand", price: 3200, type: "double", tags: ["geyser","fan"], lat: 25.1420, lng: 85.8490, status: "available", city: "Sheikhpura", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100042" },
    // NAWADA
    { title: "Nawada Town Single Room", landmark: "Nawada Bus Stand के पास", price: 2800, type: "single", tags: ["fan","WiFi"], lat: 24.8871, lng: 85.5428, status: "available", city: "Nawada", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100043" },
    { title: "Nawada Station Road Flat", landmark: "Nawada Railway Station", price: 5000, type: "flat", tags: ["2BHK","terrace"], lat: 24.8900, lng: 85.5460, status: "available", city: "Nawada", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100044" },
    // AURANGABAD
    { title: "Aurangabad Court Road Room", landmark: "Aurangabad Court के पास", price: 3000, type: "single", tags: ["fan","attached bath"], lat: 24.7519, lng: 84.3733, status: "available", city: "Aurangabad", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100045" },
    { title: "Aurangabad NH Road Double Room", landmark: "Aurangabad NH 139 Road", price: 3800, type: "double", tags: ["geyser","fan","WiFi"], lat: 24.7550, lng: 84.3760, status: "available", city: "Aurangabad", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100046" },
    // KAIMUR (BHABUA)
    { title: "Bhabua Market Single Room", landmark: "Bhabua Market Road", price: 2500, type: "single", tags: ["fan","attached bath"], lat: 25.0413, lng: 83.6030, status: "available", city: "Kaimur", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100047" },
    { title: "Bhabua Bus Stand Flat", landmark: "Bhabua Bus Stand", price: 4800, type: "flat", tags: ["2BHK","parking"], lat: 25.0440, lng: 83.6060, status: "available", city: "Kaimur", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100048" },
    // ROHTAS (SASARAM)
    { title: "Sasaram Station Road Room", landmark: "Sasaram Railway Station", price: 3000, type: "single", tags: ["fan","WiFi"], lat: 24.9470, lng: 84.0326, status: "available", city: "Rohtas", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100049" },
    { title: "Sasaram Court Area Flat", landmark: "Sasaram Court Road", price: 5500, type: "flat", tags: ["2BHK","furnished","parking"], lat: 24.9500, lng: 84.0360, status: "available", city: "Rohtas", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100050" },
    // BUXAR
    { title: "Buxar Ganga Ghat Room", landmark: "Buxar Ganga Ghat से 300m", price: 2800, type: "single", tags: ["fan","attached bath"], lat: 25.5659, lng: 83.9813, status: "available", city: "Buxar", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100051" },
    { title: "Buxar Bus Stand Double Room", landmark: "Buxar Main Bus Stand", price: 3800, type: "double", tags: ["geyser","fan"], lat: 25.5690, lng: 83.9840, status: "available", city: "Buxar", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100052" },
    // JEHANABAD
    { title: "Jehanabad Market Room", landmark: "Jehanabad Main Market", price: 2700, type: "single", tags: ["fan","WiFi"], lat: 25.2149, lng: 84.9887, status: "available", city: "Jehanabad", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100053" },
    { title: "Jehanabad Station Road Flat", landmark: "Jehanabad Railway Station", price: 5000, type: "flat", tags: ["2BHK","terrace"], lat: 25.2180, lng: 84.9910, status: "available", city: "Jehanabad", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100054" },
    // ARWAL
    { title: "Arwal Town Single Room", landmark: "Arwal Bus Stand के पास", price: 2500, type: "single", tags: ["fan","attached bath"], lat: 25.2477, lng: 84.6824, status: "available", city: "Arwal", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100055" },
    { title: "Arwal Court Area Double Room", landmark: "Arwal Sadar Court", price: 3200, type: "double", tags: ["fan","geyser"], lat: 25.2500, lng: 84.6850, status: "available", city: "Arwal", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100056" },
    // SUPAUL
    { title: "Supaul Market Road Room", landmark: "Supaul Main Market", price: 2800, type: "single", tags: ["fan","WiFi"], lat: 26.1229, lng: 86.6032, status: "available", city: "Supaul", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100057" },
    { title: "Supaul Hospital Road Flat", landmark: "Sadar Hospital Supaul", price: 4800, type: "flat", tags: ["2BHK","parking"], lat: 26.1260, lng: 86.6060, status: "available", city: "Supaul", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100058" },
    // MADHEPURA
    { title: "Madhepura Bus Stand Room", landmark: "Madhepura Bus Stand", price: 2800, type: "single", tags: ["fan","attached bath"], lat: 25.9216, lng: 86.7908, status: "available", city: "Madhepura", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100059" },
    { title: "Madhepura College Road PG", landmark: "BN Mandal University Gate", price: 4000, type: "pg", tags: ["student","WiFi","mess"], lat: 25.9250, lng: 86.7940, status: "available", city: "Madhepura", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100060" },
    // SAHARSA
    { title: "Saharsa Station Road Room", landmark: "Saharsa Railway Station", price: 3000, type: "single", tags: ["fan","WiFi"], lat: 25.8778, lng: 86.5961, status: "available", city: "Saharsa", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100061" },
    { title: "Saharsa Market Flat", landmark: "Saharsa Main Market Road", price: 5200, type: "flat", tags: ["2BHK","terrace","parking"], lat: 25.8810, lng: 86.5990, status: "available", city: "Saharsa", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100062" },
    // KHAGARIA
    { title: "Khagaria Town Single Room", landmark: "Khagaria Bus Stand", price: 2600, type: "single", tags: ["fan","attached bath"], lat: 25.5020, lng: 86.4713, status: "available", city: "Khagaria", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100063" },
    { title: "Khagaria Station Road Double Room", landmark: "Khagaria Railway Station", price: 3500, type: "double", tags: ["geyser","fan"], lat: 25.5050, lng: 86.4740, status: "available", city: "Khagaria", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100064" },
    // KISHANGANJ
    { title: "Kishanganj Station Area Room", landmark: "Kishanganj Railway Station", price: 3200, type: "single", tags: ["fan","WiFi"], lat: 26.0950, lng: 87.9523, status: "available", city: "Kishanganj", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100065" },
    { title: "Kishanganj College Road PG", landmark: "Kishanganj College Gate", price: 4000, type: "pg", tags: ["student","mess","WiFi"], lat: 26.0980, lng: 87.9560, status: "available", city: "Kishanganj", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100066" },
    // KATIHAR
    { title: "Katihar Junction Road Room", landmark: "Katihar Railway Station 300m", price: 3500, type: "single", tags: ["fan","WiFi"], lat: 25.5390, lng: 87.5714, status: "available", city: "Katihar", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100067" },
    { title: "Katihar Market Area Flat", landmark: "Katihar Main Market", price: 6000, type: "flat", tags: ["2BHK","parking","furnished"], lat: 25.5420, lng: 87.5750, status: "available", city: "Katihar", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100068" },
    // ARARIA
    { title: "Araria Bus Stand Room", landmark: "Araria Main Bus Stand", price: 2800, type: "single", tags: ["fan","attached bath"], lat: 26.1467, lng: 87.4718, status: "available", city: "Araria", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100069" },
    { title: "Araria Court Road Flat", landmark: "Araria Court के पास", price: 5000, type: "flat", tags: ["2BHK","terrace"], lat: 26.1500, lng: 87.4750, status: "available", city: "Araria", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100070" },
    // SHEOHAR
    { title: "Sheohar Town Single Room", landmark: "Sheohar Bus Stand के पास", price: 2500, type: "single", tags: ["fan","attached bath"], lat: 26.5194, lng: 85.2980, status: "available", city: "Sheohar", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80", contact: "9801100071" },
    { title: "Sheohar Market Double Room", landmark: "Sheohar Main Market", price: 3200, type: "double", tags: ["fan","geyser"], lat: 26.5220, lng: 85.3010, status: "available", city: "Sheohar", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80", contact: "9801100072" },
    // JAMUI
    { title: "Jamui Station Road Room", landmark: "Jamui Railway Station", price: 2700, type: "single", tags: ["fan","WiFi"], lat: 24.9284, lng: 86.2254, status: "available", city: "Jamui", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80", contact: "9801100073" },
    { title: "Jamui Market Area Flat", landmark: "Jamui Main Market", price: 5000, type: "flat", tags: ["2BHK","parking"], lat: 24.9310, lng: 86.2280, status: "available", city: "Jamui", img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80", contact: "9801100074" },
    // BANKA
    { title: "Banka Town Single Room", landmark: "Banka Bus Stand के पास", price: 2600, type: "single", tags: ["fan","attached bath"], lat: 24.8845, lng: 86.9172, status: "available", city: "Banka", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", contact: "9801100075" },
    { title: "Banka Market Road Double Room", landmark: "Banka Market Road", price: 3500, type: "double", tags: ["geyser","fan","WiFi"], lat: 24.8870, lng: 86.9200, status: "available", city: "Banka", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80", contact: "9801100076" },
  ];
  for (const room of samples) {
    await addDoc(collection(db, "rooms"), { ...room, createdAt: serverTimestamp() });
  }
}

// ---------- RENDER FUNCTIONS ----------
window.renderAll = function() {
  renderCards();
  renderMarkers();
  document.getElementById('listingCount').textContent = filteredRooms.length;
}

function renderCards() {
  const list = document.getElementById('roomList');
  list.innerHTML = '';
  if (filteredRooms.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:#888"><div style="font-size:40px">🏠</div><p>कोई कमरा नहीं मिला</p></div>`;
    return;
  }
  filteredRooms.forEach(room => {
    const dist = userLat ? calcDist(userLat, userLng, room.lat, room.lng) : null;
    const card = document.createElement('div');
    card.className = 'room-card';
    card.id = `card-${room.id}`;
    card.onclick = () => focusRoom(room);
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${room.img || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'}" loading="lazy" />
        <span class="card-badge ${room.status === 'full' ? 'full' : ''}">${room.status === 'available' ? '✅ खाली' : '❌ भरा'}</span>
        ${dist ? `<span class="card-distance">📍 ${dist} km</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${room.title}</div>
        <div class="card-landmark">📌 ${room.landmark}</div>
        <div class="card-features">${(room.tags || []).map(t => `<span class="feature-tag">${t}</span>`).join('')}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <button onclick="window.likeRoom(event,'${room.id}')" style="background:#fff3e0;border:1px solid #ffb570;color:#b05500;padding:5px 10px;border-radius:20px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;">
            ❤️ <span id="like-${room.id}">${room.likes || 0}</span>
          </button>
          <div style="display:flex;align-items:center;gap:2px;">
            ${[1,2,3,4,5].map(s => `<span style="color:${s <= Math.round(room.avgRating || 0) ? '#FF6B00' : '#ddd'};font-size:14px;">★</span>`).join('')}
            <span style="font-size:11px;color:#888;margin-left:2px;">(${room.reviewCount || 0})</span>
          </div>
          <button onclick="window.openReview(event,'${room.id}','${room.title}')" style="background:none;border:1px solid #ddd;color:#888;padding:4px 10px;border-radius:20px;font-size:11px;cursor:pointer;">+ Review</button>
        </div>
        <<div class="card-footer">
  <div class="card-price">₹${Number(room.price).toLocaleString('hi')} <span>/ माह</span></div>
  <div style="display:flex;gap:6px;">
    ${room.status === 'available' ? `<button class="btn-contact" onclick="window.callOwner(event,'${room.contact}','${room.title}')">📞 संपर्क</button>` : `<span style="color:#c62828;font-size:12px;font-weight:700">भरा हुआ है</span>`}
    ${currentUser && room.uid === currentUser.uid ? `<button class="btn-contact" onclick="window.openEditModal(event,'${room.id}')" style="background:#1565C0;">✏️ Edit</button>` : ''}
  </div>
</div>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  filteredRooms.forEach((room, i) => {
    if (!room.lat || !room.lng) return;
    const color = room.status === 'available' ? '#FF6B00' : '#c62828';
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${color};color:white;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:700;font-family:'Baloo 2',cursive;box-shadow:0 3px 10px rgba(0,0,0,0.3);white-space:nowrap;position:relative;">
            ₹${(room.price/1000).toFixed(1)}k
            <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:${color};border-bottom:none;"></div>
          </div>`,
      iconSize: [null, null], iconAnchor: [30, 30]
    });
    const m = L.marker([room.lat, room.lng], { icon }).addTo(map)
      .bindPopup(`
        <div style="font-family:'Noto Sans Devanagari',sans-serif;min-width:200px">
          <img src="${room.img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px"/>
          <strong style="font-size:14px;font-family:'Baloo 2',cursive">${room.title}</strong><br/>
          <span style="color:#FF6B00;font-size:12px">📌 ${room.landmark}</span><br/>
          <span style="font-size:18px;font-weight:800;color:#FF6B00;font-family:'Baloo 2',cursive">₹${Number(room.price).toLocaleString('hi')}/माह</span><br/>
          <span style="font-size:12px;color:${color}">${room.status === 'available' ? '✅ खाली है' : '❌ भरा हुआ'}</span>
        </div>
      `);
    m.on('click', () => {
      document.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'));
      document.getElementById(`card-${room.id}`)?.classList.add('selected');
      document.getElementById(`card-${room.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    markers.push(m);
  });
}

function focusRoom(room) {
  document.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`card-${room.id}`)?.classList.add('selected');
  if (room.lat && room.lng) {
    map.setView([room.lat, room.lng], 14, { animate: true });
    markers[filteredRooms.indexOf(room)]?.openPopup();
  }
}

// ---------- GEOLOCATION ----------
window.getUserLocation = function() {
  const hint = document.getElementById('locationHint');
  hint.innerHTML = '⏳ Location ढूंढ रहे हैं...';
  if (!navigator.geolocation) { hint.textContent = '❌ Browser support नहीं है'; return; }
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const city = data.address.city || data.address.town || 'Bihar';
        const area = data.address.suburb || data.address.neighbourhood || city;
        document.getElementById('searchInput').value = area + ', ' + city;
        hint.textContent = `✅ Location मिली: ${area}, ${city}`;
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.marker([userLat, userLng], {
          icon: L.divIcon({ html: `<div style="background:#1565C0;color:white;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;">📍 आप यहाँ</div>`, className: '', iconAnchor: [30, 20] })
        }).addTo(map).bindPopup('आप यहाँ हैं').openPopup();
        map.setView([userLat, userLng], 12, { animate: true });
        filteredRooms.sort((a,b) => calcDist(userLat,userLng,a.lat,a.lng) - calcDist(userLat,userLng,b.lat,b.lng));
        renderAll();
      });
  }, err => { hint.textContent = '❌ Location नहीं मिली। Permission allow करें।'; }, { enableHighAccuracy: true, timeout: 10000 });
}

// ---------- SEARCH & FILTER ----------
window.searchRooms = function() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();

  if (q === '') {
    // Search empty hai — sab dikhao
    filteredRooms = allRooms.filter(r => currentFilter === 'all' || matchFilter(r));
  } else {
    // Search hai — sirf matching rooms dikhao
    filteredRooms = allRooms.filter(r => {
      const filterMatch = currentFilter === 'all' || matchFilter(r);
      const searchMatch =
        r.title?.toLowerCase().includes(q) ||
        r.landmark?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q));
      return filterMatch && searchMatch;
    });
  }

  renderAll();
  if (filteredRooms.length > 0) {
    const bounds = L.latLngBounds(filteredRooms.filter(r => r.lat && r.lng).map(r => [r.lat, r.lng]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }
}

window.filterBy = function(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  filteredRooms = allRooms.filter(r => type === 'all' || matchFilter(r));
  renderAll();
}

function matchFilter(room) {
  if (currentFilter === 'furnished') return room.type === 'furnished' || room.tags?.includes('furnished');
  if (currentFilter === 'hostel') return room.type === 'hostel' || room.tags?.includes('hostel');
  return room.type === currentFilter;
}

// ---------- MODAL (ADD ROOM) ----------
window.openModal = function() {
  document.getElementById('modalOverlay').classList.add('open');
  const hint = document.getElementById('formLocationHint');
  hint.innerHTML = '⏳ आपकी location ले रहे हैं...';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      window._formLat = pos.coords.latitude;
      window._formLng = pos.coords.longitude;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
        .then(r => r.json())
        .then(data => {
          const city = data.address.city || data.address.town || '';
          const area = data.address.suburb || data.address.neighbourhood || data.address.village || '';
          const citySelect = document.getElementById('city');
          const matchedCity = [...citySelect.options].find(o => city.toLowerCase().includes(o.value.toLowerCase()));
          if (matchedCity) citySelect.value = matchedCity.value;
          if (area) document.getElementById('address').value = area + ', ' + city;
          hint.innerHTML = `✅ Location मिली: ${area || city} — map पर सही जगह दिखेगा`;
        });
    }, () => { window._formLat = null; window._formLng = null; hint.innerHTML = '⚠️ Location नहीं मिली'; }, { enableHighAccuracy: true, timeout: 8000 });
  }
}

window.previewImg = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { document.getElementById('imgHint').textContent = '❌ फोटो 5MB से छोटी होनी चाहिए'; return; }
  const reader = new FileReader();
  window._formImgFile = file;
reader.onload = function(e) {
    window._formImgBase64 = e.target.result;
    document.getElementById('imgPreview').src = e.target.result;
    document.getElementById('imgPreviewBox').style.display = 'block';
    document.getElementById('imgHint').textContent = '✅ फोटो ready है';
  };
  reader.readAsDataURL(file);
}

window.getFormLocation = function() {
  const btn = document.getElementById('getLocBtn');
  const hint = document.getElementById('addrHint');
  const formHint = document.getElementById('formLocationHint');
  btn.textContent = '⏳'; btn.disabled = true;
  hint.textContent = 'Location ढूंढ रहे हैं...';
  if (!navigator.geolocation) { hint.textContent = '❌ Browser location support नहीं करता'; btn.textContent = '📍'; btn.disabled = false; return; }
  navigator.geolocation.getCurrentPosition(pos => {
    window._formLat = pos.coords.latitude;
    window._formLng = pos.coords.longitude;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${window._formLat}&lon=${window._formLng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const area = data.address.suburb || data.address.neighbourhood || data.address.village || '';
        const city = data.address.city || data.address.town || '';
        const road = data.address.road || '';
        const full = [road, area, city].filter(Boolean).join(', ');
        document.getElementById('address').value = full;
        const citySelect = document.getElementById('city');
        const match = [...citySelect.options].find(o => city.toLowerCase().includes(o.value.toLowerCase()));
        if (match) citySelect.value = match.value;
        hint.textContent = `✅ ${full}`;
        if (formHint) formHint.innerHTML = `✅ Location मिली: ${area || city}`;
        if (map) {
          map.setView([window._formLat, window._formLng], 15, { animate: true });
          if (window._formTempMarker) map.removeLayer(window._formTempMarker);
          window._formTempMarker = L.marker([window._formLat, window._formLng], {
            icon: L.divIcon({ html: `<div style="background:#FF6B00;color:white;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:0 3px 10px rgba(0,0,0,0.3);">🏠 आपका कमरा</div>`, className: '', iconAnchor: [50, 20] })
          }).addTo(map).bindPopup(`📍 ${full}`).openPopup();
        }
        btn.textContent = '✅'; btn.style.background = '#2e7d32'; btn.disabled = false;
      });
  }, err => { hint.textContent = '❌ Permission allow करें'; btn.textContent = '📍'; btn.disabled = false; }, { enableHighAccuracy: true, timeout: 10000 });
}

window.closeModal = function() {
  document.getElementById('modalOverlay').classList.remove('open');
  window._formImgBase64 = null;
  window._formLat = null;
  window._formLng = null;
  document.getElementById('imgPreviewBox').style.display = 'none';
  document.getElementById('imgHint').textContent = '';
  document.getElementById('roomImg').value = '';
}

window.submitListing = async function() {
  const name = document.getElementById('ownerName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const addr = document.getElementById('address').value.trim();
  const rent = document.getElementById('rent').value.trim();
  const type = document.getElementById('roomType').value;
  const desc = document.getElementById('desc').value.trim();
  const city = document.getElementById('city').value;
  if (!name || !phone || !addr || !rent) { alert('❌ कृपया सभी जरूरी जानकारी भरें।'); return; }
  const btn = document.querySelector('.btn-submit');
  btn.textContent = '⏳ Save हो रहा है...'; btn.disabled = true;
  try {
    const cityCoords = { 'Patna': { lat: 25.5941, lng: 85.1376 }, 'Gaya': { lat: 24.7973, lng: 84.9997 }, 'Muzaffarpur': { lat: 26.1197, lng: 85.3910 }, 'Bhagalpur': { lat: 25.2428, lng: 86.9719 }, 'Darbhanga': { lat: 26.1522, lng: 85.8988 }, 'Ara': { lat: 25.5569, lng: 84.6616 }, 'Begusarai': { lat: 25.4182, lng: 86.1272 }, 'Purnia': { lat: 25.7771, lng: 87.4753 } };
    const fallback = cityCoords[city] || { lat: 25.5941, lng: 85.1376 };
    const finalLat = window._formLat || (fallback.lat + (Math.random() * 0.02 - 0.01));
    const finalLng = window._formLng || (fallback.lng + (Math.random() * 0.02 - 0.01));
   let imgToSave = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400";
if (window._formImgBase64) {
  imgToSave = window._formImgBase64;
}
await addDoc(collection(db, "rooms"), {
  title: `${city} — ${addr}`, landmark: addr, price: Number(rent), type: type, tags: desc ? desc.split(',').map(t => t.trim()) : [],
  lat: finalLat, lng: finalLng, status: "available", city: city,
  img: imgToSave,
  contact: phone, owner: name, uid: currentUser.uid, createdAt: serverTimestamp()
});
    alert(`✅ ${name} जी, आपका कमरा सफलतापूर्वक list हो गया!\n\nकिराया: ₹${Number(rent).toLocaleString('hi')}/माह\nशहर: ${city}`);
    closeModal();
    ['ownerName','phone','address','rent','desc'].forEach(id => document.getElementById(id).value = '');
  } catch (err) { alert('❌ Error आया: ' + err.message); }
  finally { btn.textContent = '✅ List कराएं'; btn.disabled = false; }
}

// ---------- LIKE & REVIEW ----------
window.likeRoom = async function(e, roomId) {
  e.stopPropagation();
  if (localStorage.getItem('liked_' + roomId)) {
    alert('आपने पहले से ❤️ like किया है!');
    return;
  }
  try {
    const roomRef = doc(db, "rooms", roomId);
    const room = allRooms.find(r => r.id === roomId);
    const newLikes = (room.likes || 0) + 1;
    await updateDoc(roomRef, { likes: newLikes });
    document.getElementById(`like-${roomId}`).textContent = newLikes;
    room.likes = newLikes;
    localStorage.setItem('liked_' + roomId, '1');
  } catch(e) { console.log(e); }
}

window.openReview = function(e, roomId, roomTitle) {
  e.stopPropagation();
  const existing = document.getElementById('reviewModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'reviewModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:white;border-radius:20px;padding:24px;max-width:360px;width:100%;">
      <h3 style="font-family:'Baloo 2',cursive;color:#1a0a00;margin-bottom:16px;">⭐ Review दें</h3>
      <p style="font-size:13px;color:#888;margin-bottom:12px;">${roomTitle}</p>
      <div style="display:flex;gap:6px;margin-bottom:14px;" id="starSelect">
        ${[1,2,3,4,5].map(s => `<span onclick="window.selectStar(${s})" data-star="${s}" style="font-size:28px;cursor:pointer;color:#ddd;">★</span>`).join('')}
      </div>
      <textarea id="reviewText" placeholder="अपना अनुभव लिखें..." style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:10px;font-family:'Noto Sans Devanagari',sans-serif;font-size:13px;height:80px;outline:none;resize:none;"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button onclick="document.getElementById('reviewModal').remove()" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:10px;background:white;cursor:pointer;">रद्द करें</button>
        <button onclick="window.submitReview('${roomId}')" style="flex:1;padding:10px;background:#FF6B00;color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;">Submit ✅</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window._selectedStar = 0;
}

window.selectStar = function(n) {
  window._selectedStar = n;
  document.querySelectorAll('#starSelect span').forEach(s => {
    s.style.color = parseInt(s.dataset.star) <= n ? '#FF6B00' : '#ddd';
  });
}

window.submitReview = async function(roomId) {
  const text = document.getElementById('reviewText').value.trim();
  const star = window._selectedStar || 0;
  if (!star) { alert('⭐ Rating zaroor dein!'); return; }
  try {
    const roomRef = doc(db, "rooms", roomId);
    const room = allRooms.find(r => r.id === roomId);
    const oldCount = room.reviewCount || 0;
    const oldAvg = room.avgRating || 0;
    const newCount = oldCount + 1;
    const newAvg = ((oldAvg * oldCount) + star) / newCount;
    await updateDoc(roomRef, {
      reviewCount: newCount,
      avgRating: Math.round(newAvg * 10) / 10,
      reviews: arrayUnion({ text, star, date: new Date().toLocaleDateString('hi') })
    });
    document.getElementById('reviewModal').remove();
    alert('✅ Review submit ho gaya! Shukriya 🙏');
  } catch(e) { alert('❌ Error: ' + e.message); }
}

window.callOwner = function(e, phone, title) {
  e.stopPropagation();
  if (confirm(`${title}\n\nमकान मालिक को call करें?\n📞 ${phone}`)) window.location.href = `tel:${phone}`;
}

// ---------- CHATBOT ----------
window.toggleChat = function() {
  const box = document.getElementById('chatBox');
  const btn = document.getElementById('chatToggleBtn');
  const isOpen = box.style.display !== 'none';
  box.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? '💬' : '✕';
}

window.sendQuick = function(text) {
  document.getElementById('chatInput').value = text;
  sendChat();
}

function addMsg(text, isUser) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.style.cssText = isUser
    ? 'background:#FF6B00;color:white;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:13px;max-width:85%;align-self:flex-end;line-height:1.5;margin-left:auto;'
    : 'background:white;padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:13px;color:#1a0a00;max-width:85%;box-shadow:0 1px 4px rgba(0,0,0,0.08);line-height:1.6;';
  div.innerHTML = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

const jawab = [
  { keywords: ['ढूंढ','search','खोज','कैसे मिलेगा','room','कमरा','find'], reply: '🔍 <b>कमरा ढूंढने के लिए:</b><br/>1. ऊपर search box में जगह या landmark लिखें<br/>2. 📍 button से अपनी location दें<br/>3. Filter से Single/Double/PG चुनें<br/>4. Map पर भी देख सकते हैं!' },
  { keywords: ['किराया','rent','price','कितना','महंगा','सस्ता','charge'], reply: '💰 <b>Bihar में किराये की जानकारी:</b><br/>• Single Room: ₹2,000–₹5,000/माह<br/>• Double Room: ₹3,500–₹7,000/माह<br/>• PG: ₹3,000–₹6,000/माह<br/>• Flat: ₹6,000–₹15,000/माह<br/><br/>Patna में थोड़ा ज़्यादा होता है।' },
  { keywords: ['list','डालें','add','post','अपना','मकान मालिक','देना'], reply: '🏠 <b>कमरा list करने के लिए:</b><br/>1. पहले <b>Makan Malik</b> account बनाएं<br/>2. Login करें<br/>3. ऊपर "+ कमरा डालें" button दबाएं<br/>4. जानकारी भरें और submit करें<br/><br/>✅ कमरा तुरंत live हो जाएगा!' },
  { keywords: ['संपर्क','contact','call','phone','नंबर','malik','मालिक'], reply: '📞 <b>मकान मालिक से संपर्क:</b><br/>किसी भी कमरे के card पर<br/>"📞 संपर्क" button दबाएं।<br/><br/>सीधे call का option मिलेगा!' },
  { keywords: ['login','account','register','signup','बनाएं','नया'], reply: '👤 <b>Account बनाने के लिए:</b><br/>1. Login page पर जाएं<br/>2. "नया Account" tab चुनें<br/>3. किरायेदार या मकान मालिक role चुनें<br/>4. Email और password डालें<br/>5. Submit करें — हो गया! ✅' },
  { keywords: ['map','नक्शा','location','कहाँ','address','जगह'], reply: '🗺️ <b>Map इस्तेमाल करने के लिए:</b><br/>• Right side में map दिखेगा<br/>• Orange pin = available कमरा<br/>• Pin पर click करें — details दिखेंगी<br/>• 📍 button से अपनी location set करें' },
  { keywords: ['furnished','ac','wifi','सुविधा','facility','गीजर','parking'], reply: '🪑 <b>सुविधाओं के हिसाब से filter:</b><br/>• ऊपर "Furnished" filter दबाएं<br/>• AC, WiFi वाले कमरे अलग दिखेंगे<br/>• Card पर tags से पता चलता है' },
  { keywords: ['student','pg','hostel','पीजी','छात्र','college','university'], reply: '📚 <b>Students के लिए:</b><br/>• "PG" या "Students" filter use करें<br/>• PG में mess, WiFi सुविधा मिलती है<br/>• College के पास के rooms ₹3,000–₹6,000 में मिलते हैं' },
  { keywords: ['patna','गया','gaya','muzaffarpur','भागलपुर','दरभंगा','शहर','city'], reply: '📍 <b>शहर के हिसाब से खोजें:</b><br/>Search box में शहर का नाम लिखें:<br/>• Patna, Gaya, Muzaffarpur<br/>• Bhagalpur, Darbhanga, Ara<br/><br/>या map पर zoom करके देखें!' },
  { keywords: ['problem','error','नहीं','काम','help','परेशानी','issue'], reply: '🛠️ <b>कोई problem है?</b><br/>• Page refresh करें (F5)<br/>• Live Server से खोलें<br/>• Location permission allow करें<br/><br/>अगर फिर भी problem हो तो हमें WhatsApp करें।' }
];

function getReply(text) {
  const lower = text.toLowerCase();
  for (const item of jawab) {
    if (item.keywords.some(k => lower.includes(k))) return item.reply;
  }
  return '🙏 Maafi chahta hoon, ye sawaal mujhe samajh nahi aaya।<br/><br/>Aap puch sakte hain:<br/>• कमरा कैसे ढूंढें<br/>• किराया कितना है<br/>• List कैसे करें<br/>• संपर्क कैसे करें';
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  document.getElementById('quickBtns').style.display = 'none';
  addMsg(text, true);
  input.value = '';
  setTimeout(() => { addMsg(getReply(text), false); }, 600);
}
window.sendChat = sendChat;

// helper function for distance calculation
function calcDist(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

// Event listeners for DOM
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') window.searchRooms(); });
  }
  searchInput.addEventListener('input', e => {
  if (e.target.value.trim() === '') {
    filteredRooms = allRooms.filter(r => currentFilter === 'all' || matchFilter(r));
    renderAll();
  }
});
  const modalOverlay = document.getElementById('modalOverlay');
  // ---------- EDIT ROOM MODAL ----------
window.openEditModal = function(e, roomId) {
  e.stopPropagation();
  const room = allRooms.find(r => r.id === roomId);
  if (!room) return;

  const existing = document.getElementById('editModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'editModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:white;border-radius:20px;padding:28px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;position:relative;">
      <button onclick="document.getElementById('editModal').remove()" style="position:absolute;top:14px;right:16px;font-size:22px;cursor:pointer;color:#888;background:none;border:none;">✕</button>
      <h2 style="font-family:'Baloo 2',cursive;font-size:20px;color:#1a0a00;margin-bottom:16px;">✏️ कमरा Edit करें</h2>
      
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">मकान मालिक का नाम *</label>
        <input id="edit_owner" type="text" value="${room.owner || ''}" style="width:100%;padding:11px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-family:'Noto Sans Devanagari',sans-serif;outline:none;" />
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">फोन नंबर *</label>
        <input id="edit_phone" type="tel" value="${room.contact || ''}" style="width:100%;padding:11px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-family:'Noto Sans Devanagari',sans-serif;outline:none;" />
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">पता / Landmark *</label>
        <input id="edit_addr" type="text" value="${room.landmark || ''}" style="width:100%;padding:11px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-family:'Noto Sans Devanagari',sans-serif;outline:none;" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div>
          <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">किराया (₹/माह) *</label>
          <input id="edit_rent" type="number" value="${room.price || ''}" style="width:100%;padding:11px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;outline:none;" />
        </div>
        <div>
          <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">कमरे का प्रकार</label>
          <select id="edit_type" style="width:100%;padding:11px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;outline:none;">
            <option value="single" ${room.type==='single'?'selected':''}>Single Room</option>
            <option value="double" ${room.type==='double'?'selected':''}>Double Room</option>
            <option value="flat" ${room.type==='flat'?'selected':''}>Flat/Apartment</option>
            <option value="pg" ${room.type==='pg'?'selected':''}>PG</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">सुविधाएं (comma से)</label>
        <textarea id="edit_tags" rows="2" style="width:100%;padding:11px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;font-family:'Noto Sans Devanagari',sans-serif;outline:none;resize:none;">${(room.tags||[]).join(', ')}</textarea>
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">कमरे का Status</label>
        <select id="edit_status" style="width:100%;padding:11px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:14px;outline:none;">
          <option value="available" ${room.status==='available'?'selected':''}>✅ खाली है</option>
          <option value="full" ${room.status==='full'?'selected':''}>❌ भरा हुआ है</option>
        </select>
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:13px;color:#555;margin-bottom:5px;">नई फोटो (optional)</label>
        <div id="edit_imgPreviewBox" style="${room.img ? 'display:block' : 'display:none'};margin-bottom:8px;">
          <img id="edit_imgPreview" src="${room.img || ''}" style="width:100%;height:140px;object-fit:cover;border-radius:10px;" />
        </div>
        <label for="edit_roomImg" style="display:flex;align-items:center;gap:10px;padding:12px 16px;border:2px dashed #ffb570;border-radius:12px;cursor:pointer;background:#fff8ee;color:#b05500;font-size:13px;">
          📷 नई फोटो चुनें
          <input type="file" id="edit_roomImg" accept="image/*" style="display:none" onchange="window.previewEditImg(this)" />
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button onclick="document.getElementById('editModal').remove()" style="flex:1;padding:14px;border:1px solid #ddd;border-radius:12px;background:white;cursor:pointer;font-size:14px;">रद्द करें</button>
        <button onclick="window.saveEdit('${roomId}')" style="flex:1;padding:14px;background:#FF6B00;color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans Devanagari',sans-serif;">💾 Save करें</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window._editImgBase64 = null;
}

window.previewEditImg = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    window._editImgBase64 = e.target.result;
    document.getElementById('edit_imgPreview').src = e.target.result;
    document.getElementById('edit_imgPreviewBox').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

window.saveEdit = async function(roomId) {
  const owner = document.getElementById('edit_owner').value.trim();
  const phone = document.getElementById('edit_phone').value.trim();
  const addr = document.getElementById('edit_addr').value.trim();
  const rent = document.getElementById('edit_rent').value.trim();
  const type = document.getElementById('edit_type').value;
  const tags = document.getElementById('edit_tags').value.trim();
  const status = document.getElementById('edit_status').value;
  if (!owner || !phone || !addr || !rent) { alert('❌ सभी जरूरी जानकारी भरें।'); return; }

  const updateData = {
    owner, contact: phone, landmark: addr,
    title: `${document.getElementById('edit_type').value === 'flat' ? 'Flat' : 'Room'} — ${addr}`,
    price: Number(rent), type, status,
    tags: tags ? tags.split(',').map(t => t.trim()) : []
  };
  if (window._editImgBase64) updateData.img = window._editImgBase64;

  try {
    await updateDoc(doc(db, "rooms", roomId), updateData);
    document.getElementById('editModal').remove();
    alert('✅ कमरा successfully update हो गया!');
  } catch(err) { alert('❌ Error: ' + err.message); }
}
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => { if (e.target === e.currentTarget) window.closeModal(); });
  }
});
