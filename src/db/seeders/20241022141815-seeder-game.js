'use strict';

function getRandomDate() {
  const now = new Date();
  const randomTime = Math.random() * now.getTime(); // Genera un timestamp casuale tra l'epoca Unix e adesso
  return new Date(randomTime);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const games = [
      {
        player_id: 1,
        opponent_id: 2,
        status: 'Ongoing',
        created_at: new Date(),
        ended_at: null,
        type: 'PvP',
        ai_difficulty: 'Absent',
        updatedAt: new Date(),
        date: getRandomDate()
      },
      {
        status: 'Completed',
        player_id: 1,
        opponent_id: null,
        created_at: new Date(Date.now() - 3600 * 1000), // 1 ora fa
        ended_at: new Date(),
        type: 'PvE',
        ai_difficulty: 'Hard',
        updatedAt: new Date(),
        date: getRandomDate()
      },
      {
        player_id: 2,
        opponent_id: null,
        status: 'Timed Out',
        created_at: new Date(Date.now() - 7200 * 1000), // 2 ore fa
        ended_at: new Date(),
        type: 'PvE',
        ai_difficulty: 'Easy',
        updatedAt: new Date(),
        date: getRandomDate()
      }
    ];

    await queryInterface.bulkInsert('Game', games, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Game', null, {});
  }
};
