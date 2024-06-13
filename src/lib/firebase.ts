import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import {
  type User,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { Nullable } from '@/utils/types';
import pick from 'lodash/pick';
import { produce } from 'immer';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

export class Auth {
  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }
  logout() {
    return signOut(auth);
  }
  updatePassword(newPassword: string) {
    return updatePassword(auth.currentUser!, newPassword);
  }
  onStateChanged(on: (uid: Nullable<User>) => void) {
    return onAuthStateChanged(
      auth,
      user => on(user),
      () => on(null)
    );
  }
}

export class Match {
  private fields = ['st', 'nd', 'rd'] as const;
  private collectionId = 'matches';
  private document(documentId: string) {
    return doc(db, this.collectionId, documentId);
  }
  private collection() {
    return collection(db, this.collectionId);
  }
  async get(documentId: string): Promise<Nullable<IMatch>> {
    const snapshot = await getDoc(this.document(documentId));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...pick(snapshot.data(), this.fields) };
  }
  create(payload: ICreatePayload) {
    const score = { a: 0, b: 0 };
    const st = {
      team_name: { a: payload.team_name_a, b: payload.team_name_b },
      team_score: score,
      team_players: {
        a: {
          st: { name: payload.team_players_a_st, serve: false },
          nd: { name: payload.team_players_a_nd, serve: false },
        },
        b: {
          st: { name: payload.team_players_b_st, serve: false },
          nd: { name: payload.team_players_b_nd, serve: false },
        },
      },
    };
    const nd = {
      team_name: { a: payload.team_name_b, b: payload.team_name_a },
      team_score: score,
      team_players: {
        a: {
          st: { name: payload.team_players_b_st, serve: false },
          nd: { name: payload.team_players_b_nd, serve: false },
        },
        b: {
          st: { name: payload.team_players_a_st, serve: false },
          nd: { name: payload.team_players_a_nd, serve: false },
        },
      },
    };
    return addDoc(this.collection(), { st: st, nd: nd, rd: st } satisfies IMatchOmitId);
  }
  async updateTeamName(
    documentId: string,
    set: keyof IMatchOmitId,
    team: keyof ITeamName,
    name: string
  ) {
    await updateDoc(this.document(documentId), { [`${set}.team_name.${team}`]: name });
  }
  swapPlayers(st: IPlayer, nd: IPlayer) {
    return { st: { ...nd }, nd: { ...st } };
  }
  async updateScore(
    documentId: string,
    set: keyof IMatchOmitId,
    team: keyof ITeamScore,
    value: number
  ) {
    await runTransaction(db, async transaction => {
      const ref = this.document(documentId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Document does not exist!');
      const data: IMatchOmitId = pick(snapshot.data(), this.fields);
      const payload = produce(data, draft => {
        const score = draft[set].team_score[team] + value;
        draft[set].team_score[team] = score;
        if (value > 0) {
          const isServing = [
            draft[set].team_players[team].st.serve,
            draft[set].team_players[team].nd.serve,
          ].some(serve => serve);
          if (isServing) {
            const players = this.swapPlayers(
              draft[set].team_players[team].st,
              draft[set].team_players[team].nd
            );
            draft[set].team_players[team].st = players.st;
            draft[set].team_players[team].nd = players.nd;
          } else {
            const isEvenScore = score % 2 === 0;
            draft[set].team_players.a.st.serve = false;
            draft[set].team_players.a.nd.serve = false;
            draft[set].team_players.b.st.serve = false;
            draft[set].team_players.b.nd.serve = false;
            if (team === 'a') {
              draft[set].team_players.a.st.serve = !isEvenScore;
              draft[set].team_players.a.nd.serve = isEvenScore;
            }
            if (team === 'b') {
              draft[set].team_players.b.st.serve = isEvenScore;
              draft[set].team_players.b.nd.serve = !isEvenScore;
            }
          }
        }
      });
      transaction.update(ref, payload);
    });
  }
  async updatePlayerName(
    documentId: string,
    set: keyof IMatchOmitId,
    team: keyof ITeamScore,
    st: string,
    nd: string
  ) {
    await runTransaction(db, async transaction => {
      const ref = this.document(documentId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Document does not exist!');
      const data: IMatchOmitId = pick(snapshot.data(), this.fields);
      const payload = produce(data, draft => {
        draft[set].team_players[team].st.name = st;
        draft[set].team_players[team].nd.name = nd;
      });
      transaction.update(ref, payload);
    });
  }
  async updatePlayerServe(
    documentId: string,
    set: keyof IMatchOmitId,
    team: keyof ITeamPlayer,
    pos: keyof ITeamPlayer[keyof ITeamPlayer]
  ) {
    await runTransaction(db, async transaction => {
      const ref = this.document(documentId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Document does not exist!');
      const data: IMatchOmitId = pick(snapshot.data(), this.fields);
      const payload = produce(data, draft => {
        draft[set].team_players.a.st.serve = false;
        draft[set].team_players.a.nd.serve = false;
        draft[set].team_players.b.st.serve = false;
        draft[set].team_players.b.nd.serve = false;
        draft[set].team_players[team][pos].serve = true;
      });
      transaction.update(ref, payload);
    });
  }
  async updateSwapPlayer(documentId: string, set: keyof IMatchOmitId, team: keyof ITeamPlayer) {
    await runTransaction(db, async transaction => {
      const ref = this.document(documentId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new Error('Document does not exist!');
      const data: IMatchOmitId = pick(snapshot.data(), this.fields);
      const payload = produce(data, draft => {
        const players = this.swapPlayers(
          draft[set].team_players[team].st,
          draft[set].team_players[team].nd
        );
        draft[set].team_players[team].st = {
          ...players.st,
          serve: draft[set].team_players[team].st.serve,
        };
        draft[set].team_players[team].nd = {
          ...players.nd,
          serve: draft[set].team_players[team].nd.serve,
        };
      });
      transaction.update(ref, payload);
    });
  }
  onListener(documentId: string, next: (data: IMatch) => void) {
    return onSnapshot(this.document(documentId), doc => {
      if (!doc.exists()) return;
      next({ id: doc.id, ...pick(doc.data(), this.fields) });
    });
  }
}

export interface IMatch {
  id: string;
  st: { team_name: ITeamName; team_score: ITeamScore; team_players: ITeamPlayer };
  nd: { team_name: ITeamName; team_score: ITeamScore; team_players: ITeamPlayer };
  rd: { team_name: ITeamName; team_score: ITeamScore; team_players: ITeamPlayer };
}
export type IMatchOmitId = Omit<IMatch, 'id'>;
export interface ITeamName {
  a: string;
  b: string;
}
export interface ITeamScore {
  a: number;
  b: number;
}
export interface ITeamPlayer {
  a: { st: IPlayer; nd: IPlayer };
  b: { st: IPlayer; nd: IPlayer };
}

interface IPlayer {
  name: string;
  serve: boolean;
}
export interface ICreatePayload {
  team_name_a: string;
  team_name_b: string;
  team_players_a_st: string;
  team_players_a_nd: string;
  team_players_b_st: string;
  team_players_b_nd: string;
}
