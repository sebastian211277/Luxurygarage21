require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

// IMPORTACIÓN MODERNA (v4.0.0+)
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecreto123";

// 1. VERIFICACIÓN DE VARIABLES DE ENTORNO (Log para diagnóstico)
console.log("🔍 Verificando configuración de Cloudinary...");
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("❌ ERROR: Faltan variables de entorno de Cloudinary en el servidor.");
} else {
    console.log("✅ Variables de Cloudinary detectadas.");
}

// 2. CONFIGURACIÓN DE CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 3. MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 4. CONEXIÓN A MONGODB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 Conexión a MongoDB exitosa"))
    .catch(err => console.error("🔴 Error de conexión a MongoDB:", err));

// 5. MODELO DE DATOS
const carSchema = new mongoose.Schema({
    nombreAnuncio: String,
    marca: String,
    modelo: String,
    anio: Number,
    precio: Number,
    categoria: String,
    descripcion: String,
    esDestacado: Boolean,
    imagenes: [String],
});

const Car = mongoose.model("Car", carSchema);

// 6. CONFIGURACIÓN DE STORAGE (MODERNA v4.0.0+)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "luxury-garage-uploads",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
    },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB por imagen
});

// ========================================
// 🔐 MIDDLEWARE PARA PROTEGER RUTAS
// ========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token requerido" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token inválido" });
        req.user = user;
        next();
    });
};

// ========================================
// 7. RUTAS DE LA API
// ========================================

// 🔐 LOGIN
app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (username === "Shyrio" && password === "Password123") {
        const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: "24h" });
        return res.json({ token });
    }
    res.status(401).json({ message: "Usuario o contraseña incorrectos" });
});

// Obtener todos los autos (PÚBLICA)
app.get("/api/cars", async (req, res) => {
    try {
        const cars = await Car.find().sort({ _id: -1 });
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener autos: " + error.message });
    }
});

// Obtener un auto por ID (PÚBLICA)
app.get("/api/cars/:id", async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: "Auto no encontrado" });
        res.json(car);
    } catch (error) {
        res.status(500).json({ message: "Error al buscar el vehículo" });
    }
});

// GUARDAR auto nuevo (PROTEGIDA)
app.post("/api/cars", authenticateToken, (req, res, next) => {
    // Middleware de Multer con manejo de errores específico
    upload.array("imagenes", 6)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: "Error de subida: " + err.message });
        } else if (err) {
            return res.status(500).json({ message: "Error de Cloudinary: " + err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { name, brand, model, year, price, type, description, isFeatured } = req.body;

        // En la versión moderna, la URL viene en f.path
        const filePaths = req.files && req.files.length > 0
            ? req.files.map(f => f.path)
            : ["/uploads/default.jpg"];

        const newCar = new Car({
            nombreAnuncio: name,
            marca: brand,
            modelo: model,
            anio: parseInt(year) || 0,
            precio: parseFloat(price) || 0,
            categoria: type,
            descripcion: description,
            esDestacado: isFeatured === "on" || isFeatured === true,
            imagenes: filePaths,
        });

        await newCar.save();
        res.status(201).json({ message: "¡Vehículo guardado con éxito!" });
    } catch (error) {
        console.error("❌ Error al guardar en DB:", error);
        res.status(500).json({ message: "Error al guardar en la base de datos: " + error.message });
    }
});

// EDITAR auto existente (PROTEGIDA)
app.put("/api/cars/:id", authenticateToken, upload.array("imagenes", 6), async (req, res) => {
    try {
        const { name, brand, model, year, price, type, description, isFeatured } = req.body;
        const existingCar = await Car.findById(req.params.id);

        if (!existingCar) return res.status(404).json({ message: "Auto no encontrado" });

        let imagenes = existingCar.imagenes;
        if (req.files && req.files.length > 0) {
            imagenes = req.files.map(f => f.path);
        }

        const updatedCar = await Car.findByIdAndUpdate(
            req.params.id,
            {
                nombreAnuncio: name,
                marca: brand,
                modelo: model,
                anio: parseInt(year) || 0,
                precio: parseFloat(price) || 0,
                categoria: type,
                descripcion: description,
                esDestacado: isFeatured === "on" || isFeatured === true,
                imagenes: imagenes,
            },
            { new: true }
        );

        res.json({ message: "¡Vehículo actualizado con éxito!", car: updatedCar });
    } catch (error) {
        console.error("❌ Error al actualizar:", error);
        res.status(500).json({ message: "Error al actualizar: " + error.message });
    }
});

// ELIMINAR auto (PROTEGIDA)
app.delete("/api/cars/:id", authenticateToken, async (req, res) => {
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.json({ message: "Vehículo eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar: " + error.message });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🏁 Luxury Garage corriendo en http://localhost:${PORT}`);
});
