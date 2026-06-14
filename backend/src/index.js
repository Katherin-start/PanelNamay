const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config();

const { initializeSocket } = require('./socket/chatSocket');

const authRoutes = require('./routes/authRoutes');
const mobileRoutes = require('./routes/mobileRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const patientRoutes = require('./routes/patientRoutes');
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const discountRoutes = require('./routes/discountRoutes');
const reportRoutes = require('./routes/reportRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const setupRoutes = require('./routes/setupRoutes');
// const alertRoutes = require('./routes/alertRoutes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Rutas
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reports', reportRoutes);
// app.use('/api/alerts', alertRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de Clínica Dental funcionando' });
});

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Inicializar Socket.io
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
