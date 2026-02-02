import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import tripRoutes from './routes/tripRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);

app.get('/', (req, res) => {
    res.send('SmartLine Backend is Running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
