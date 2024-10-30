import { Request, Response, NextFunction } from 'express';
import gameService from '../services/gameService';
import Game, {GameType, AIDifficulty, GameStatus} from '../models/Game';
import GameFactory, { gameErrorType } from '../factories/gameFactory';
import Player from "../models/Player";
import gameFactory from "../factories/gameFactory";

/**
 * Classe `GameController` per gestire le operazioni legate alle partite.
 *
 * Contiene metodi per la creazione di nuove partite e l'abbandono di partite esistenti.
 */
class gameController {
    /**
     * Gestisce la creazione di una nuova partita, sia PvP (Player vs. Player) che PvE (Player vs. Environment).
     *
     * @param req - L'oggetto della richiesta Express contenente i dati del corpo, inclusi `opponent_email` e `ai_difficulty`.
     * @param res - L'oggetto della risposta Express utilizzato per inviare la risposta al client, contenente i dettagli della nuova partita.
     * @param next - La funzione di callback `NextFunction` per passare il controllo al middleware successivo in caso di errore.
     *
     * @throws {GameFactory.createError} - Lancia errori in caso di parametri mancanti, giocatore già in gioco,
     *                                     difficoltà dell'IA non valida, o altri parametri non coerenti.
     *
     * @returns Una risposta JSON con i dettagli della partita appena creata se l'operazione è completata con successo.
     */
    public async createGame(req: Request, res: Response, next: NextFunction): Promise<void> {
        const {opponent_email, ai_difficulty} = req.body;
        const playerId = req.user?.player_id;
        try {
            if (!playerId) {
                throw GameFactory.createError(gameErrorType.MISSING_PLAYER_ID);
            }
            let opponentId: number | null = null;
            if (opponent_email) {
                const opponent = await Player.findOne({where: {email: opponent_email}});
                if (!opponent) {
                    throw GameFactory.createError(gameErrorType.OPPONENT_NOT_FOUND);
                }
                opponentId = opponent.player_id;
            }
            const existingGame = await gameService.findActiveGameForPlayer(playerId, opponentId);
            if (existingGame && existingGame.status === GameStatus.ONGOING) {
                if (existingGame.player_id === playerId || existingGame.opponent_id === playerId) {
                    throw GameFactory.createError(gameErrorType.PLAYER_ALREADY_IN_GAME);
                }
                if (opponentId !== null && (existingGame.player_id === opponentId || existingGame.opponent_id === opponentId)) {
                    throw GameFactory.createError(gameErrorType.OPPONENT_ALREADY_IN_GAME);
                }
            }
            if (req.user?.email === opponent_email) {
                throw GameFactory.createError(gameErrorType.SELF_CHALLENGE_NOT_ALLOWED);
            }
            if (opponent_email && ai_difficulty) {
                throw GameFactory.createError(gameErrorType.INVALID_GAME_PARAMETERS);
            }
            let type: GameType;
            if (opponent_email) {
                type = GameType.PVP;
            } else if (ai_difficulty) {
                type = GameType.PVE;
                if (ai_difficulty === AIDifficulty.ABSENT) {
                    throw GameFactory.createError(gameErrorType.INVALID_DIFFICULTY);
                }
                if (!Object.values(AIDifficulty).includes(ai_difficulty)) {
                    throw GameFactory.createError(gameErrorType.INVALID_DIFFICULTY);
                }
            } else {
                throw GameFactory.createError(gameErrorType.MISSING_GAME_PARAMETERS);
            }
            const total_moves = 0;
            const initialBoard = {
                board: [
                    [null, "B", null, "B", null, "B", null, "B"],
                    ["B", null, "B", null, "B", null, "B", null],
                    [null, "B", null, "B", null, "B", null, "B"],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    ["W", null, "W", null, "W", null, "W", null],
                    [null, "W", null, "W", null, "W", null, "W"],
                    ["W", null, "W", null, "W", null, "W", null]
                ]
            };
            const newGame = await gameService.createGame(playerId, opponent_email, type, ai_difficulty, initialBoard, total_moves);
            res.status(201).json({game: newGame});
        } catch (error) {
            next(error);
        }
    }

