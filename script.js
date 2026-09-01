// ============================================================
//  CONFIGURACIÓN - DIRECTO A GOOGLE APPS SCRIPT
// ============================================================

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyS3oVkA5xKB1iuwuEyKrfCvNHtHnLlERQxAjgo_h0unxsB8ofyF7ctzQwHp1iZgYom/exec';


const LISTA_FALLBACK = [
    { id: 1, nombre: 'papaya', precio: 5 },
    { id: 2, nombre: 'piña', precio: 5 },
    { id: 3, nombre: 'mango', precio: 7 },
    { id: 4, nombre: 'fresa con leche', precio: 7 },
    { id: 5, nombre: 'naranja', precio: 2 },
    { id: 6, nombre: 'platano', precio: 3 },
    { id: 7, nombre: 'surtido', precio: 4 },
    { id: 8, nombre: 'especial', precio: 10 }
];

// ============================================================
//  ESTADO
// ============================================================

let jugoSeleccionado = null;
let presentacionActual = 'Vaso';
let productosJugos = [];
let ventasDelDia = [];

// ============================================================
//  DOM REFERENCIAS
// ============================================================

const $ = id => document.getElementById(id);
const jugosContainer = $('jugos-container');
const cantidadJugos = $('cantidad-jugos');
const btnRegistrarJugo = $('btn-registrar-jugo');
const mensajeJugos = $('mensaje-jugos');

const nombreOtro = $('nombre-otro');
const precioOtro = $('precio-otro');
const cantidadOtro = $('cantidad-otro');
const btnRegistrarOtro = $('btn-registrar-otro');
const mensajeOtros = $('mensaje-otros');

const totalDiaSpan = $('total-dia');
const unidadesDiaSpan = $('unidades-dia');
const listaVentasDia = $('lista-ventas-dia');
const btnActualizarDia = $('btn-actualizar-dia');

const mesResumen = $('mes-resumen');
const btnCargarResumen = $('btn-cargar-resumen');
const contenidoResumen = $('contenido-resumen');

const navBtns = document.querySelectorAll('.nav-btn');
const secciones = {
    jugos: $('seccion-jugos'),
    otros: $('seccion-otros'),
    ventas: $('seccion-ventas'),
    resumen: $('seccion-resumen')
};

// ============================================================
//  INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await cargarProductos();
    mostrarSeccion('seccion-jugos');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const seccionId = btn.dataset.seccion;
            mostrarSeccion(seccionId);
            navBtns.forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
        });
    });

    document.querySelectorAll('.btn-presentacion').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-presentacion').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            presentacionActual = btn.dataset.presentacion;
        });
    });

    btnRegistrarJugo.addEventListener('click', registrarVentaJugo);
    btnRegistrarOtro.addEventListener('click', registrarVentaOtro);
    btnActualizarDia.addEventListener('click', cargarVentasDia);
    btnCargarResumen.addEventListener('click', cargarResumenMensual);

    await cargarVentasDia();
});

// ============================================================
//  FUNCIONES PRINCIPALES
// ============================================================

function mostrarSeccion(id) {
    Object.values(secciones).forEach(sec => {
        if (sec) sec.classList.remove('activo');
    });
    const sec = $(id);
    if (sec) sec.classList.add('activo');
}

