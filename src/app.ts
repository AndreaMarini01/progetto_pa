import express, { Request, Response, NextFunction } from 'express';
import Player from './models/Player';
import Game from './models/Game';
import Move from './models/Move';
import authRoutes from './routes/authRoute';
import gameRoute from "./routes/gameRoute";
import adminRoutes from './routes/adminRoute';
import errorHandler from './factories/errorHandler';
import moveRoute from "./routes/moveRoute";

const app = express();
const port = 3000;

// Inizializza i modelli
Player.initialize();
Game.initialize();
Move.initialize();

// Configura le associazioni
Player.associate();
Game.associate();
Move.associate();

// Rotta di esempio per la home
app.get('/', (req: Request, res: Response) => {
    res.send('Benvenuto nella tua applicazione Express TypeScript!');
});

app.use(express.json()); // Questo middleware è necessario per il parsing del corpo delle richieste JSON
// app.use('/auth', authRoutes);
app.use('/', authRoutes)
app.use('/create', gameRoute)
app.use('/', adminRoutes);
app.use('/create', moveRoute)

app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});


