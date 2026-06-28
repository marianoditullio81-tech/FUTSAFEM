import { db } from "./firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function obtenerSponsorsActivos() {
  const snap = await getDocs(
    query(collection(db, "sponsors"), where("activo", "==", true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerSponsorAlAzar() {
  const sponsors = await obtenerSponsorsActivos();
  if (sponsors.length === 0) return null;
  return sponsors[Math.floor(Math.random() * sponsors.length)];
}
