require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

// IMPORTACIÓN CORREGIDA
const cloudinary = require("cloudinary").v2;
const CloudinaryStorage = require("multer-storage-cloudinary");


const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecreto123";

// Configuración de Cloudinary
cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});


// 1. CREAR CARPETA DE UPLOADS SI NO EXISTE (ya no es necesario para Cloudinary, pero se mantiene por si acaso)
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
fs.mkdirSync(uploadsDir, { recursive: true });
console.log("📁 Carpeta de uploads verificada/creada");
}

// 2. MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

// 3. CONEXIÓN A MONGODB
mongoose
.connect(process.env.MONGO_URI)
.then(() => console.log("🟢 Conexión a MongoDB exitosa"))
.catch((err) => console.error("🔴 Error de conexión:", err));

// 4. MODELO DE DATOS
const carSchema = new mongoose.Schema({
nombreAnuncio: String,
marca: String,
modelo: String,
año: Number,
precio: Number,
categoria: String,
descripcion: String,
esDestacado: Boolean,
imagenes: [String],
});

const Car = mongoose.model("Car", carSchema);

// 5. CONFIGURACIÓN DE MULTER para Cloudinary (Versión 2.2.1)
const storage = new CloudinaryStorage({
cloudinary: cloudinary,
folder: "luxury-garage-uploads",
allowedFormats: ["jpg", "png", "jpeg", "webp"],
  // Eliminamos 'params' porque en la v2.2.1 no se usa
});

const upload = multer({ storage: storage });



// ========================================
// 🔐 MIDDLEWARE PARA PROTEGER RUTAS
// ========================================
const authenticateToken = (req, res, next) => {
const authHeader = req.headers["authorization"];
const token = authHeader && authHeader.split(" ")[1];

if (!token) {
    return res.status(401).json({ message: "Token requerido" });
}

jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
    return res.status(403).json({ message: "Token inválido" });
    }

    req.user = user;
    next();
});
};

// ========================================
// 6. RUTAS DE LA API
// ========================================

// 🔐 LOGIN
app.post("/api/auth/login", async (req, res) => {
const { username, password } = req.body;
console.log(`Intentando login con: ${username}`);

if (username === "Shyrio" && password === "Password123") {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: "24h" });

    console.log("✅ Login exitoso");
    return res.json({ token });
}

console.log("❌ Credenciales incorrectas");
res.status(401).json({ message: "Usuario o contraseña incorrectos" });
});

// Obtener todos los autos (PÚBLICA)
app.get("/api/cars", async (req, res) => {
try {
    const cars = await Car.find().sort({ _id: -1 });
    res.json(cars);
} catch (error) {
    res.status(500).json({ message: error.message });
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
app.post(
"/api/cars",
authenticateToken,
upload.array("imagenes", 6),
async (req, res) => {
    try {
    const { name, brand, model, year, price, type, description, isFeatured } = req.body;

    const filePaths =
        req.files && req.files.length > 0
          ? req.files.map((f) => f.path) // Usar f.path para la URL de Cloudinary
        : ["/uploads/default.jpg"];

    const newCar = new Car({
        nombreAnuncio: name,
        marca: brand,
        modelo: model,
        anio: parseInt(year),
        precio: parseFloat(price),
        categoria: type,
        descripcion: description,
        esDestacado: isFeatured === "on" || isFeatured === true,
        imagenes: filePaths,
    });

    await newCar.save();
    res.status(201).json({ message: "Vehículo guardado con éxito" });
    } catch (error) {
    console.error("Error al guardar:", error);
    res.status(400).json({ message: "Error al procesar el vehículo" });
    }
}
);

// EDITAR auto existente (PROTEGIDA)
app.put(
"/api/cars/:id",
authenticateToken,
upload.array("imagenes", 6),
async (req, res) => {
    try {
    const { name, brand, model, year, price, type, description, isFeatured } = req.body;
    const existingCar = await Car.findById(req.params.id);

    if (!existingCar) return res.status(404).json({ message: "Auto no encontrado" });

    let imagenes = existingCar.imagenes;
    if (req.files && req.files.length > 0) {
        imagenes = req.files.map((f) => f.path); // Usar f.path para la URL de Cloudinary
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
        esDestacado: isFeatured === "on" || isFeatured === true,
        imagenes: imagenes,
        },
        { new: true }
    );

    res.json({ message: "Vehículo actualizado con éxito", car: updatedCar });
    } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(400).json({ message: "Error al actualizar el vehículo" });
    }
}
);

// ELIMINAR auto (PROTEGIDA)
app.delete("/api/cars/:id", authenticateToken, async (req, res) => {
try {
    await Car.findByIdAndDelete(req.params.id);
    res.json({ message: "Vehículo eliminado correctamente" });
} catch (error) {
    res.status(500).json({ message: "Error al eliminar" });
}
});

// ========================================
// 7. LANZAMIENTO
// ========================================
app.listen(PORT, "0.0.0.0", () => {
console.log(`🏁 Luxury Garage corriendo en http://localhost:${PORT}`);
});
