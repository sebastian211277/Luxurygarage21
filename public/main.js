let inventory = [];
let heroCarousel = null;

// Cargar autos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    fetchCars();
    setupEventListeners();
});

/**
 * Obtener todos los autos de la API
 */
async function fetchCars() {
    try {
        const response = await fetch('/api/cars', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        inventory = await response.json();

        // Renderizar grid y carrusel
        renderGrid(inventory);
        setupHeroCarousel(inventory);

    } catch (error) {
        console.error("Error al cargar autos:", error);
        showErrorMessage("No se pudieron cargar los autos. Por favor, recarga la página.");
    }
}

/**
 * Configurar carrusel del hero
 */
function setupHeroCarousel(cars) {
    if (!cars || cars.length === 0) {
        const heroTitle = document.getElementById('heroTitle');
        if (heroTitle) {
            heroTitle.innerText = 'No hay vehículos disponibles';
        }
        return;
    }

    // Elegir autos destacados o los primeros
    const featuredCars = cars.filter(c => c.esDestacado);
    const carouselCars = featuredCars.length > 0 ? featuredCars : cars.slice(0, 3);

    if (carouselCars.length === 0) return;

    let index = 0;

    const showCar = () => {
        const car = carouselCars[index];
        updateHero(car);
        index = (index + 1) % carouselCars.length;
    };

    // Mostrar primer auto
    showCar();

    // Cambiar cada 5 segundos
    if (heroCarousel) clearInterval(heroCarousel);
    heroCarousel = setInterval(showCar, 5000);
}

/**
 * Actualizar contenido del hero
 */
function updateHero(car) {
    const heroTitle = document.getElementById('heroTitle');
    const heroPrice = document.getElementById('heroPrice');
    const heroBg = document.getElementById('heroBg');
    const heroSection = document.getElementById('heroSection');

    if (!heroTitle || !car) return;

    const img = (car.imagenes && car.imagenes.length > 0) ? car.imagenes[0] : '/uploads/default.jpg';

    // Cambiamos la imagen de fondo (sin el gradiente oscuro pesado, el cuadro ya da contraste)
    heroBg.style.backgroundImage = `url('${img}')`;
    
    // Actualizamos los textos
    heroTitle.innerText = `${car.marca} ${car.modelo}`;
    heroPrice.innerText = `$${car.precio.toLocaleString()} USD`;

    // Hacemos que toda la sección sea clickeable
    heroSection.onclick = () => {
        window.location.href = `details.html?id=${car._id}`;
    };
    heroSection.style.cursor = 'pointer';
}


/**
 * Renderizar grid de autos
 */
function renderGrid(cars) {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    cars.forEach(car => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        
        const img = (car.imagenes && car.imagenes.length > 0) ? car.imagenes[0] : '/uploads/default.jpg';

        card.innerHTML = `
            <div style="overflow:hidden;">
                <img src="${img}" class="car-image" alt="${car.modelo}">
            </div>
            <div class="car-info">
                <span class="badge">${car.marca}</span>
                <h2>${car.modelo}</h2>
                <p>${car.anio} — Exclusive Edition</p>
                <div class="price">
                    <span>$${car.precio.toLocaleString()} USD</span>
                </div>
            </div>
        `;

        card.onclick = () => {
            window.location.href = `details.html?id=${car._id}`;
        };
        
        grid.appendChild(card);
    });
}


/**
 * Filtrar autos por categoría
 */
window.filterCars = (category) => {
    let filtered = inventory;

    if (category && category !== '') {
        filtered = inventory.filter(car => car.categoria === category);
    }

    renderGrid(filtered);

    // Scroll suave a la sección
    const gridSection = document.getElementById('seccion-detalles');
    if (gridSection) {
        gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

/**
 * Filtrar autos por marca
 */
window.filterByMake = (make) => {
    // 1. Quitamos la clase 'active' de todos los logos
    document.querySelectorAll('.brand-item').forEach(item => item.classList.remove('active'));
    
    // 2. Añadimos 'active' al que se hizo click (opcional para feedback visual)
    event.currentTarget.classList.add('active');

    // 3. Filtramos el inventario global
    let filtered;
    if (make === 'all') {
        filtered = inventory;
        document.getElementById('gridTitle').innerText = "Inventario Completo";
    } else {
        filtered = inventory.filter(car => car.marca.toLowerCase() === make.toLowerCase());
        document.getElementById('gridTitle').innerText = `Colección ${make}`;
    }

    // 4. Renderizamos el grid con los autos filtrados
    renderGrid(filtered);

    // 5. Scroll suave hacia el inventario para que el usuario vea el resultado
    document.getElementById('seccion-detalles').scrollIntoView({ behavior: 'smooth' });
};


/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Botones de filtro por categoría
    const categoryButtons = document.querySelectorAll('[onclick*="filterCars"]');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });

    // Botones de filtro por marca
    const brandButtons = document.querySelectorAll('[onclick*="filterByMake"]');
    brandButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });
}

/**
 * Mostrar mensaje de error
 */
function showErrorMessage(message) {
    const grid = document.getElementById('grid');
    if (grid) {
        grid.innerHTML = `<p style="color:#e74c3c; text-align:center; width:100%; grid-column: 1/-1; padding: 40px;">
            ⚠️ ${message}
        </p>`;
    }
}

// Buscador en vivo
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = inventory.filter(car => 
        car.marca.toLowerCase().includes(term) || 
        car.modelo.toLowerCase().includes(term)
    );
    renderGrid(filtered);
});
