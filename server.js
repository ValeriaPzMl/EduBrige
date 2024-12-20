import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import User from './models/User.js';
import Message from './models/Message.js';
import fs from 'fs';

dotenv.config();
const materias = ["Math", "Idioms", "Science", "Grammar", "Social_sciences", "Coding", "Geometry"];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;


//CONECTAR A LA BASE DE DATOS----------------------------------------------------
const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const db = process.env.DB;

const mongoUrl = `mongodb+srv://${user}:${password}@cluster0.brhv8.mongodb.net/${db}?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 })
    .then(() => console.log("Conectado a MongoDB Atlas"))
    .catch(err => console.error("Error de conexión a MongoDB:", err));

// Configuración de sesiones 
app.use(session({
    secret: 'mi_secreto_super_seguro', // ESTO SE CAMBIA A ALGO SEGURO PERO AHORITA NOS VALE
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUrl }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // La sesión dura 1 día
}));

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// CHECAR LA SESION ------------------------------------------------------------------
function verificarAutenticacion(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/');
    }
}

// FUNCION DE REGISTRO --------------------------------------------
app.post('/register', async (req, res) => {
    const { nombre, apellidos, correo, contraseña, tipo, materia, idiomas } = req.body;

    try {
        const nuevoUsuario = new User({
            nombre,
            apellidos,
            correo,
            contraseña,
            tipo,
            materia: tipo === 'maestro' ? materia : null,
            idiomas: tipo === 'maestro' ? idiomas.split(',') : []
        });

        await nuevoUsuario.save();
        res.redirect('/');
    } catch (err) {
        console.error("Error al registrar usuario:", err);
        res.send("Error al registrar usuario.");
    }
});

// INICIAR SESION -------------------------------------------
app.post('/login', async (req, res) => {
    const { correo, contraseña } = req.body;

    try {
        const usuario = await User.findOne({ correo, contraseña });
        if (usuario) {
            req.session.userId = usuario._id;
            res.redirect('/index');
        } else {
            res.send("Correo o contraseña incorrectos.");
        }
    } catch (err) {
        console.error("Error al iniciar sesión:", err);
        res.send("Error al iniciar sesión.");
    }
});
//CERRAR SESION  ------------------------------------------------
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            res.send("Error al cerrar sesión.");
        } else {
            res.redirect('/');
        }
    });
});


// FOROS --------------------------------------------------------
//PARA MANDAR MENSAGES
app.post('/foros/:materia', verificarAutenticacion, async (req, res) => {
    const { contenido } = req.body;
    const materia = req.params.materia;
    console.log(materia);
    try {
        const usuario = await User.findById(req.session.userId);

        const nuevoMensaje = new Message({
            usuario: usuario.nombre,
            contenido,
            materia,
        });

        await nuevoMensaje.save();
        res.redirect(`/foros/${materia}`);
    } catch (err) {
        console.error("Error al enviar mensaje:", err);
        res.send("Error al enviar mensaje.");
    }
});


// INICIO
app.get('/foros', verificarAutenticacion, (req, res) => {
    var pageName = "Foros";
    res.render('foros', { materias, mensajes: null, materiaSeleccionada: null, pageName });
});

// MOSTRAT FORO ESPECIFICO
app.get('/foros/:materia', verificarAutenticacion, async (req, res) => {
    const materiaSeleccionada = req.params.materia;

    try {
        const mensajes = await Message.find({ materia: materiaSeleccionada }).sort({ fecha: 1 });
        const usuario = await User.findById(req.session.userId);
        var pageName = "Foros";
        res.render('foros', { materias, mensajes, usuario, materiaSeleccionada, pageName });
    } catch (err) {
        console.error("Error al cargar mensajes por materia:", err);
        res.send("Error al cargar mensajes.");
    }
});


// PERFIL -------------------------------------------------------------------

app.get('/perfil', verificarAutenticacion, async (req, res) => {
    try {
        const usuario = await User.findById(req.session.userId);

        if (!usuario) {
            return res.status(404).send("Usuario no encontrado.");
        }
        var pageName = "Profile";
        res.render('perfil', { usuario, pageName });


    } catch (err) {
        console.error("Error al cargar el perfil:", err);
        res.status(500).send("Error al cargar el perfil.");
    }
});

// MAESTROS -------------------------------------------------------------------------
app.get('/teachers', verificarAutenticacion, async (req, res) => {
    try {

        const maestros = await User.find({ tipo: 'maestro' });
        var pageName = "Teachers";
        res.render('teachers', { maestros, pageName });
    } catch (err) {
        console.error("Error al cargar maestros:", err);
        res.send("Error al cargar maestros.");
    }
});

// MATERIAL -------------------------------------------------------------------------
app.get('/material', verificarAutenticacion, (req, res) => {
    const categoriasPath = path.join(__dirname, 'public', 'PDFS');

    try {
        const categorias = fs.readdirSync(categoriasPath).filter(folder => fs.lstatSync(path.join(categoriasPath, folder)).isDirectory());
        var pageName = "Material";
        res.render('material', { categorias, pdfs: [], categoriaSeleccionada: null, pageName });
    } catch (err) {
        console.error("Error al cargar categorías:", err);
        res.status(500).send("Error al cargar las categorías.");
    }
});


app.get('/material/:categoria', verificarAutenticacion, (req, res) => {
    const categoriaSeleccionada = req.params.categoria;
    const pdfPath = path.join(__dirname, 'public', 'PDFS', categoriaSeleccionada);

    try {
        const categorias = fs.readdirSync(path.join(__dirname, 'public', 'PDFS')).filter(folder => fs.lstatSync(path.join(__dirname, 'public', 'PDFS', folder)).isDirectory());
        const pdfs = fs.readdirSync(pdfPath).filter(file => file.endsWith('.pdf'));
        var pageName = "Material";
        res.render('material', { categorias, pdfs, categoriaSeleccionada, pageName });
    } catch (err) {
        console.error("Error al cargar archivos PDF:", err);
        res.status(404).send("Categoría no encontrada o error al cargar los archivos.");
    }
});

// QUIZES  -------------------------------------------------------------------------
app.get('/quizes', verificarAutenticacion, (req, res) => {
    const categoriasPath = path.join(__dirname, 'public', 'QUIZZ');

    try {
        const categorias = fs.readdirSync(categoriasPath).filter(folder => fs.lstatSync(path.join(categoriasPath, folder)).isDirectory());
        var pageName = "Quizes";

        res.render('quizes', { categorias, pdfs: [], categoriaSeleccionada: null, pageName });
    } catch (err) {
        console.error("Error al cargar categorías:", err);
        res.status(500).send("Error al cargar las categorías.");
    }
});


app.get('/quizes/:categoria', verificarAutenticacion, (req, res) => {
    const categoriaSeleccionada = req.params.categoria;
    const pdfPath = path.join(__dirname, 'public', 'QUIZZ', categoriaSeleccionada);

    try {
        const categorias = fs.readdirSync(path.join(__dirname, 'public', 'QUIZZ')).filter(folder => fs.lstatSync(path.join(__dirname, 'public', 'QUIZZ', folder)).isDirectory());
        const pdfs = fs.readdirSync(pdfPath).filter(file => file.endsWith('.pdf'));
        var pageName = "Quizes";
        res.render('quizes', { categorias, pdfs, categoriaSeleccionada, pageName });
    } catch (err) {
        console.error("Error al cargar archivos PDF:", err);
        res.status(404).send("Categoría no encontrada o error al cargar los archivos.");
    }
});



// NORMALES --------------------------------------------------------------------------------
app.get('/areas', (req, res) => {
    var pageName = "Areas";
    res.render('areas', { materias, pageName });
});


app.get('/', (req, res) => {
    res.render('home');
});

app.get('/index', verificarAutenticacion, (req, res) => {
    var pageName = "EduBridge";
    res.render('index', { pageName });
});

// COSAS DEL SERVIDOR ---------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
