import Game, {AIDifficulty, GameStatus, GameType} from '../models/Game';
import Player from '../models/Player';
import Move from "../models/Move";
import {DraughtsMove1D, DraughtsSquare1D, DraughtsStatus} from 'rapid-draughts';
import {EnglishDraughts as Draughts, EnglishDraughtsComputerFactory as ComputerFactory} from 'rapid-draughts/english';
import MoveFactory, {moveErrorType} from "../factories/moveFactory";
import AuthFactory, {authErrorType} from "../factories/authFactory";
import GameFactory, {gameErrorType} from "../factories/gameFactory";
import PDFDocument from 'pdfkit';
import {format as dateFormat} from 'date-fns';


const TIMEOUT_MINUTES = 1;
const MOVE_COST = 0.02;


/**
 * Servizio per la gestione delle mosse in una partita.
 *
 * La classe `MoveService` fornisce metodi per l'esecuzione delle mosse,
 * la gestione del gioco dell'IA e la verifica dello stato della partita.
 * Gestisce le regole delle mosse, il salvataggio delle mosse nel database e
 * la verifica delle condizioni di vittoria o pareggio.
 */

class moveService {

    /**
     * Sceglie una mossa per l'IA in base alla difficoltà specificata.
     *
     * Se la difficoltà è EASY, viene utilizzato un algoritmo casuale.
     * Se la difficoltà è HARD, viene utilizzato l'algoritmo AlphaBeta con profondità massima pari a 5.
     *
     * @param draughts - L'istanza di `Draughts` per gestire la logica del gioco.
     * @param difficulty - Il livello di difficoltà dell'IA.
     * @returns {Promise<DraughtsMove1D | null>} La mossa scelta dall'IA o `null` se non ci sono mosse disponibili.
     */

    private static async chooseAIMove(draughts: any, difficulty: AIDifficulty): Promise<DraughtsMove1D | null> {
        const validMoves = draughts.moves;
        if (validMoves.length === 0) return null;

        switch (difficulty) {
            case AIDifficulty.EASY:
                // Se la difficoltà è EASY, usa il computer casuale
                const randomComputer = ComputerFactory.random();
                return await randomComputer(draughts);
            case AIDifficulty.HARD:
                // Se la difficoltà è HARD, usa il computer AlphaBeta con maxDepth pari a 5
                const alphaBetaComputer = ComputerFactory.alphaBeta({maxDepth: 5});
                return await alphaBetaComputer(draughts);
            default:
                // Difficoltà ASSENTE, l'IA non deve fare mosse
                return null;
        }
    }

    /**
     * Converte una posizione della scacchiera espressa come stringa (ad esempio, "A7")
     * in un numero intero corrispondente alla posizione unidimensionale.
     *
     * @param position - La posizione della scacchiera in formato stringa.
     * @returns {number} La posizione convertita in formato numerico.
     */

    public static convertPosition(position: string): number {
        const file = position.charCodeAt(0) - 'A'.charCodeAt(0);
        const rank = 8 - parseInt(position[1]);
        return rank * 8 + file;
    }

    /**
     * Converte una posizione unidimensionale in una rappresentazione della scacchiera (ad esempio, "A7").
     *
     * @param index - La posizione numerica unidimensionale.
     * @returns {string} La posizione convertita in formato stringa.
     */

    public static convertPositionBack(index: number): string {
        const file = String.fromCharCode('A'.charCodeAt(0) + (index % 8));
        const rank = 8 - Math.floor(index / 8);
        return `${file}${rank}`;
    }

    /**
     * Esegue una mossa per il giocatore in una partita.
     *
     * Questo metodo gestisce la logica per eseguire una mossa, verificare la sua validità,
     * aggiornare lo stato della partita e, se necessario, eseguire la mossa dell'IA per le partite PvE.
     *
     * @param {number} gameId - L'ID della partita.
     * @param {string} from - La posizione iniziale della mossa.
     * @param {string} to - La posizione finale della mossa.
     * @param {number} playerId - L'ID del giocatore che esegue la mossa.
     * @returns {Promise<object>} Un oggetto che rappresenta il risultato della mossa.
     *
     * @throws {MoveError} - Lancia un errore se la partita o il giocatore non sono trovati,
     * se la mossa non è valida o se ci sono errori nel parsing della scacchiera.
     */

