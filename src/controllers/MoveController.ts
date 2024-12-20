import {NextFunction, Request, Response} from 'express';
import moveService from '../services/MoveService';
import AuthFactory, {authErrorType} from "../factories/AuthFactory";
import MoveFactory, {moveErrorType} from "../factories/MoveFactory";
import Game from "../models/Game";
import GameFactory, {gameErrorType} from "../factories/GameFactory";

/**
 * Classe `MoveController` per gestire le operazioni legate alle mosse di gioco.
 *
 * Contiene metodi per eseguire una mossa e recuperare la cronologia delle mosse.
 */

class MoveController {

    /**
     * Esegue una mossa in una partita specifica utilizzando le coordinate di partenza e di destinazione fornite.
     *
     * @param req - L'oggetto `Request` di Express contenente:
     *   - `gameId` (number) - L'ID della partita in cui eseguire la mossa, fornito nel corpo della richiesta.
     *   - `from` (string) - La posizione di partenza della mossa, fornita nel corpo della richiesta.
     *   - `to` (string) - La posizione di destinazione della mossa, fornita nel corpo della richiesta.
     *   - `req.user.player_id` (number) - L'ID del giocatore che esegue la mossa, estratto dall'utente autenticato.
     * @param res - L'oggetto `Response` di Express utilizzato per inviare la risposta al client.
     *   - Risponde con il risultato della mossa eseguita in caso di successo.
     * @param next - La funzione `NextFunction` di Express utilizzata per gestire eventuali errori.
     *
     * @returns `Promise<void>` - Non restituisce un valore diretto, ma invia una risposta JSON contenente il risultato della mossa o passa l'errore al middleware di gestione degli errori.
     *
     * @throws {AuthError} - Genera un errore se:
     *   - `playerId` non è presente (es. l'utente non è autenticato).
     * @throws {MoveError} - Genera un errore se:
     *   - Uno o più parametri richiesti (`gameId`, `from`, `to`) sono assenti.
     */

    public static async executeMove(req: Request, res: Response, next: NextFunction) {
        // Converte `from` e `to` in maiuscolo
        if (req.body.from && typeof req.body.from === 'string') {
            req.body.from = req.body.from.toUpperCase();
        }
        if (req.body.to && typeof req.body.to === 'string') {
            req.body.to = req.body.to.toUpperCase();
        }
        //Inserisci nelle variabili i campi del corpo della richiesta
        const { gameId, from, to } = req.body;
        // Ottieni il playerId dall'utente autenticato
        const playerId = req.user?.player_id;
        try {
        if (!playerId) {
            throw AuthFactory.createError(authErrorType.NEED_AUTHORIZATION);
        }
        if (!gameId || !from || !to) {
            throw MoveFactory.createError(moveErrorType.MISSING_PARAMS);
        }
            // Passa i parametri al servizio per eseguire la mossa
            const result = await moveService.executeMove(gameId, from, to, playerId);
            res.status(200).json(result);
        } catch (err) {
            next(err)
        }
    }

    /**
     * Recupera la cronologia delle mosse di una partita specifica in formato JSON o PDF.
     *
     * @param req - L'oggetto `Request` di Express contenente:
     *   - `gameId` (string) - L'ID della partita per la quale ottenere la cronologia delle mosse, passato come parametro URL.
     *   - `format` (string | opzionale) - Il formato della cronologia delle mosse, specificato nella query (può essere "json" o "pdf"). Il formato predefinito è "json".
     * @param res - L'oggetto `Response` di Express utilizzato per inviare la risposta al client.
     *   - Risponde con la cronologia delle mosse in formato JSON o come file PDF scaricabile.
     * @param next - La funzione `NextFunction` di Express utilizzata per gestire eventuali errori.
     *
     * @returns `Promise<void>` - Non restituisce un valore diretto, ma invia una risposta JSON o PDF con la cronologia delle mosse o passa l'errore al middleware di gestione degli errori.
     *
     * @throws {GameError} - Genera un errore se:
     *   - `gameId` non è valido o non corrisponde a nessuna partita (GAME_NOT_FOUND).
     */

    public static async getMoveHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        // Converte il numero passato nella richiesta come stringa in un valore numerico
        const gameId = parseInt(req.params.gameId, 10);
        // Formato di default è JSON
        const format = req.query.format as string || 'json';
        try {
            // Controllo sull'esistenza del gioco
            const gameExists = await Game.findByPk(gameId);
            if (!gameExists) {
                throw GameFactory.createError(gameErrorType.GAME_NOT_FOUND);
            }
            // Richiama la funzione presente nel service per ottenere lo storico delle mosse
            const result = await moveService.exportMoveHistory(gameId, format);
            if (format === 'pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=game_${gameId}_moves.pdf`);
                res.send(result);
            } else {
                res.status(200).json(result);
            }
        } catch (error) {
            next(error);
        }
    }
}

export default MoveController;

