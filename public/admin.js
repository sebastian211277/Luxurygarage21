// 🔐 Verificar si existe token
const token = localStorage.getItem("token");
if (!token) window.location.href = 'login.html';

// Estado global
let isLoading = false;
let editingCarId = null;

// Cargar inventario al iniciar
document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
    setupFormHandlers();
});

/**
 * Obtener y mostrar inventario
 */
async function fetchInventory() {
    const tableBody = document.getElementById('carsTableBody');

    try {
        tableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding:20px;">
                Cargando inventario...
            </td>
        </tr>`;

        const response = await fetch('/api/cars'); // 👈 Ruta pública

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const cars = await response.json();
        tableBody.innerHTML = '';

        if (!cars.length) {
            tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:20px; color:#888;">
                    Inventario vacío.
                </td>
            </tr>`;
            return;
        }

        tableBody.innerHTML = cars.map(car => {
            const imagenMostrable = car.imagenes?.length
                ? car.imagenes[0]
                : '/uploads/default.jpg';

            return `
            <tr>
                <td>
                    <img src="${imagenMostrable}" width="60"
                        style="border-radius:4px;height:40px;object-fit:cover;border:1px solid #333;">
                </td>
                <td>
                    <strong style="color:#fff;">${car.nombreAnuncio}</strong><br>
                    <small style="color:#888;">${car.marca} ${car.modelo}</small>
                </td>
                <td>${car.anio}</td>
                <td style="color:#d4af37;">$${car.precio?.toLocaleString()}</td>
                <td style="text-align:right;">
                    <button onclick="editCar('${car._id}')">EDITAR</button>
                    <button onclick="deleteCar('${car._id}')">ELIMINAR</button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `
        <tr>
            <td colspan="5" style="color:#e74c3c;text-align:center;">
                Error: ${err.message}
            </td>
        </tr>`;
    }
}

/**
 * Configurar formulario
 */
function setupFormHandlers() {
    const form = document.getElementById('carForm');
    const btnCancel = document.getElementById('btnCancel');

    form.addEventListener('submit', handleFormSubmit);
    btnCancel.addEventListener('click', resetForm);
}

/**
 * Guardar o editar auto
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    if (isLoading) return;

    const form = e.target;
    const btn = document.getElementById('btnSubmit');

    try {
        isLoading = true;
        btn.disabled = true;

        const formData = new FormData(form);

        const method = editingCarId ? 'PUT' : 'POST';
        const url = editingCarId
            ? `/api/cars/${editingCarId}`
            : '/api/cars';

        const response = await fetch(url, {
            method: method,
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        alert(editingCarId ? "Auto actualizado" : "Auto guardado");

        resetForm();
        await fetchInventory();

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        isLoading = false;
        btn.disabled = false;
    }
}

/**
 * Editar auto
 */
async function editCar(id) {
    const response = await fetch(`/api/cars/${id}`);
    const car = await response.json();

    document.getElementById('name').value = car.nombreAnuncio || '';
    document.getElementById('brand').value = car.marca || '';
    document.getElementById('model').value = car.modelo || '';
    document.getElementById('year').value = car.anio || '';
    document.getElementById('price').value = car.precio || '';
    document.getElementById('type').value = car.categoria || '';
    document.getElementById('description').value = car.descripcion || '';
    document.getElementById('isFeatured').checked = car.esDestacado || false;

    editingCarId = id;
}

/**
 * Eliminar auto
 */
async function deleteCar(id) {
    if (!confirm("¿Eliminar vehículo?")) return;

    const response = await fetch(`/api/cars/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        alert("Error: " + data.message);
        return;
    }

    alert("Auto eliminado");
    fetchInventory();
}

/**
 * Reset formulario
 */
function resetForm() {
    document.getElementById('carForm').reset();
    editingCarId = null;
}