import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
  getCountFromServer,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { crearNotificacion } from "./notificaciones-helpers.js";

export async function listarUsuarias() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data());
}

export async function cambiarDisponibilidadCuenta(uid, deshabilitada) {
  await updateDoc(doc(db, "users", uid), { deshabilitada });
}

export async function aprobarFotoAdmin(uid) {
  await updateDoc(doc(db, "users", uid), { estadoFoto: "aprobada" });
  await crearNotificacion(uid, "foto_aprobada", "¡Tu foto fue aprobada! Ya tenés tu figurita activa.");
}

export async function rechazarFotoAdmin(uid) {
  await updateDoc(doc(db, "users", uid), {
    estadoFoto: "sin_foto",
    fotoUrl: "",
    votosFotoAprobar: 0,
    votosFotoRechazar: 0,
  });
  await crearNotificacion(uid, "foto_rechazada", "Tu foto fue rechazada. Podés subir una nueva desde tu perfil.");
}

export async function obtenerFotosEnRevision() {
  const q = query(collection(db, "users"), where("estadoFoto", "==", "en_revision"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function contarPorEstadoFoto(estado) {
  const q = query(collection(db, "users"), where("estadoFoto", "==", estado));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function crearClub(id, nombre) {
  await setDoc(doc(db, "clubs", id), { id, nombre, escudoUrl: "", categoria: "" });
}

export async function actualizarClub(id, datos) {
  await updateDoc(doc(db, "clubs", id), datos);
}

export async function borrarClub(id) {
  await deleteDoc(doc(db, "clubs", id));
}
