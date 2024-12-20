'use strict';

/**
 * Migrazione per la creazione della tabella `Game`.
 *
 * @param {object} queryInterface - L'interfaccia utilizzata per eseguire le query nel database.
 * @param {object} Sequelize - L'istanza di Sequelize che fornisce i tipi di dati per i campi della tabella.
 *
 * @function up
 * Crea la tabella `Game` con i seguenti campi:
 *   - `game_id` (INTEGER) - Chiave primaria autoincrementante, non nulla.
 *   - `player_id` (INTEGER) - ID del giocatore, non nullo.
 *   - `opponent_id` (INTEGER) - ID dell'avversario, non può essere nullo.
 *   - `winner_id` (INTEGER) - ID del vincitore, può essere nullo.
 *   - `status` (ENUM) - Stato della partita: 'ongoing', 'completed', 'abandoned', 'timed out', non nullo.
 *   - `created_at` (DATE) - Data di creazione, non nulla, con valore predefinito `Sequelize.NOW`.
 *   - `ended_at` (DATE) - Data di fine partita, può essere nullo.
 *   - `type` (ENUM) - Tipo di partita: 'pvp' (Player vs Player) o 'pve' (Player vs Environment), non nullo.
 *   - `ai_difficulty` (ENUM) - Difficoltà dell'IA per partite PvE: 'absent', 'easy', 'hard'.
 *   - `board` (JSON) - Stato della board, non nullo, con valore predefinito caricato da `initialBoard.json`.
 *   - `total_moves` (INTEGER) - Numero totale di mosse, non nullo, con valore predefinito `0`.
 *
 * Il campo `board` viene inizializzato utilizzando il file `initialBoard.json` situato in `src/initialBoard.json`.
 *
 * @function down
 * Elimina la tabella `Game`.
 */

const { readFileSync } = require('fs');

module.exports = {
  // Metodo per la creazione della tabella Game
  up: async (queryInterface, Sequelize) => {
    const initialBoardPath = 'src/initialBoard.json';
    const initialBoard = JSON.parse(readFileSync(initialBoardPath, 'utf8'));
    await queryInterface.createTable('Game', {
      game_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      player_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      opponent_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      winner_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('ongoing', 'completed', 'abandoned', 'timed out'),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      ended_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('pvp', 'pve'),
        allowNull: false
      },
      ai_difficulty: {
        type: Sequelize.ENUM('absent','easy', 'hard'),
        allowNull: false
      },
      board: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: initialBoard.board
      },
      total_moves:{
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });
  },
  // Metodo per l'eliminazione della tabella Game
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Game');
  }
};