    public static async executeMove(gameId: number, from: string, to: string, playerId: number) {
        console.log('Eseguendo la mossa:', {gameId, from, to, playerId});

        const player = await Player.findByPk(playerId);
        if (!player) {
            console.log('Giocatore non trovato:', playerId);
            throw new Error("Player not found.");
        }

        const game = await Game.findByPk(gameId);
        if (!game) {
            throw MoveFactory.createError(moveErrorType.GAME_NOT_FOUND);
        }

        // Lancia un errore nel caso in cui la partita non sia in corso
        if (game.status !== GameStatus.ONGOING) {
            throw GameFactory.createError(gameErrorType.GAME_NOT_IN_PROGRESS);
        }

        // Se il giocatore che esegue la mossa non è uno dei due giocatori coinvolti, restituisce un errore
        if (game.player_id !== playerId && game.opponent_id !== playerId) {
            throw AuthFactory.createError(authErrorType.UNAUTHORIZED);
        }

        player.tokens -= MOVE_COST;
        await player.save();

        // Carica la board salvata nel database
        let savedData: { board: DraughtsSquare1D[] } | null = null;

        // Converte la board in JSON
        try {
            console.log('Parsing board:', game.board);
            savedData = typeof game.board === 'string' ? JSON.parse(game.board) : game.board;
        } catch (error) {
            throw MoveFactory.createError(moveErrorType.FAILED_PARSING);
        }

        // Verifica che la board esista e che sia di tipo JSON
        const savedBoard = savedData?.board;
        if (!savedBoard || !Array.isArray(savedBoard)) {
            throw MoveFactory.createError(moveErrorType.NOT_VALID_ARRAY);
        }

        const flattenedBoard = savedBoard.flat();

        // Inizializza il gioco utilizzando la board salvata in precedenza
        const draughts = Draughts.setup();
        flattenedBoard.forEach((square, index) => {
            draughts.board[index] = square;
        });

        console.log("Mosse possibili dalla configurazione data:");
        draughts.moves.forEach(move => {
            const moveFrom = moveService.convertPositionBack(move.origin);
            const moveTo = moveService.convertPositionBack(move.destination);
            console.log(`Mossa: da ${moveFrom} a ${moveTo}`);
        });

        const origin = moveService.convertPosition(from);
        const destination = moveService.convertPosition(to);

        // Verifica che una mossa sia valida
        const validMoves = draughts.moves;
        const moveToMake = validMoves.find(move => move.origin === origin && move.destination === destination);
        if (!moveToMake) {
            throw MoveFactory.createError(moveErrorType.NOT_VALID_MOVE);
        }

        // Controlla se la mossa corrente è uguale all'ultima mossa effettuata
        const lastMove = await Move.findOne({
            where: {
                game_id: gameId,
                user_id: playerId
            },
            order: [['createdAt', 'DESC']]
        });

        if (lastMove) {
            const lastMoveTime = new Date(lastMove.createdAt);
            const currentTime = new Date();
            const timeDifference = (currentTime.getTime() - lastMoveTime.getTime()) / (1000 * 60); // Differenza in minuti

            if (timeDifference > TIMEOUT_MINUTES) {
                // Imposta lo stato della partita come persa per "timeout"
                game.status = GameStatus.TIMED_OUT;
                game.ended_at = currentTime;

                if (game.opponent_id === null) {
                    // La partita è contro l'IA, quindi l'IA vince
                    game.winner_id = -1; // Usa `null` per indicare la vittoria dell'IA
                } else {
                    // La partita è PvP, quindi l'altro giocatore vince
                    game.winner_id = (game.player_id === playerId) ? game.opponent_id ?? null : game.player_id ?? null;
                }

                await game.save();

                // Decrementa il punteggio del giocatore di 0.5 punti
                const player = await Player.findByPk(playerId);
                if (player) {
                    player.score -= 0.5;
                    await player.save();
                }

                return {
                    message: `The game has ended due to a timeout after ${TIMEOUT_MINUTES} minutes.`,
                    game_id: gameId,
                    status: game.status,
                };
            }
        }

        if (lastMove && lastMove.from_position === from && lastMove.to_position === to) {
            throw MoveFactory.createError(moveErrorType.NOT_VALID_MOVE);
        }

        // Esegui la mossa del giocatore
        draughts.move(moveToMake);

        console.log("Board prima di salvare:", game.board);
        // Aggiorna la board e salva la mossa del giocatore
        game.board = { board: draughts.board };
        game.total_moves = (game.total_moves || 0) + 1;
        await game.save();

        const moveNumber = game.total_moves;

        // Salva la mossa nel database
        await Move.create({
            move_number: moveNumber,
            board: {board: draughts.board},
            from_position: from,
            to_position: to,
            piece_type: savedBoard[origin]?.piece?.king ? 'king' : 'single',
            game_id: gameId,
            user_id: playerId,
            //details: {},
        });

        // Verifica se la mossa del giocatore ha concluso il gioco
        if ([DraughtsStatus.LIGHT_WON, DraughtsStatus.DARK_WON, DraughtsStatus.DRAW].includes(draughts.status as DraughtsStatus)) {
            const gameOverResult = await moveService.handleGameOver(draughts, game);
            return {
                message: gameOverResult.message,
                game_id: gameId,
                board: gameOverResult.board,
                moveDescription: `The game has ended: ${gameOverResult.message}`,
            };
        }

        // Se la partita è PvE, esegui anche la mossa dell'IA
        if (game.type === GameType.PVE) {

            // Recupera l'ultima mossa dell'IA
            const lastAIMove = await Move.findOne({
                where: {
                    game_id: gameId,
                    user_id: null, // Controllo solo per l'IA
                },
                order: [['createdAt', 'DESC']],
            });

            let aiMove = await moveService.chooseAIMove(draughts, game.ai_difficulty);

            if (lastAIMove && aiMove &&
                lastAIMove.from_position && lastAIMove.to_position &&
                aiMove.origin === moveService.convertPosition(lastAIMove.from_position) &&
                aiMove.destination === moveService.convertPosition(lastAIMove.to_position)) {

                // Filtra l'ultima mossa dell'IA dalle mosse valide
                const validMoves = draughts.moves.filter(move =>
                    aiMove && (move.origin !== aiMove.origin || move.destination !== aiMove.destination)
                );

                // Scegli una mossa diversa
                aiMove = validMoves.length ? validMoves[0] : null;
            }

            if (aiMove) {
                draughts.move(aiMove);
                game.board = { board: draughts.board };
                game.total_moves += 1;
                await game.save();

                // Riduce i token del giocatore anche per la mossa dell'IA
                player.tokens -= MOVE_COST;
                await player.save();

                // Salva la mossa dell'IA nel database
                const fromPositionAI = moveService.convertPositionBack(aiMove.origin);
                const toPositionAI = moveService.convertPositionBack(aiMove.destination);

                await Move.create({
                    move_number: moveNumber + 1,
                    board: {board: draughts.board},
                    from_position: fromPositionAI,
                    to_position: toPositionAI,
                    piece_type: savedBoard[aiMove.origin]?.piece?.king ? 'king' : 'single',
                    game_id: gameId,
                    user_id: null, // Indica che la mossa è dell'IA
                    //details: {},
                });

                // Verifica se la mossa dell'IA ha concluso il gioco
                if ([DraughtsStatus.LIGHT_WON, DraughtsStatus.DARK_WON, DraughtsStatus.DRAW].includes(draughts.status as DraughtsStatus)) {
                    const gameOverResult = await moveService.handleGameOver(draughts, game);
                    return {
                        message: gameOverResult.message,
                        game_id: gameId,
                        board: gameOverResult.board,
                        moveDescription: `The game has ended: ${gameOverResult.message}`,
                    };
                }

                // Restituisci la risposta per PvE con entrambe le mosse
                return {
                    message: "Move successfully executed",
                    game_id: gameId,
                    moveDescription: `You moved a ${savedBoard[origin]?.piece?.king ? 'king' : 'single'} from ${from} to ${to}. ` +
                        `AI moved a ${savedBoard[aiMove.origin]?.piece?.king ? 'king' : 'single'} from ${fromPositionAI} to ${toPositionAI}.`,
                    // board: draughts.board
                };
            }
        }

        // Restituisci la risposta per PvP con la mossa del giocatore
        return {
            message: "Move successfully executed",
            game_id: gameId,
            moveDescription: `You moved a ${savedBoard[origin]?.piece?.king ? 'king' : 'single'} from ${from} to ${to}.`,
            // board: draughts.board
        };
    }

