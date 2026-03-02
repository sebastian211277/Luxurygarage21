if (!localStorage.getItem('adminToken')) window.location.href = 'login.html';

// Estado global para evitar conflictos
let isLoading = false;
let editingCarId = null;

// Cargar inventario al iniciar
document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
    setupFormHandlers();
});

/**
 * Obtener y mostrar el inventario de autos
 */
async function fetchInventory() {
    const tableBody = document.getElementById('carsTableBody');
    
    try {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Cargando inventario...</td></tr>';
        
        const response = await fetch('/api/cars', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const cars = await response.json();
        tableBody.innerHTML = '';

        if (!cars || cars.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Inventario vacío. Agrega tu primer vehículo.</td></tr>';
            return;
        }

        // Generar filas de la tabla
        tableBody.innerHTML = cars.map(car => {
            const imagenMostrable = (car.imagenes && car.imagenes.length > 0)
                ? car.imagenes[0]
                : '/uploads/default.jpg';

            return `
            <tr data-car-id="${car._id}">
                <td>
                    <img src="${imagenMostrable}" 
                        width="60" 
                        style="border-radius:4px; height:40px; object-fit:cover; border: 1px solid #333;"
                        onerror="this.src='/uploads/default.jpg'">
                </td>
                <td>
                    <strong style="color: #fff;">${car.nombreAnuncio || 'Sin título'}</strong><br>
                    <small style="color: #888;">${car.marca} ${car.modelo}</small>
                </td>
                <td>${car.anio}</td>
                <td style="color: #d4af37;">$${car.precio ? car.precio.toLocaleString() : '0'}</td>
                <td style="text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
                    <button onclick="editCar('${car._id}')" 
                        style="background:#4a90e2; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                        EDITAR
                    </button>
                    <button onclick="deleteCar('${car._id}')" 
                        style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                        ELIMINAR
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error("Error al cargar inventario:", err);
        tableBody.innerHTML = `<tr><td colspan="5" style="color:#e74c3c; text-align:center; padding:20px;">
            ⚠️ Error de conexión: ${err.message}
        </td></tr>`;
    }
}

/**
 * Configurar manejadores del formulario
 */
function setupFormHandlers() {
    const form = document.getElementById('carForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnCancel = document.getElementById('btnCancel');

    form.addEventListener('submit', handleFormSubmit);
    btnCancel.addEventListener('click', resetForm);
}

/**
 * Manejar envío del formulario (Guardar o Editar)
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    if (isLoading) {
        console.warn('⏳ Una operación ya está en progreso');
        return;
    }

    const btn = document.getElementById('btnSubmit');
    const form = e.target;

    try {
        isLoading = true;
        btn.innerText = editingCarId ? "Actualizando..." : "Guardando...";
        btn.disabled = true;

        // Crear FormData para enviar archivos
        const formData = new FormData(form);

        // Determinar si es crear o editar
        const method = editingCarId ? 'PUT' : 'POST';
        const url = editingCarId ? `/api/cars/${editingCarId}` : '/api/cars';

        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error desconocido');
        }

        // Éxito
        showNotification(
            editingCarId ? '✏️ Auto actualizado correctamente' : '✅ Auto guardado correctamente',
            'success'
        );

        form.reset();
        resetForm();
        await fetchInventory(); // Recargar tabla

    } catch (error) {
        console.error('Error:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        isLoading = false;
        btn.innerText = editingCarId ? "Actualizar Auto" : "Guardar Auto";
        btn.disabled = false;
    }
}

/**
 * Cargar datos de un auto para editar
 */
async function editCar(id) {
    try {
        const response = await fetch(`/api/cars/${id}`);
        if (!response.ok) throw new Error('Auto no encontrado');

        const car = await response.json();

        // Llenar el formulario con los datos del auto
        document.getElementById('name').value = car.nombreAnuncio || '';
        document.getElementById('brand').value = car.marca || '';
        document.getElementById('model').value = car.modelo || '';
        document.getElementById('year').value = car.anio || '';
        document.getElementById('price').value = car.precio || '';
        document.getElementById('type').value = car.categoria || '';
        document.getElementById('description').value = car.descripcion || '';
        document.getElementById('isFeatured').checked = car.esDestacado || false;

        // Actualizar estado de edición
        editingCarId = id;
        document.getElementById('btnSubmit').innerText = 'Actualizar Auto';
        document.getElementById('btnCancel').style.display = 'inline-block';

        // Scroll al formulario
        document.querySelector('.panel').scrollIntoView({ behavior: 'smooth' });

        showNotification('📝 Modo edición activado. Modifica los datos y guarda.', 'info');

    } catch (error) {
        console.error('Error al cargar auto:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

/**
 * Eliminar un auto
 */
window.deleteCar = async function(id) {
    if (!confirm('⚠️ ¿Estás seguro de que deseas eliminar este vehículo permanentemente? Se eliminarán también sus imágenes.')) {
        return;
    }

    if (isLoading) {
        console.warn('⏳ Una operación ya está en progreso');
        return;
    }

    try {
        isLoading = true;

        const response = await fetch(`/api/cars/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al eliminar');
        }

        showNotification('🗑️ Auto eliminado correctamente', 'success');
        await fetchInventory(); // Recargar tabla

    } catch (error) {
        console.error('Error al eliminar:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        isLoading = false;
    }
};

/**
 * Resetear el formulario a estado inicial
 */
function resetForm() {
    const form = document.getElementById('carForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnCancel = document.getElementById('btnCancel');

    form.reset();
    editingCarId = null;
    btnSubmit.innerText = 'Guardar Auto';
    btnCancel.style.display = 'none';

    showNotification('🔄 Formulario reiniciado', 'info');
}

/**
 * Mostrar notificaciones al usuario
 */
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerText = message;

    document.body.appendChild(notification);

    // Eliminar después de 4 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Agregar estilos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);