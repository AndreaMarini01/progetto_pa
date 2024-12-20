import { JwtPayload } from 'jsonwebtoken';

/**
 * Estende l'interfaccia `Request` di Express per includere i dati utente.
 *
 * Questa dichiarazione globale permette di aggiungere un campo opzionale `user`
 * all'interfaccia `Request` di Express. Il campo `user` rappresenta il payload del token JWT
 * e include le proprietà `id_player`, `email`, e `role`, oltre ai campi di default di `JwtPayload`.
 */

// Questa estensione dell'interfaccia Request di Express migliora la gestione del payload JWT all'interno dell'applicazione,
// permettendo di accedere facilmente ai dati dell'utente autenticato e di mantenerli tipizzati correttamente in tutto il progetto
declare global {
    namespace Express {
        interface Request {

            /**
             * Dati dell'utente autenticato, estratti dal token JWT.
             *
             * Questo campo è presente solo se l'utente è autenticato correttamente
             * e il middleware di autenticazione ha decodificato con successo il token JWT.
             */

            user?: JwtPayload & { player_id: number; email:string; role: string };
        }
    }
}