    /**
     * Gestisce la fine del gioco.
     *
     * Verifica lo stato del gioco per determinare il vincitore o se il gioco è finito in pareggio.
     *
     * @param draughts - L'istanza di `Draughts` che contiene lo stato della partita.
     * @param game - L'istanza del modello `Game` che rappresenta la partita nel database.
     * @returns {object} Un oggetto che descrive il risultato della partita e lo stato finale della scacchiera.
     */

    private static async handleGameOver(draughts: any, game: any) {
        let result;
        let winnerId: number | null = null;
        if (draughts.status === DraughtsStatus.LIGHT_WON) {
            winnerId = game.player_id;
            result = 'You have won!';
        } else if (draughts.status === DraughtsStatus.DARK_WON) {
            if (game.type === GameType.PVE) {
                // Se è una partita PvE, l'IA ha vinto
                winnerId = -1; // Usa `null` per rappresentare la vittoria dell'IA
                result = 'The AI has won!';
            } else {
                // Se è una partita PvP, l'avversario ha vinto
                winnerId = game.opponent_id;
                result = 'Your opponent has won!';
            }
        } else {
            result = 'The game ended in a draw!';
        }

        // Aggiorna lo stato del gioco
        game.status = GameStatus.COMPLETED;
        game.ended_at = new Date();
        game.winner_id = winnerId; // Imposta il vincitore
        await game.save();

        //Assegna un punto al vincitore, se esiste
        if (winnerId !== null) {
            const winner = await Player.findByPk(winnerId);
            if (winner) {
                winner.score += 1;
                await winner.save();
            }
        }

        return {
            message: result,
            board: draughts.board,
        };
    }


