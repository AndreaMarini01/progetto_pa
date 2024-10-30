'use strict';

/**
 * Genera una data casuale tra l'epoca Unix e il momento attuale.
 *
 * @returns {Date} Un oggetto `Date` casuale.
 */

function getRandomDate() {
  const now = new Date();
  const randomTime = Math.random() * now.getTime(); // Genera un timestamp casuale tra l'epoca Unix e adesso
  return new Date(randomTime);
}

/**
 * Genera una configurazione casuale della tavola di gioco per Draughts.
 *
 * La configurazione include pezzi per due giocatori, con 12 pezzi iniziali
 * per ciascun giocatore posizionati su un tavolo di 32 caselle.
 *
 * @returns {{board: any[]}} La configurazione iniziale della tavola di gioco in formato JSON.
 */

function generateBoardConfig() {
  // Configurazione della board 8x8, utilizzando un array di array
  const board = [
    [null, "B", null, "B", null, "B", null, "B"],
    ["B", null, "B", null, "B", null, "B", null],
    [null, "B", null, "B", null, "B", null, "B"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["W", null, "W", null, "W", null, "W", null],
    [null, "W", null, "W", null, "W", null, "W", null],
    ["W", null, "W", null, "W", null, "W", null]
  ];

  return { board }; // Restituisce un oggetto JSON nativo
}


/**
 * Seeder per l'inserimento di dati iniziali nella tabella 'Game'.
 *
 * Questo seeder inserisce una serie di partite nella tabella 'Game', con diverse configurazioni
 * di stato, tipo di gioco e difficoltà dell'IA. Utilizza funzioni per generare date casuali e
 * configurazioni iniziali della tavola di gioco.
 *
 * @param {import('sequelize').QueryInterface} queryInterface - L'interfaccia per eseguire comandi di modifica del database.
 * @param {import('sequelize')} Sequelize - L'oggetto Sequelize che fornisce i tipi di dati.
 */

module.exports = {

  /**
   * Inserisce dati iniziali nella tabella 'Game', creando diverse partite con configurazioni
   * casuali per stato, tipo e difficoltà dell'IA.
   *
   * - `player_id`: ID del giocatore principale coinvolto nella partita.
   * - `opponent_id`: ID dell'avversario, se presente (null per PvE).
   * - `status`: Stato della partita (In corso, Completata, Scaduta).
   * - `created_at`: Data e ora di creazione della partita.
   * - `ended_at`: Data e ora di conclusione della partita, se applicabile.
   * - `type`: Tipo di partita (PvP o PvE).
   * - `ai_difficulty`: Difficoltà dell'IA (Assente, Facile, Difficile).
   * - `updatedAt`: Data e ora dell'ultimo aggiornamento della partita.
   * - `date`: Data casuale associata alla partita.
   * - `board`: Configurazione iniziale della tavola di gioco in formato JSON.
   * - `total_moves`: Numero totale di mosse effettuate nella partita.
   *
   * @param {import('sequelize').QueryInterface} queryInterface - L'interfaccia per eseguire comandi di modifica del database.
   * @param {import('sequelize')} Sequelize - L'oggetto Sequelize che fornisce i tipi di dati.
   * @returns {Promise<void>} Una promessa che rappresenta il completamento dell'operazione di inserimento.
   */

  async up(queryInterface, Sequelize) {
    const boardConfig = generateBoardConfig(); // Questo restituisce { board: [...] }
    const serializedBoard = JSON.stringify(boardConfig.board); // Serializza la board

    const games = [
      {
        player_id: 1,
        opponent_id: 2,
        status: 'Ongoing',
        created_at: getRandomDate(),
        ended_at: null,
        type: 'PvP',
        ai_difficulty: 'Absent',
        //updatedAt: new Date(),
        winner_id: null,
        //date: getRandomDate(),
        board: Sequelize.literal(`'${serializedBoard}'::json`),
        total_moves:0
      },
      {
        status: 'Ongoing',
        player_id: 1,
        opponent_id: null,
        created_at: getRandomDate(),
        ended_at: new Date(),
        type: 'PvE',
        ai_difficulty: 'Hard',
        //updatedAt: new Date(),
        winner_id: null,
        //date: getRandomDate(),
        board: Sequelize.literal(`'${serializedBoard}'::json`),
        total_moves:0
      },
      {
        player_id: 2,
        opponent_id: null,
        status: 'Timed Out',
        created_at: getRandomDate(),
        ended_at: new Date(),
        type: 'PvE',
        ai_difficulty: 'Hard',
        winner_id: 2,
        //updatedAt: new Date(),
        //date: getRandomDate(),
        board: Sequelize.literal(`'${serializedBoard}'::json`),
        total_moves:0
      }
    ];
    await queryInterface.bulkInsert('Game', games, {});
  },

  /**
   * Rimuove tutti i dati dalla tabella 'Game'.
   *
   * @param {import('sequelize').QueryInterface} queryInterface - L'interfaccia per eseguire comandi di modifica del database.
   * @param {import('sequelize')} Sequelize - L'oggetto Sequelize che fornisce i tipi di dati.
   * @returns {Promise<void>} Una promessa che rappresenta il completamento dell'operazione di eliminazione.
   */

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Game', null, {});
  }
};