    /**
     * Gestisce l'abbandono di una partita esistente.
     *
     * @param req - L'oggetto della richiesta Express contenente l'ID della partita da abbandonare.
     * @param res - L'oggetto della risposta Express utilizzato per confermare l'abbandono della partita.
     * @param next - La funzione di callback `NextFunction` per passare il controllo al middleware successivo in caso di errore.
     *
     * @throws {MoveError} - Lancia errori se la partita non esiste o il giocatore non è autorizzato ad abbandonarla.
     *
     * @returns Una risposta JSON che conferma l'abbandono della partita.
     */
    public async abandonGame(req: Request, res: Response, next: NextFunction): Promise<void> {
        const gameId = parseInt(req.params.gameId, 10);
        const playerId = req.user?.player_id;
        try {
            const game = await gameService.abandonGame(gameId, playerId!);
            res.status(200).json({
                message: `Game with ID ${gameId} has been abandoned.`,
                game_id: gameId,
                status: game.status,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Restituisce lo stato di una partita e la configurazione attuale della board.
     *
     * Questo metodo cerca una partita nel database utilizzando l'ID fornito. Se la partita esiste,
     * restituisce lo stato corrente della partita e la configurazione della board. Se la partita
     * non viene trovata, genera un errore di parametri non validi.
     *
     * @param req - L'oggetto della richiesta Express che contiene l'ID della partita nei parametri.
     * @param res - L'oggetto della risposta Express utilizzato per inviare la risposta al client.
     * @param next - La funzione di callback `NextFunction` per passare il controllo al middleware successivo in caso di errore.
     *
     * @throws {GameFactory.createError} - Lancia un errore se la partita con l'ID specificato non viene trovata.
     *
     * @returns {Promise<void>} Una risposta JSON con lo stato della partita e la configurazione della board.
     */

    public async evaluateGameStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        const gameId = parseInt(req.params.gameId, 10);
        try {
            const game = await Game.findByPk(gameId);

            if (!game) {
                throw GameFactory.createError(gameErrorType.GAME_NOT_FOUND);
            }

            // Restituisce lo stato della partita e la configurazione della board
            res.status(200).json({
                message: `The current status of the game is: ${game.status}`,
                game_id: gameId,
                board: game.board
            });
        } catch (error) {
            next(error);
        }
    }

    public async getCompletedGames(req: Request, res: Response, next: NextFunction): Promise<void> {
        const playerId = req.user?.player_id;
        const {startDate, endDate} = req.query;

        try {
            if (!playerId) {
                throw GameFactory.createError(gameErrorType.MISSING_PLAYER_ID);
            }

            // Chiama il metodo del servizio per ottenere le partite concluse
            const result = await gameService.getCompletedGames(playerId, startDate as string, endDate as string);

            // Rimuove dalla risposta il campo board
            result.games.forEach(game => delete game.board);

            // Invia la risposta con i dati delle partite concluse
            res.status(200).json({
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    public async getPlayerLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Recupera il parametro di ordinamento dalla query, predefinito "desc"
            const order = req.query.order === 'asc' ? 'asc' : 'desc';

            // Chiama il servizio per ottenere la classifica dei giocatori
            const leaderboard = await gameService.getPlayerLeaderboard(order);

            // Invia la risposta con la classifica dei giocatori
            res.status(200).json({
                message: 'Classifica giocatori recuperata con successo.',
                data: leaderboard
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Gestisce la generazione di un certificato di vittoria in formato PDF.
     *
     * @param req - L'oggetto della richiesta Express contenente l'ID della partita.
     * @param res - L'oggetto della risposta Express utilizzato per inviare il PDF al client.
     * @param next - La funzione di callback `NextFunction` per passare il controllo al middleware successivo in caso di errore.
     *
     * @returns Il certificato di vittoria come PDF in formato binario.
     */
    public async getVictoryCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
        const gameId = parseInt(req.params.gameId, 10);
        const playerId = req.user?.player_id;

        try {
            // Richiama il servizio per generare il certificato
            const pdfData = await gameService.generateVictoryCertificate(gameId, playerId!);

            // Configura la risposta per il download del PDF
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="certificato_vittoria_partita_${gameId}.pdf"`,
                'Content-Length': pdfData.length,
            }).end(pdfData);

        } catch (error) {
            next(error);
        }
    }


}

export default new gameController();
