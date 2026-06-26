import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function obtenerAlbumDeUsuaria(uid) {
  const [stickersSnap, playersSnap, clubsSnap, coleccionSnap] = await Promise.all([
    getDocs(collection(db, "stickers")),
    getDocs(collection(db, "players")),
    getDocs(collection(db, "clubs")),
    getDocs(query(collection(db, "userCollection"), where("userId", "==", uid))),
  ]);

  const players = new Map();
  playersSnap.forEach((doc) => players.set(doc.id, doc.data()));

  const clubs = new Map();
  clubsSnap.forEach((doc) => clubs.set(doc.id, doc.data()));

  const cantidadPorSticker = new Map();
  coleccionSnap.forEach((doc) => {
    const data = doc.data();
    cantidadPorSticker.set(data.stickerId, data.cantidad || 0);
  });

  const clubesMap = new Map();

  stickersSnap.forEach((doc) => {
    const sticker = { id: doc.id, ...doc.data() };
    const jugadora = players.get(sticker.playerId) || null;
    const clubId = jugadora ? jugadora.clubId : "sin-club";
    const club = clubs.get(clubId) || { nombre: "Sin club asignado" };

    if (!clubesMap.has(clubId)) {
      clubesMap.set(clubId, { clubId, nombre: club.nombre, stickers: [] });
    }

    clubesMap.get(clubId).stickers.push({
      sticker,
      jugadora,
      cantidad: cantidadPorSticker.get(sticker.id) || 0,
    });
  });

  return Array.from(clubesMap.values());
}
