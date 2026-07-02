import { auth, db, storage } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export function calcularEdad(fechaNacimiento) {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const diffMes = hoy.getMonth() - nacimiento.getMonth();
  if (diffMes < 0 || (diffMes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

export async function registrarUsuaria({ email, password, perfil, fotoFile }) {
  const credencial = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credencial.user.uid;

  let fotoUrl = "";
  let estadoFoto = "sin_foto";
  if (fotoFile) {
    const fotoRef = ref(storage, `fotos_perfil/${uid}/perfil.jpg`);
    await uploadBytes(fotoRef, fotoFile);
    fotoUrl = await getDownloadURL(fotoRef);
    estadoFoto = "en_revision";
  }

  const userDoc = {
    uid,
    email,
    nombre: perfil.nombre || "",
    apodo: perfil.apodo || "",
    rol: perfil.rol,
    clubId: perfil.clubId || "",
    categoria: perfil.categoria || "",
    puesto: perfil.puesto || "",
    fechaNacimiento: perfil.fechaNacimiento || "",
    edad: perfil.edad ?? null,
    liga: perfil.liga || "",
    fotoUrl,
    estadoFoto,
    votosFotoAprobar: 0,
    votosFotoRechazar: 0,
    estadoConsentimiento: "no_requerido",
    permiteSaludoPublico: false,
    futsacoins: 0,
    rachaActual: 0,
    ultimaAperturaFecha: "",
    creadoEn: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", uid), userDoc);
  return uid;
}

export async function iniciarSesion(email, password) {
  const credencial = await signInWithEmailAndPassword(auth, email, password);
  return credencial.user.uid;
}

export async function cerrarSesion() {
  await signOut(auth);
}

export async function obtenerPerfil(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function actualizarPerfil(uid, datos) {
  await updateDoc(doc(db, "users", uid), datos);
}

export async function enviarRecuperacionContrasena(email) {
  const url = new URL("./login.html", window.location.href).toString();
  await sendPasswordResetEmail(auth, email, { url });
}

export function exigirSesion(onUsuaria) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("./bienvenida.html");
      return;
    }
    const perfil = await obtenerPerfil(user.uid);
    if (perfil && perfil.deshabilitada) {
      await signOut(auth);
      window.location.replace("./login.html");
      return;
    }
    onUsuaria(user);
  });
}

export function redirigirSegunConsentimiento(perfil) {
  if (perfil.estadoConsentimiento === "pendiente") {
    window.location.replace("./esperando-consentimiento.html");
  } else {
    window.location.replace("./home.html");
  }
}