    public static async exportMoveHistory(gameId: number, format: string): Promise<Buffer | object> {
        // Recupera tutte le mosse di una partita specifica, senza join
        const moves = await Move.findAll({
            where: {game_id: gameId},
            order: [['createdAt', 'ASC']],
        });

        if (!moves.length) {
            throw MoveFactory.createError(moveErrorType.NO_MOVES)
        }

        // Estrai i `user_id` unici, escludendo `null`
        const userIds = [...new Set(moves.map(move => move.user_id).filter(id => id !== null))];

        // Filtra undefined da userIds, mantenendo solo i valori definiti (numeri)
        const validUserIds = userIds.filter((id): id is number => id !== undefined);

        // Recupera gli username per i `user_id` validi
        const players = await Player.findAll({
            where: {player_id: validUserIds},
            attributes: ['player_id', 'username'],
        });

        // Crea una mappa `user_id -> username` per accesso rapido
        const userMap = players.reduce((map, player) => {
            map[player.player_id] = player.username;
            return map;
        }, {} as Record<number, string>);

        // Mappa le mosse con l'username del giocatore, o "IA" se `user_id` è null
        const movesWithUsernames = moves.map(move => ({
            moveNumber: move.move_number,
            fromPosition: move.from_position,
            toPosition: move.to_position,
            pieceType: move.piece_type,
            timestamp: dateFormat(new Date(move.createdAt), 'dd/MM/yyyy HH:mm:ss'),
            username: move.user_id === null ? 'Artificial Intelligence' : userMap[move.user_id!] || 'Unknown Player',
        }));

        // Ritorna in formato JSON o PDF
        if (format === 'json') {
            return movesWithUsernames;
        } else if (format === 'pdf') {
            // Creazione del PDF
            const doc = new PDFDocument();
            let buffer: Buffer;
            const buffers: Uint8Array[] = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => {
                buffer = Buffer.concat(buffers);
            });

            doc.addPage();
            doc.fontSize(20).fillColor('#4B0082').text(`Move History for Game ID: ${gameId}`, { align: 'center' });
            doc.moveDown();

            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#4B0082');
            doc.moveDown(1.5);

            movesWithUsernames.forEach((move, index) => {
                // Titolo della mossa con numero progressivo
                doc.fontSize(16).fillColor('#333').text(`Move #${move.moveNumber}`, { underline: true });

                // Dettagli della mossa
                doc.fontSize(12).fillColor('#000').text(`Player: ${move.username}`);
                doc.fontSize(12).fillColor('#000').text(`From: ${move.fromPosition}`);
                doc.fontSize(12).fillColor('#000').text(`To: ${move.toPosition}`);
                doc.fontSize(12).fillColor('#000').text(`Piece: ${move.pieceType}`);
                doc.fontSize(12).fillColor('#000').text(`At time: ${move.timestamp}`);
                doc.moveDown(1);

                // Linea separatrice per ogni mossa
                if (index < movesWithUsernames.length - 1) { // Evita di disegnare la linea per l'ultima mossa
                    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#CCCCCC');
                    doc.moveDown(1);
                }
            });

            // Fine della sezione
            doc.moveDown();
            doc.fontSize(14).fillColor('#4B0082').text('End of Move History', { align: 'center' });

            doc.end();

            return new Promise<Buffer>((resolve) => {
                doc.on('end', () => resolve(buffer!));
            });
        } else {
            throw new Error('Unsupported format. Please choose "json" or "pdf".');
        }


    }
}

export default moveService;
