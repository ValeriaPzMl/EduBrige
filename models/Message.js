// models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  usuario: { type: String, required: true },
  contenido: { type: String, required: true },
  materia: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
});

export default mongoose.model('Message', messageSchema);
