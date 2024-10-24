'use strict';

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config(); // Carica le variabili d'ambiente dal file .env

class Database {
    constructor() {
        if (!Database.instance) {
            this._sequelize = new Sequelize(
                process.env.DB_NAME,
                process.env.DB_USER,
                process.env.DB_PASSWORD,
                {
                    host: process.env.DB_HOST,
                    dialect: process.env.DB_DIALECT,
                    port: process.env.DB_PORT,
                    logging: false, // Imposta su true per visualizzare i log delle query
                }
            );
            Database.instance = this; // Salva l'istanza
        }
        return Database.instance;
    }

    // Metodo statico per ottenere l'istanza
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
            // Congela l'istanza di Database per evitare modifiche esterne
            Object.freeze(Database);
        }
        return Database.instance;
    }

    getSequelize() {
        return this._sequelize;
    }
}

// Esporta globalmente l'istanza come default
//export default Database.getInstance();
module.exports = Database.getInstance(); // Esporta l'istanza come default
