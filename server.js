require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CREAR CARPETA DE UPLOADS SI NO EXISTE
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Carpeta de uploads verificada/creada');
}

// 2. MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// 3. CONEXIÓN A MONGODB (Versión simplificada para evitar errores de opciones)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Conexión a MongoDB exitosa'))
    .catch(err => console.error('🔴 Error de conexión:', err));

// 4. MODELO DE DATOS
const carSchema = new mongoose.Schema({
    nombreAnuncio: String,
    marca: String,
    modelo: String,
    anio: Number,
    precio: Number,
    categoria: String,
    descripcion: String,
    esDestacado: Boolean,
    imagenes: [String]
});
const Car = mongoose.model('Car', carSchema);

// 5. CONFIGURACIÓN DE MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 6. RUTAS DE LA API

// Obtener todos los autos
app.get('/api/cars', async (req, res) => {
    try {
        const cars = await Car.find().sort({ _id: -1 });
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Obtener un auto por ID
app.get('/api/cars/:id', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: "Auto no encontrado" });
        res.json(car);
    } catch (error) {
        res.status(500).json({ message: "Error al buscar el vehículo" });
    }
});

// GUARDAR auto nuevo (POST)
app.post('/api/cars', upload.array('imagenes', 6), async (req, res) => {
    try {
        const { name, brand, model, year, price, type, description, isFeatured } = req.body;
        const filePaths = req.files && req.files.length > 0 
            ? req.files.map(f => `/uploads/${f.filename}`) 
            : ['/uploads/default.jpg'];

        const newCar = new Car({
            nombreAnuncio: name,
            marca: brand,
            modelo: model,
            anio: parseInt(year),
            precio: parseFloat(price),
            categoria: type,
            descripcion: description,
            esDestacado: isFeatured === 'on' || isFeatured === true,
            imagenes: filePaths
        });

        await newCar.save();
        res.status(201).json({ message: 'Vehículo guardado con éxito' });
    } catch (error) {
        console.error("Error al guardar:", error);
        res.status(400).json({ message: 'Error al procesar el vehículo' });
    }
});

// EDITAR auto existente (PUT)
app.put('/api/cars/:id', upload.array('imagenes', 6), async (req, res) => {
    try {
        const { name, brand, model, year, price, type, description, isFeatured } = req.body;
        const existingCar = await Car.findById(req.params.id);
        
        if (!existingCar) return res.status(404).json({ message: "Auto no encontrado" });

        // Si se suben nuevas fotos, se usan; si no, se mantienen las anteriores
        let imagenes = existingCar.imagenes;
        if (req.files && req.files.length > 0) {
            imagenes = req.files.map(f => `/uploads/${f.filename}`);
        }

        const updatedCar = await Car.findByIdAndUpdate(
            req.params.id,
            {
                nombreAnuncio: name,
                marca: brand,
                modelo: model,
                anio: parseInt(year),
                precio: parseFloat(price),
                categoria: type,
                descripcion: description,
                esDestacado: isFeatured === 'on' || isFeatured === true,
                imagenes: imagenes
            },
            { new: true }
        );

        res.json({ message: 'Vehículo actualizado con éxito', car: updatedCar });
    } catch (error) {
        console.error("Error al actualizar:", error);
        res.status(400).json({ message: 'Error al actualizar el vehículo' });
    }
});

// ELIMINAR auto (DELETE)
app.delete('/api/cars/:id', async (req, res) => {
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vehículo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
});

// 7. LANZAMIENTO
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏁 Luxury Garage corriendo en http://localhost:${PORT}` );
});
