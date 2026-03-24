/**
 * BEACH VOLLEY TOURNAMENTS - SERVERLESS API SNIPPET
 *
 * Istruzioni:
 * Questo snippet permette di leggere i dati pubblici di un torneo (classifiche,
 * gironi e risultati live) da qualsiasi altra applicazione web o app ospitata su GitHub Pages.
 *
 * Requisiti:
 * L'app esterna deve includere l'SDK Firebase e inizializzare l'app con le sue
 * credenziali (se si usa App Check per dominare l'accesso) oppure, più semplicemente,
 * utilizzando l'API Key fornita dal pannello Admin del Torneo.
 *
 * Esempio di utilizzo in un file HTML puro o app JS Vanilla:
 */

// 1. Importa le librerie di Firebase (via CDN o npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Configurazione del progetto Firebase dove è ospitata la SPA dei Tornei
// (Queste chiavi sono pubbliche per definizione in app Firebase client-side)
const firebaseConfig = {
  apiKey: "LA_TUA_FIREBASE_API_KEY",
  authDomain: "IL_TUO_PROGETTO.firebaseapp.com",
  projectId: "IL_TUO_PROGETTO"
};

// Inizializzazione
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. Funzione per connettersi ai dati live del torneo
function subscribeToTournamentLive(tournamentApiKey) {
  // Il documento all'interno di 'public_tournaments' ha come ID l'API KEY generata dal sistema
  const docRef = doc(db, 'public_tournaments', tournamentApiKey);

  // onSnapshot rimane in ascolto costante. Appena l'admin aggiorna un punteggio
  // nella SPA, questo listener scatterà e fornirà i dati freschi.
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("🔥 Nuovi Dati Live dal Torneo:", data.name);

      // ESEMPIO DI ACCESSO AI DATI:

      // Classifiche Gironi aggiornate in real-time
      data.groups.forEach(group => {
         console.log(`Classifica ${group.name}:`);
         // group.teams è l'array già ordinato con i punti calcolati
         group.teams.forEach((team, index) => {
             console.log(`${index + 1}. ${team.player1} & ${team.player2} - Punti: ${team.points}`);
         });
      });

      // Risultati Partite Live
      const liveMatches = data.matches.filter(m => !m.isFinished && (m.team1Score[0] > 0 || m.team2Score[0] > 0));
      if(liveMatches.length > 0) {
          console.log("🏐 Partite Attualmente in Corso:");
          liveMatches.forEach(match => {
              console.log(`Risultato Live: ${match.team1Score[0]} - ${match.team2Score[0]}`);
          });
      }

      // TODO: Aggiorna il DOM della tua app esterna qui con i dati ricevuti
      updateYourCustomUI(data);

    } else {
      console.error("Torneo non trovato o API Key non valida!");
    }
  });

  return unsubscribe; // Ritorna la funzione per fermare l'ascolto se necessario
}

// 4. Avvia l'ascolto passando la chiave generata nella SPA
// const stopListening = subscribeToTournamentLive("CHIAVE_GENERATA_DALL_ADMIN");
