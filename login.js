// login.js
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let selectedRole = 'user';

// Already logged in check
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      window.location.href = 'index.html';
    }
  }
});

window.selectRole = function(role) {
  selectedRole = role;
  document.getElementById('roleUser').classList.toggle('active', role === 'user');
  document.getElementById('roleMalik').classList.toggle('active', role === 'malik');
};

window.switchTab = function(tab) {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
  document.getElementById('authMsg').textContent = '';
};

function showMsg(text, type) {
  const el = document.getElementById('authMsg');
  el.textContent = text;
  el.className = 'msg ' + type;
}

window.doSignup = async function() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPass').value;
  if (!name || !email || !pass) { showMsg('❌ सभी field भरें', 'error'); return; }
  if (pass.length < 6) { showMsg('❌ Password कम से कम 6 अक्षर का होना चाहिए', 'error'); return; }

  const btn = document.getElementById('signupBtn');
  btn.textContent = '⏳...'; btn.disabled = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", cred.user.uid), {
      name, email, role: selectedRole, createdAt: new Date().toISOString()
    });
    showMsg('✅ Account बन गया! Redirect हो रहे हैं...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1200);
  } catch(e) {
    const msgs = {
      'auth/email-already-in-use': '❌ यह Email पहले से registered है',
      'auth/invalid-email': '❌ Email सही नहीं है',
      'auth/weak-password': '❌ Password कमज़ोर है'
    };
    showMsg(msgs[e.code] || '❌ Error: ' + e.message, 'error');
    btn.textContent = '✅ Account बनाएं'; btn.disabled = false;
  }
};

window.doLogin = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!email || !pass) { showMsg('❌ Email और Password भरें', 'error'); return; }

  const btn = document.getElementById('loginBtn');
  btn.textContent = '⏳...'; btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showMsg('✅ Login हो गया! Redirect हो रहे हैं...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
  } catch(e) {
    const msgs = {
      'auth/user-not-found': '❌ Email registered नहीं है',
      'auth/wrong-password': '❌ Password गलत है',
      'auth/invalid-email': '❌ Email सही नहीं है',
      'auth/invalid-credential': '❌ Email या Password गलत है'
    };
    showMsg(msgs[e.code] || '❌ Error: ' + e.message, 'error');
    btn.textContent = '🔐 Login करें'; btn.disabled = false;
  }
};