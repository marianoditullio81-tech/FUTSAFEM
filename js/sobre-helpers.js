import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CICLO = {
  1: "comun",
  2: "comun",
  3: "comun",
  4: "comun",
  5: "silver",
  6: "comun",
  7: "gold",
};

const TABLAS_DEFAULT = {
  comun: { comun: 0.85, silver: 0.13, gold: 0.02 },
  silver: { comun: 0.70, silver: 0.25, gold: 0.05 },
  gold: { comun: 0.60, silver: 0.30, gold: 0.10 },
};

async function obtenerTablas() {
  const snap = await getDoc(doc(db, "config", "sobres"));
  return snap.exists() ? snap.data() : TABLAS_DEFAULT;
}

const FIGUS_POR_SOBRE = { comun: 3, silver: 4, gold: 5 };
const GARANTIA_POR_SOBRE = { comun: null, silver: "silver", gold: "gold" };

function hoyComoTexto() {
  return new Date().toISOString().slice(0, 10);
}

function diaDeAyer() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return ayer.toISOString().slice(0, 10);
}

export function calcularDiaDeRacha(perfil) {
  if (perfil.ultimaAperturaFecha === diaDeAyer()) {
    const diaAnterior = ((perfil.rachaActual - 1) % 7) + 1;
    return diaAnterior >= 7 ? 1 : diaAnterior + 1;
  }
  return 1;
}

export function determinarTipoSobre(diaDeRacha) {
  return CICLO[diaDeRacha] || "comun";
}

function sortearRareza(tabla) {
  const r = Math.random();
  let acumulado = 0;
  for (const [rareza, prob] of Object.entries(tabla)) {
    acumulado += prob;
    if (r <= acumulado) return rareza;
  }
  return "comun";
}

async function obtenerStickersPorRareza() {
  const snap = await getDocs(collection(db, "stickers"));
  const porRareza = { comun: [], silver: [], gold: [] };
  snap.forEach((d) => {
    const sticker = { id: d.id, ...d.data() };
    if (porRareza[sticker.rareza]) porRareza[sticker.rareza].push(sticker);
  });
  return porRareza;
}

function elegirAlAzar(lista) {
  if (lista.length === 0) return null;
  return lista[Math.floor(Math.random() * lista.length)];
}

export async function abrirSobre(uid, perfil) {
  const diaDeRacha = calcularDiaDeRacha(perfil);
  const tipoSobre = determinarTipoSobre(diaDeRacha);
  const cantidadFigus = FIGUS_POR_SOBRE[tipoSobre];
  const tablas = await obtenerTablas();
  const tabla = tablas[tipoSobre] || TABLAS_DEFAULT[tipoSobre];
  const garantia = GARANTIA_POR_SOBRE[tipoSobre];

  const porRareza = await obtenerStickersPorRareza();

  const stickersObtenidos = [];
  for (let i = 0; i < cantidadFigus; i++) {
    const rareza = i === 0 && garantia ? garantia : sortearRareza(tabla);
    const sticker = elegirAlAzar(porRareza[rareza]) || elegirAlAzar(porRareza.comun);
    if (sticker) stickersObtenidos.push(sticker);
  }

  for (const sticker of stickersObtenidos) {
    const idColeccion = `${uid}_${sticker.id}`;
    const ref = doc(db, "userCollection", idColeccion);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { cantidad: increment(1) });
    } else {
      await setDoc(ref, {
        userId: uid,
        stickerId: sticker.id,
        cantidad: 1,
        bloqueada: false,
      });
    }
  }

  await addDoc(collection(db, "packsLog"), {
    userId: uid,
    tipoSobre,
    diaDeRacha,
    stickerIds: stickersObtenidos.map((s) => s.id),
    fecha: new Date().toISOString(),
  });

  const otorgaCreditos = tipoSobre === "gold" ? 50 : 0;
  await updateDoc(doc(db, "users", uid), {
    rachaActual: diaDeRacha,
    ultimaAperturaFecha: hoyComoTexto(),
    ...(otorgaCreditos ? { futsacoins: increment(otorgaCreditos) } : {}),
  });

  return { tipoSobre, stickersObtenidos, creditosGanados: otorgaCreditos };
}

export async function obtenerJugadorasDeStickers(stickers) {
  const playerIds = [...new Set(stickers.map((s) => s.playerId).filter(Boolean))];
  const jugadoras = new Map();
  await Promise.all(
    playerIds.map(async (id) => {
      const snap = await getDoc(doc(db, "players", id));
      if (snap.exists()) jugadoras.set(id, snap.data());
    })
  );
  return jugadoras;
}
