// ========================================
// 🔐 PROTECCIÓN DE RUTA - Verificación de token
// ========================================
// Se verifica el token ANTES de que el DOM cargue.
// Si no existe token, se redirige inmediatamente.
const token = localStorage.getItem("token");
if (!token) {
    window.location.replace('login.html');
}

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

        const response = await fetch('/api/cars'); // Ruta pública

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
                    <button class="btn-edit" onclick="editCar('${car._id}')">EDITAR</button>
                    <button class="btn-delete" onclick="deleteCar('${car._id}')">ELIMINAR</button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error(err);

        // Si el error es 401 o 403, el token expiró → redirigir al login
        if (err.message.includes('401') || err.message.includes('403')) {
            localStorage.removeItem('token');
            window.location.replace('login.html');
            return;
        }

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
        btn.textContent = editingCarId ? 'Actualizando...' : 'Guardando...';

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

        // Si el token expiró, redirigir al login
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.replace('login.html');
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        alert(editingCarId ? "✅ Auto actualizado correctamente" : "✅ Auto guardado correctamente");

        resetForm();
        await fetchInventory();

    } catch (error) {
        alert("❌ Error: " + error.message);
    } finally {
        isLoading = false;
        btn.disabled = false;
        btn.textContent = editingCarId ? 'Actualizar Auto' : 'Guardar Auto';
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

    // Indicar visualmente que estamos editando
    document.getElementById('formPanel').classList.add('editing-mode');
    document.getElementById('btnSubmit').textContent = 'Actualizar Auto';
    document.getElementById('btnCancel').style.display = 'block';

    // Hacer scroll al formulario en mobile
    document.getElementById('formPanel').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Eliminar auto
 */
async function deleteCar(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este vehículo?")) return;

    const response = await fetch(`/api/cars/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
        }
    });

    // Si el token expiró, redirigir al login
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        window.location.replace('login.html');
        return;
    }

    const data = await response.json();

    if (!response.ok) {
        alert("❌ Error: " + data.message);
        return;
    }

    alert("✅ Vehículo eliminado correctamente");
    fetchInventory();
}

/**
 * Reset formulario
 */
function resetForm() {
    document.getElementById('carForm').reset();
    document.getElementById('formPanel').classList.remove('editing-mode');
    document.getElementById('btnSubmit').textContent = 'Guardar Auto';
    document.getElementById('btnCancel').style.display = 'none';
    editingCarId = null;
}

/**
 * Cerrar sesión
 */
function logout() {
    localStorage.removeItem('token');
    window.location.replace('login.html');
}
