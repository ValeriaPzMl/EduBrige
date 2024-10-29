import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  tipo: { type: String, enum: ['estudiante', 'maestro'], required: true },
  materia: { type: String, required: function () { return this.tipo === 'maestro'; } },
  idiomas: { type: [String], required: function () { return this.tipo === 'maestro'; } }
});

export default mongoose.model('User', userSchema);