// --- Cargar productos desde Apps Script ---
async function cargarProductos() {
    try {
        const url = `${SCRIPT_URL}?action=getProductos&ts=${Date.now()}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        if (data && data.status === 'success' && Array.isArray(data.productos) && data.productos.length > 0) {
            productosJugos = data.productos;
        } else {
            productosJugos = [...LISTA_FALLBACK];
            mostrarMensaje(mensajeJugos, '📋 Usando lista actual local.', 'error');
        }
    } catch (error) {
        productosJugos = [...LISTA_FALLBACK];
        mostrarMensaje(mensajeJugos, '📋 No se pudo conectar a Google. Usando lista local.', 'error');
    }
    renderizarJugos(productosJugos);
}

// --- Renderizar jugos ---
function renderizarJugos(productos) {
    if (!jugosContainer) return;
    jugosContainer.innerHTML = '';

    productos.forEach(p => {
        const div = document.createElement('div');
        div.className = 'producto-item';
        div.dataset.id = p.id;
        div.dataset.precio = p.precio;
        div.innerHTML = `
            <span>${p.nombre}</span>
            <span class="precio">S/ ${Number(p.precio).toFixed(2)}</span>
        `;

        div.addEventListener('click', () => {
            document.querySelectorAll('.producto-item').forEach(el => el.classList.remove('seleccionado'));
            div.classList.add('seleccionado');
            jugoSeleccionado = Number(p.id);
        });

        jugosContainer.appendChild(div);
    });
}

// --- Registrar venta de jugo ---
async function registrarVentaJugo() {
    if (jugoSeleccionado === null) {
        mostrarMensaje(mensajeJugos, '⚠️ Selecciona un jugo de la lista.', 'error');
        return;
    }

    const cantidad = parseInt(cantidadJugos.value) || 0;
    if (cantidad < 1) {
        mostrarMensaje(mensajeJugos, '⚠️ La cantidad debe ser al menos 1.', 'error');
        return;
    }

    const producto = productosJugos.find(p => Number(p.id) === Number(jugoSeleccionado));
    if (!producto) {
        mostrarMensaje(mensajeJugos, '❌ Producto no encontrado.', 'error');
        return;
    }

    const total = Number(producto.precio) * cantidad;
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-PE');
    const hora = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const datos = {
        fecha,
        hora,
        categoria: 'Jugo',
        producto: producto.nombre,
        presentacion: presentacionActual,
        cantidad,
        precio: Number(producto.precio),
        total
    };

    await enviarVenta(datos, mensajeJugos);
}

// --- Registrar venta de otro producto ---
async function registrarVentaOtro() {
    const nombre = nombreOtro.value.trim();
    if (!nombre) {
        mostrarMensaje(mensajeOtros, '⚠️ Ingresa el nombre del producto.', 'error');
        return;
    }

    const precio = parseFloat(precioOtro.value);
    if (isNaN(precio) || precio < 0) {
        mostrarMensaje(mensajeOtros, '⚠️ Ingresa un precio válido.', 'error');
        return;
    }

    const cantidad = parseInt(cantidadOtro.value) || 0;
    if (cantidad < 1) {
        mostrarMensaje(mensajeOtros, '⚠️ La cantidad debe ser al menos 1.', 'error');
        return;
    }

    const total = precio * cantidad;
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-PE');
    const hora = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const datos = {
        fecha,
        hora,
        categoria: 'Otro',
        producto: nombre,
        presentacion: 'N/A',
        cantidad,
        precio,
        total
    };

    await enviarVenta(datos, mensajeOtros);

    nombreOtro.value = '';
    precioOtro.value = '';
    cantidadOtro.value = '1';
}

// --- Enviar venta ---
async function enviarVenta(datos, elementoMensaje) {
    const btn = elementoMensaje.closest('section').querySelector('.btn-primario');
    btn.disabled = true;
    btn.textContent = '⏳ Enviando...';

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'guardarVenta',
                data: datos
            })
        });

        mostrarMensaje(elementoMensaje, '✅ Venta registrada correctamente.', 'exito');
        
        setTimeout(async () => {
            await cargarVentasDia();
        }, 1500);

        document.querySelectorAll('.producto-item').forEach(el => el.classList.remove('seleccionado'));
        jugoSeleccionado = null;
        cantidadJugos.value = '1';

    } catch (error) {
        mostrarMensaje(elementoMensaje, `❌ Error: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '📥 REGISTRAR VENTA';
    }
}

// --- Cargar ventas del día ---
async function cargarVentasDia() {
    try {
        const hoy = new Date().toLocaleDateString('es-PE');
        const url = `${SCRIPT_URL}?action=getVentasDia&fecha=${encodeURIComponent(hoy)}&ts=${Date.now()}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        if (data.status === 'success' && Array.isArray(data.ventas)) {
            ventasDelDia = data.ventas;
            mostrarVentasDia(ventasDelDia);
        } else {
            ventasDelDia = [];
            mostrarVentasDia([]);
        }
    } catch (error) {
        if (listaVentasDia) {
            listaVentasDia.innerHTML = '<p class="placeholder">Error al cargar las ventas.</p>';
        }
    }
}

// --- Mostrar ventas del día ---
function mostrarVentasDia(ventas) {
    if (!listaVentasDia) return;

    const total = ventas.reduce((sum, v) => sum + Number(v.total || 0), 0);
    const unidades = ventas.reduce((sum, v) => sum + Number(v.cantidad || 0), 0);

    if (totalDiaSpan) totalDiaSpan.textContent = `S/ ${total.toFixed(2)}`;
    if (unidadesDiaSpan) unidadesDiaSpan.textContent = unidades;

    if (ventas.length === 0) {
        listaVentasDia.innerHTML = '<p class="placeholder">No hay ventas registradas hoy.</p>';
        return;
    }

    let html = '';
    ventas.slice().reverse().forEach(v => {
        html += `
            <div class="venta-item">
                <div class="detalle">
                    <span><strong>${v.producto}</strong> ${v.cantidad} x S/ ${Number(v.precio || 0).toFixed(2)}</span>
                    <span>S/ ${Number(v.total || 0).toFixed(2)}</span>
                </div>
                <div class="detalle" style="font-size:0.75rem; color:#7a6e5c;">
                    <span>${v.presentacion || 'N/A'} · ${v.hora}</span>
                    <span>${v.categoria}</span>
                </div>
            </div>
        `;
    });

    listaVentasDia.innerHTML = html;
}

// --- Cargar resumen mensual ---
async function cargarResumenMensual() {
    const mesVal = mesResumen.value;
    if (!mesVal) {
        contenidoResumen.innerHTML = '<p class="placeholder">Selecciona un mes.</p>';
        return;
    }

    const [año, mes] = mesVal.split('-');
    const nombreMes = new Date(año, mes - 1).toLocaleString('es-PE', { month: 'long' });

    try {
        const url = `${SCRIPT_URL}?action=getResumenMensual&mes=${mes}&año=${año}&ts=${Date.now()}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        if (data.status === 'success' && data.resumen) {
            mostrarResumen(data.resumen, nombreMes, año);
        } else {
            contenidoResumen.innerHTML = '<p class="placeholder">No hay datos para este mes.</p>';
        }
    } catch (error) {
        contenidoResumen.innerHTML = '<p class="placeholder">Error al cargar resumen.</p>';
    }
}

// --- Mostrar resumen ---
function mostrarResumen(resumen, nombreMes, año) {
    if (!contenidoResumen) return;

    const { totalVentas, totalUnidades, rankingJugos, presentaciones, otrosProductos } = resumen;

    let html = `
        <div class="resumen-tarjeta">
            <div style="text-align:center; font-size:1.2rem; font-weight:600; color:#3d5a4b;">
                ${nombreMes} ${año}
            </div>
            <div class="total-grande">S/ ${Number(totalVentas || 0).toFixed(2)}</div>
            <div class="fila"><span>Unidades vendidas</span><span>${totalUnidades || 0}</span></div>
    `;

    if (rankingJugos && rankingJugos.length > 0) {
        html += `<div style="margin-top:0.8rem; font-weight:600;">🏆 Jugos más vendidos</div>`;
        rankingJugos.forEach((item, idx) => {
            const medalla = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
            html += `<div class="fila"><span>${medalla} ${item.nombre}</span><span>${item.cantidad} und.</span></div>`;
        });
    }

    if (presentaciones && (presentaciones.Vaso || presentaciones.Llevar)) {
        html += `<div style="margin-top:0.8rem; font-weight:600;">🥤 Presentación</div>`;
        html += `<div class="fila"><span>Vaso</span><span>${presentaciones.Vaso || 0}</span></div>`;
        html += `<div class="fila"><span>Para llevar</span><span>${presentaciones.Llevar || 0}</span></div>`;
    }

    if     (otrosProductos && otrosProductos.length > 0) {
        html += `<div style="margin-top:0.8rem; font-weight:600;">🛍️ Otros productos</div>`;
        otrosProductos.forEach(item => {
            html += `<div class="fila"><span>${item.nombre}</span><span>${item.cantidad} und.</span></div>`;
        });
    }

    html += `</div>`;
    contenidoResumen.innerHTML = html;
}

// --- Mostrar mensaje temporal ---
function mostrarMensaje(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.className = `mensaje ${tipo}`;
    setTimeout(() => {
        el.textContent = '';
        el.className = 'mensaje';
    }, 5000);
}
